/**
 * Unit tests for reading battery files on the device (US8.2 AC3 to AC5).
 *
 * Files are generated from real Melbourne instants so the daylight saving
 * days (23 and 25 hours) are exercised exactly as an export would have them.
 */
import { describe, expect, it } from 'vitest'

import { BATTERY_SOURCES, MAX_FILE_BYTES } from '../../constants/batterySources'
import { REASON_MESSAGES, ROW_PROBLEM_MESSAGES } from '../../constants/goalMessages'
import { BASELINE_PROFILE } from '../../data/baselines'
import { emptyProfile } from '../../types/profile'
import { seedMethodologyBundle } from '../methodologyFixture'
import { BATTERY_ADAPTERS, getAdapter } from './adapters'
import { readGenericCsv } from './adapters/generic'
import { batteryFromProfile, maxIntervalKwh } from './batteryLimits'
import { addDays } from './calendar'
import { parseCsv } from './csv'
import {
  expectedIntervals,
  melbourneDate,
  melbourneDayStart,
  melbourneWallTime,
  parseIntervalStart,
  wallTimeInstants,
} from './melbourneTime'
import { checkFile, readBatteryFile } from './readBatteryFile'
import { buildTemplateCsv } from './template'

const LIMITS = { maxIntervalKwh: 13.5 }
const HEADER = 'interval_start,interval_minutes,battery_discharge_kwh,battery_charge_kwh'

type BuildOptions = {
  from: string
  to: string
  interval?: number
  discharge?: number
  charge?: number | null
  header?: string
  separator?: ',' | ';'
}

/** Rows for every interval from the start of `from` to the end of `to`, in Melbourne wall time. */
function buildRows({ from, to, interval = 15, discharge = 0.1, charge = 0.05, separator = ',' }: BuildOptions) {
  const rows: string[] = []
  const end = melbourneDayStart(addDays(to, 1))
  for (let instant = melbourneDayStart(from); instant < end; instant += interval * 60_000) {
    const cells = [melbourneWallTime(instant), String(interval), String(discharge)]
    if (charge !== null) cells.push(String(charge))
    rows.push(cells.join(separator))
  }
  return rows
}

function buildCsv(options: BuildOptions): string {
  const header =
    options.header ??
    (options.charge === null ? HEADER.replace(',battery_charge_kwh', '') : HEADER)
  const sep = options.separator ?? ','
  return [header.replaceAll(',', sep), ...buildRows(options)].join('\n')
}

function fileOf(text: string, name = 'battery.csv'): File {
  return new File([text], name, { type: 'text/csv' })
}

describe('Melbourne time', () => {
  it('has 92, 96, and 100 fifteen-minute intervals on the change days and a normal day', () => {
    expect(expectedIntervals('2026-10-04', 15)).toBe(92)
    expect(expectedIntervals('2026-04-05', 15)).toBe(100)
    expect(expectedIntervals('2026-09-01', 15)).toBe(96)
    expect(expectedIntervals('2026-09-01', 60)).toBe(24)
    expect(expectedIntervals('2026-10-04', 5)).toBe(276)
  })

  it('finds no instant in the skipped hour and two in the repeated hour, AEDT first', () => {
    expect(wallTimeInstants('2026-10-04', 2, 30)).toEqual([])
    const repeated = wallTimeInstants('2026-04-05', 2, 30)
    expect(repeated).toHaveLength(2)
    expect(repeated[1] - repeated[0]).toBe(3_600_000)
    expect(new Date(repeated[0]).toISOString()).toBe('2026-04-04T15:30:00.000Z')
  })

  it('reads ISO, offset, and Australian day-first times', () => {
    expect(parseIntervalStart('2026-09-01 00:15')).toEqual({ kind: 'wall', date: '2026-09-01', hour: 0, minute: 15 })
    expect(parseIntervalStart('1/09/2026 0:15')).toEqual({ kind: 'wall', date: '2026-09-01', hour: 0, minute: 15 })
    const exact = parseIntervalStart('2026-09-01T00:15:00+10:00')
    expect(exact?.kind).toBe('instant')
    if (exact?.kind === 'instant') expect(melbourneDate(exact.instant)).toBe('2026-09-01')
    expect(parseIntervalStart('2026-02-30 00:00')).toBeNull()
    expect(parseIntervalStart('2026-09-01 00:15:30')).toBeNull()
    expect(parseIntervalStart('yesterday')).toBeNull()
  })
})

