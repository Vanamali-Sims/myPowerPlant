/**
 * Reader for the battery template layout, used for every source for now.
 *
 * Columns: interval_start, interval_minutes, battery_discharge_kwh, and an
 * optional battery_charge_kwh. Nothing is guessed or corrected: a row that
 * cannot be used is reported and its day is left out.
 */
import { INTERVAL_MINUTES_ALLOWED, type BatterySourceId } from '../../../constants/batterySources'
import type { RowProblemCode } from '../../../constants/goalMessages'
import {
  expectedIntervals,
  melbourneDate,
  melbourneDayStart,
  parseIntervalStart,
  wallTimeInstants,
} from '../melbourneTime'
import { parseCsv } from '../csv'
import type {
  BatteryAdapter,
  DayReading,
  IncompleteDay,
  ReadLimits,
  ReadResult,
  RowProblem,
} from './types'

const MAX_LISTED_PROBLEMS = 500
const MS_PER_MINUTE = 60_000

const COLUMNS = {
  start: 'interval_start',
  minutes: 'interval_minutes',
  discharge: 'battery_discharge_kwh',
  charge: 'battery_charge_kwh',
} as const

const REQUIRED = [COLUMNS.start, COLUMNS.minutes, COLUMNS.discharge]

type GoodRow = {
  line: number
  instant: number
  intervalMinutes: number
  discharge: number
  charge: number | null
}

type Cell = { value: number } | { problem: RowProblemCode }

/**
 * readEnergy
 * @param raw - A kWh cell
 * @param delimiter - The file's separator; ";" files may use a decimal comma
 * @param limits - Largest allowed interval value
 */
function readEnergy(raw: string, delimiter: ',' | ';', limits: ReadLimits): Cell {
  const text = raw.trim()
  if (!text) return { problem: 'missing_value' }
  const normalised = delimiter === ';' && /^-?\d+,\d+$/.test(text) ? text.replace(',', '.') : text
  if (!/^-?\d+(\.\d+)?$/.test(normalised)) return { problem: 'not_a_number' }
  const value = Number(normalised)
  if (value < 0) return { problem: 'negative_value' }
  if (value > limits.maxIntervalKwh) return { problem: 'too_large' }
  return { value }
}

function readInterval(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null
  const minutes = Number(raw)
  return (INTERVAL_MINUTES_ALLOWED as readonly number[]).includes(minutes) ? minutes : null
}

/**
 * readGenericCsv
 * @param text - File contents
 * @param limits - Validity limits for energy values
 * @param sourceId - The source Matt chose, recorded on the result
 * @returns Complete days in Melbourne time, plus what was left out and why
 *
 * A day counts only when every interval it should have is present exactly
 * once and every row in it is valid. Partial days are reported so a later
 * file can complete them.
 */