describe('parseCsv', () => {
  it('handles a byte order mark, quotes, doubled quotes, and CRLF', () => {
    const result = parseCsv('\uFEFFa,b\r\n"x, y","say ""hi"""\r\n')
    expect(result).toEqual({
      ok: true,
      delimiter: ',',
      rows: [
        { line: 1, cells: ['a', 'b'] },
        { line: 2, cells: ['x, y', 'say "hi"'] },
      ],
    })
  })

  it('detects semicolons and keeps line breaks inside quotes', () => {
    const result = parseCsv('a;b\n"one\ntwo";3\n4;5')
    expect(result.ok && result.delimiter).toBe(';')
    expect(result.ok && result.rows.map((row) => row.line)).toEqual([1, 2, 4])
    expect(result.ok && result.rows[1].cells[0]).toBe('one\ntwo')
  })

  it('drops blank rows and fails on an unclosed quote', () => {
    expect(parseCsv('a\n\n\nb').ok && (parseCsv('a\n\n\nb') as { rows: unknown[] }).rows).toHaveLength(2)
    expect(parseCsv('a,"b\n1,2')).toEqual({ ok: false })
  })
})

describe('readGenericCsv', () => {
  it('turns a month into complete days with discharge and intake totals', () => {
    const result = readGenericCsv(buildCsv({ from: '2026-09-01', to: '2026-09-30' }), LIMITS, 'tesla')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.days).toHaveLength(30)
    expect(result.days[0]).toMatchObject({ date: '2026-09-01', intervals: 96 })
    expect(result.days[0].dischargeKwh).toBeCloseTo(9.6, 10)
    expect(result.days[0].intakeKwh).toBeCloseTo(4.8, 10)
    expect(result.intervalMinutes).toBe(15)
    expect(result.incompleteDays).toEqual([])
    expect(result.rowProblemCount).toBe(0)
  })

  it('counts both daylight saving days as complete with 92 and 100 intervals', () => {
    const spring = readGenericCsv(buildCsv({ from: '2026-10-03', to: '2026-10-05' }), LIMITS, 'tesla')
    const autumn = readGenericCsv(buildCsv({ from: '2026-04-04', to: '2026-04-06' }), LIMITS, 'tesla')
    expect(spring.ok && spring.days.map((day) => day.intervals)).toEqual([96, 92, 96])
    expect(autumn.ok && autumn.days.map((day) => day.intervals)).toEqual([96, 100, 96])
  })

  it('reads the repeated hour by file order and a third copy as a duplicate', () => {
    const lines = buildCsv({ from: '2026-04-05', to: '2026-04-05' }).split('\n')
    const extra = lines.find((line) => line.startsWith('2026-04-05 02:15')) ?? ''
    const result = readGenericCsv([...lines, extra].join('\n'), LIMITS, 'tesla')
    expect(result.ok).toBe(false)
    expect(result.rowProblems?.[0].code).toBe('duplicate_time')
    expect(result.problemDays).toEqual(['2026-04-05'])
  })

  it('rejects a time in the skipped hour', () => {
    const csv = `${HEADER}\n2026-10-04 02:30,15,0.1,0.1`
    const result = readGenericCsv(csv, LIMITS, 'tesla')
    expect(result.rowProblems?.[0]).toEqual({ line: 2, date: '2026-10-04', code: 'time_not_exist' })
  })

  it('leaves a partial final day out so a later file can complete it', () => {
    const lines = buildCsv({ from: '2026-09-01', to: '2026-09-02' }).split('\n')
    const result = readGenericCsv(lines.slice(0, lines.length - 10).join('\n'), LIMITS, 'tesla')
    expect(result.ok && result.days.map((day) => day.date)).toEqual(['2026-09-01'])
    expect(result.incompleteDays).toEqual([{ date: '2026-09-02', found: 86, expected: 96 }])
  })

  it('keeps a missing intake column as null and a column of zeros as zero', () => {
    const missing = readGenericCsv(buildCsv({ from: '2026-09-01', to: '2026-09-01', charge: null }), LIMITS, 'tesla')
    const zeros = readGenericCsv(buildCsv({ from: '2026-09-01', to: '2026-09-01', charge: 0 }), LIMITS, 'tesla')
    expect(missing.ok && missing.hasIntakeColumn).toBe(false)
    expect(missing.ok && missing.days[0].intakeKwh).toBeNull()
    expect(zeros.ok && zeros.days[0].intakeKwh).toBe(0)
  })

  it('names missing required columns', () => {
    const result = readGenericCsv('interval_start,battery_charge_kwh\n2026-09-01 00:00,1', LIMITS, 'tesla')
    expect(result).toEqual({
      ok: false,
      reason: 'missing_columns',
      missingColumns: ['interval_minutes', 'battery_discharge_kwh'],
    })
  })

  it('matches column names regardless of case and extra spaces, and ignores extra columns', () => {
    const header = ' Interval_Start , INTERVAL_MINUTES,battery_discharge_kwh,battery_charge_kwh'
    const csv = buildCsv({ from: '2026-09-01', to: '2026-09-01', header })
    expect(readGenericCsv(csv, LIMITS, 'tesla').ok).toBe(true)
  })

  it('reads semicolon files with decimal commas', () => {
    const csv = buildCsv({ from: '2026-09-01', to: '2026-09-01', separator: ';' }).replaceAll('0.1', '0,1').replaceAll('0.05', '0,05')
    const result = readGenericCsv(csv, LIMITS, 'tesla')
    expect(result.ok && result.days[0].dischargeKwh).toBeCloseTo(9.6, 10)
  })

  it.each([
    ['-0.1', 'negative_value'],
    ['abc', 'not_a_number'],
    ['', 'missing_value'],
    ['99', 'too_large'],
  ])('reports %j as %s and leaves its whole day out without guessing', (value, code) => {
    const lines = buildCsv({ from: '2026-09-01', to: '2026-09-02' }).split('\n')
    lines[5] = lines[5].replace(',0.1,', `,${value},`)
    const result = readGenericCsv(lines.join('\n'), LIMITS, 'tesla')
    expect(result.rowProblems).toEqual([{ line: 6, date: '2026-09-01', code }])
    expect(result.problemDays).toEqual(['2026-09-01'])
    expect(result.ok && result.days.map((day) => day.date)).toEqual(['2026-09-02'])
  })

  it('rejects unknown and mixed interval lengths', () => {
    expect(readGenericCsv(`${HEADER}\n2026-09-01 00:00,7,0.1,0.1`, LIMITS, 'tesla').rowProblems?.[0].code).toBe('bad_interval')
    const mixed = `${HEADER}\n2026-09-01 00:00,15,0.1,0.1\n2026-09-01 00:30,30,0.1,0.1`
    expect(readGenericCsv(mixed, LIMITS, 'tesla')).toEqual({ ok: false, reason: 'mixed_intervals' })
  })

  it('reports rows off an interval boundary and short rows', () => {
    const result = readGenericCsv(`${HEADER}\n2026-09-01 00:07,15,0.1,0.1\n2026-09-01 00:15,15`, LIMITS, 'tesla')
    expect(result.rowProblems?.map((problem) => problem.code)).toEqual(['misaligned_time', 'malformed_row'])
  })

  it('gives no_complete_days with the details when nothing can be counted', () => {
    const result = readGenericCsv(`${HEADER}\n2026-09-01 00:00,15,0.1,0.1`, LIMITS, 'tesla')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('no_complete_days')
    expect(result.incompleteDays).toEqual([{ date: '2026-09-01', found: 1, expected: 96 }])
  })

  it('reads a year of 15-minute rows quickly enough to stay on the main thread', () => {
    const csv = buildCsv({ from: '2025-10-01', to: '2026-09-30' })
    const started = performance.now()
    const result = readGenericCsv(csv, LIMITS, 'tesla')
    const elapsed = performance.now() - started
    expect(result.ok && result.days).toHaveLength(365)
    // A month is a twelfth of this. Generous ceiling so a slow CI runner does not flake.
    expect(elapsed).toBeLessThan(2000)
  })
})

describe('readBatteryFile', () => {
  it('reads a chosen file with the File API', async () => {
    const result = await readBatteryFile(fileOf(buildCsv({ from: '2026-09-01', to: '2026-09-02' })), 'tesla', LIMITS)
    expect(result.ok && result.days).toHaveLength(2)
  })

  it.each([
    [{ name: 'battery.xlsx', size: 10 }, 'not_csv'],
    [{ name: 'battery.csv', size: 0 }, 'empty_file'],
    [{ name: 'battery.csv', size: MAX_FILE_BYTES + 1 }, 'file_too_large'],
  ])('rejects %o before reading it', (file, reason) => {
    expect(checkFile(file)).toEqual({ ok: false, reason })
  })

  it('treats binary content and a blank file as unreadable or empty', async () => {
    expect(await readBatteryFile(fileOf('a\u0000b'), 'tesla', LIMITS)).toEqual({ ok: false, reason: 'unreadable' })
    expect(await readBatteryFile(fileOf('\uFEFF  \n'), 'tesla', LIMITS)).toEqual({ ok: false, reason: 'empty_file' })
  })

  it('records the provider Matt chose on the result', async () => {
    const csv = buildCsv({ from: '2026-09-01', to: '2026-09-01' })
    const amber = await readBatteryFile(fileOf(csv), 'amber', LIMITS)
    expect(amber.ok && amber.sourceId).toBe('amber')
  })
})