export const readGenericCsv: BatteryAdapter = (
  text: string,
  limits: ReadLimits,
  sourceId: BatterySourceId,
): ReadResult => {
  const parsed = parseCsv(text)
  if (!parsed.ok) return { ok: false, reason: 'malformed_csv' }
  const [header, ...rows] = parsed.rows
  if (!header) return { ok: false, reason: 'empty_file' }

  const names = header.cells.map((cell) => cell.trim().toLowerCase())
  const missing = REQUIRED.filter((name) => !names.includes(name))
  if (missing.length) return { ok: false, reason: 'missing_columns', missingColumns: missing }
  if (!rows.length) return { ok: false, reason: 'no_rows' }

  const index = {
    start: names.indexOf(COLUMNS.start),
    minutes: names.indexOf(COLUMNS.minutes),
    discharge: names.indexOf(COLUMNS.discharge),
    charge: names.indexOf(COLUMNS.charge),
  }
  const hasIntakeColumn = index.charge >= 0
  const widest = Math.max(...Object.values(index))

  const problems: RowProblem[] = []
  const problemDays = new Set<string>()
  const good: GoodRow[] = []
  const wallSeen = new Map<string, number>()

  function report(line: number, date: string | null, code: RowProblemCode) {
    problems.push({ line, date, code })
    if (date) problemDays.add(date)
  }

  for (const row of rows) {
    if (row.cells.length <= widest) {
      report(row.line, null, 'malformed_row')
      continue
    }
    const time = parseIntervalStart(row.cells[index.start])
    if (!time) {
      report(row.line, null, 'bad_time')
      continue
    }
    let instant: number
    if (time.kind === 'instant') {
      instant = time.instant
    } else {
      const options = wallTimeInstants(time.date, time.hour, time.minute)
      if (!options.length) {
        report(row.line, time.date, 'time_not_exist')
        continue
      }
      // A repeated local hour is read in file order: first AEDT, then AEST.
      const key = `${time.date} ${time.hour}:${time.minute}`
      const seen = wallSeen.get(key) ?? 0
      wallSeen.set(key, seen + 1)
      if (seen >= options.length) {
        report(row.line, time.date, 'duplicate_time')
        continue
      }
      instant = options[seen]
    }
    const date = melbourneDate(instant)
    const intervalMinutes = readInterval(row.cells[index.minutes])
    if (intervalMinutes === null) {
      report(row.line, date, 'bad_interval')
      continue
    }
    const discharge = readEnergy(row.cells[index.discharge], parsed.delimiter, limits)
    if ('problem' in discharge) {
      report(row.line, date, discharge.problem)
      continue
    }
    let charge: number | null = null
    if (hasIntakeColumn) {
      const cell = readEnergy(row.cells[index.charge], parsed.delimiter, limits)
      if ('problem' in cell) {
        report(row.line, date, cell.problem)
        continue
      }
      charge = cell.value
    }
    good.push({ line: row.line, instant, intervalMinutes, discharge: discharge.value, charge })
  }

  const intervalSet = new Set(good.map((row) => row.intervalMinutes))
  if (intervalSet.size > 1) return { ok: false, reason: 'mixed_intervals' }
  const intervalMinutes = good.length ? good[0].intervalMinutes : null

  const byDay = new Map<string, Map<number, GoodRow>>()
  for (const row of good) {
    const date = melbourneDate(row.instant)
    const offset = (row.instant - melbourneDayStart(date)) / MS_PER_MINUTE
    if (offset % row.intervalMinutes !== 0) {
      report(row.line, date, 'misaligned_time')
      continue
    }
    const day = byDay.get(date) ?? new Map<number, GoodRow>()
    if (day.has(row.instant)) {
      report(row.line, date, 'duplicate_time')
      continue
    }
    day.set(row.instant, row)
    byDay.set(date, day)
  }

  const days: DayReading[] = []
  const incompleteDays: IncompleteDay[] = []
  for (const [date, intervals] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (problemDays.has(date) || intervalMinutes === null) continue
    const expected = expectedIntervals(date, intervalMinutes)
    if (intervals.size !== expected) {
      incompleteDays.push({ date, found: intervals.size, expected })
      continue
    }
    let dischargeKwh = 0
    let intakeKwh = 0
    for (const row of intervals.values()) {
      dischargeKwh += row.discharge
      intakeKwh += row.charge ?? 0
    }
    days.push({
      date,
      intervals: intervals.size,
      dischargeKwh,
      intakeKwh: hasIntakeColumn ? intakeKwh : null,
    })
  }

  problems.sort((a, b) => a.line - b.line)
  const details = {
    sourceId,
    intervalMinutes,
    hasIntakeColumn,
    incompleteDays,
    problemDays: [...problemDays].sort(),
    rowProblems: problems.slice(0, MAX_LISTED_PROBLEMS),
    rowProblemCount: problems.length,
  }
  if (!days.length) return { ok: false, reason: 'no_complete_days', ...details }
  return { ok: true, days, ...details }
}