describe('sources, limits, and messages', () => {
  it('offers Tesla and Amber, each with a reader', () => {
    expect(BATTERY_SOURCES.map((source) => source.label)).toEqual(['Tesla', 'Amber'])
    for (const source of BATTERY_SOURCES) expect(getAdapter(source.id)).toBe(readGenericCsv)
    expect(Object.keys(BATTERY_ADAPTERS)).toEqual(['tesla', 'amber'])
  })

  it('builds a header-only template the reader accepts', () => {
    expect(buildTemplateCsv()).toBe(`${HEADER}\r\n`)
    expect(readGenericCsv(buildTemplateCsv(), LIMITS, 'tesla')).toEqual({ ok: false, reason: 'no_rows' })
  })

  it('caps one interval at the usable capacity of the household battery', () => {
    const bundle = seedMethodologyBundle()
    const profile = { ...emptyProfile(), ...BASELINE_PROFILE, batteryUnits: 2 }
    expect(maxIntervalKwh(batteryFromProfile(profile), bundle)).toBeCloseTo(27, 10)
    expect(maxIntervalKwh({ model: 'Unknown', units: 1 }, bundle)).toBe(10)
    expect(maxIntervalKwh({ model: 'Not sure', units: 1 }, bundle)).toBe(10)
  })

  it('has a plain message for every reason and row problem', () => {
    for (const message of [...Object.values(REASON_MESSAGES), ...Object.values(ROW_PROBLEM_MESSAGES)]) {
      expect(message.length).toBeGreaterThan(10)
      expect(message).not.toMatch(/[—–]/)
    }
  })
})

describe('no network in the goals feature', () => {
  it('has no fetch, XMLHttpRequest, sendBeacon, WebSocket, or EventSource in its source', () => {
    const sources = import.meta.glob<string>(
      [
        './**/*.ts',
        '../../components/goals/**/*.tsx',
        '../../constants/goals.ts',
        '../../constants/goalMessages.ts',
        '../../constants/batterySources.ts',
        '!./**/*.test.ts',
        '!../../components/goals/**/*.test.tsx',
      ],
      { query: '?raw', import: 'default', eager: true },
    )
    const paths = Object.keys(sources)
    expect(paths.length).toBeGreaterThan(10)
    expect(paths.some((path) => path.endsWith('UploadArea.tsx'))).toBe(true)
    for (const path of paths) {
      expect(sources[path], path).not.toMatch(
        /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|import\s*\(\s*['"]https?:/,
      )
    }
  })
})
