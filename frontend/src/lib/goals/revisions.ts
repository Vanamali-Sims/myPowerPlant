/**
 * Revised data and missing days, worked out from monthly records only.
 *
 * Daily figures are never stored, so a revision can only be spotted for a
 * whole month: when a file has every day a month already counts, and its
 * kWh for those days differ from what was saved.
 */
import type { BatterySourceId } from '../../constants/batterySources'
import { REVISION_TOLERANCE_KWH } from '../../constants/goals'
import type { DateRange, MonthRecord } from '../../types/goals'
import type { DayFigures } from './calculate'
import { addDays, isDateCovered, mergeRanges, monthOf } from './calendar'
import { applyDays, lastCountedDate } from './history'

export type MonthFigures = {
  daysCounted: number
  dischargeKwh: number
  intakeKwh: number | null
  savingsAud: number
  carbonKg: number
}

export type MonthRevision = {
  month: string
  /** What is saved for this month now. */
  saved: MonthFigures
  /** The file's figures for the same days, to compare like with like. */
  file: MonthFigures
  /** Every day the file has for this month; Replace uses all of them. */
  replacement: DayFigures[]
}

export type RevisionCheck = {
  revised: MonthRevision[]
  /** Months where the file covers only part of what was counted, so revisions cannot be checked. */
  unchecked: string[]
}

function coveredDays(record: MonthRecord): string[] {
  const days: string[] = []
  for (const [start, end] of record.coveredRanges) {
    for (let date = start; date <= end; date = addDays(date, 1)) days.push(date)
  }
  return days
}

function totalsOf(days: DayFigures[]): MonthFigures {
  const hasIntake = days.some((day) => day.intakeKwh !== null)
  return {
    daysCounted: days.length,
    dischargeKwh: days.reduce((sum, day) => sum + day.dischargeKwh, 0),
    intakeKwh: hasIntake ? days.reduce((sum, day) => sum + (day.intakeKwh ?? 0), 0) : null,
    savingsAud: days.reduce((sum, day) => sum + day.savingsAud, 0),
    carbonKg: days.reduce((sum, day) => sum + day.carbonKg, 0),
  }
}

function differs(saved: MonthFigures, file: MonthFigures): boolean {
  if (Math.abs(saved.dischargeKwh - file.dischargeKwh) > REVISION_TOLERANCE_KWH) return true
  if ((saved.intakeKwh === null) !== (file.intakeKwh === null)) return true
  return Math.abs((saved.intakeKwh ?? 0) - (file.intakeKwh ?? 0)) > REVISION_TOLERANCE_KWH
}

/**
 * checkRevisions
 * @param months - Stored monthly records
 * @param days - Every complete, valid day calculated from the file
 * @returns Months that look revised, and months that could not be checked
 *
 * Compares energy (kWh), not dollars, so a change in the household's rate is
 * never mistaken for revised data.
 */
export function checkRevisions(months: MonthRecord[], days: DayFigures[]): RevisionCheck {
  const byDate = new Map(days.map((day) => [day.date, day]))
  const revised: MonthRevision[] = []
  const unchecked: string[] = []
  for (const record of months) {
    const counted = coveredDays(record)
    const present = counted.filter((date) => byDate.has(date))
    if (!present.length) continue
    if (present.length < counted.length) {
      unchecked.push(record.month)
      continue
    }
    const file = totalsOf(present.map((date) => byDate.get(date) as DayFigures))
    const saved: MonthFigures = {
      daysCounted: record.daysCounted,
      dischargeKwh: record.dischargeKwh,
      intakeKwh: record.intakeKwh,
      savingsAud: record.savingsAud,
      carbonKg: record.carbonKg,
    }
    if (differs(saved, file)) {
      revised.push({
        month: record.month,
        saved,
        file,
        replacement: days.filter((day) => monthOf(day.date) === record.month),
      })
    }
  }
  return { revised, unchecked }
}

/**
 * applyReplacement
 * @param months - Stored monthly records
 * @param revisions - Months to replace with the file's figures
 * @param newDays - New days for other months, from planMerge
 * @param sourceId - Provider the file came from
 * @param now - Timestamp for updatedOn
 * @param revisedOn - Melbourne date to mark replaced months with
 * @returns Records where each revised month is rebuilt from the file and new days are added
 *
 * Savings and carbon for replaced months are recalculated at the current rate
 * and factor, because the days passed in were calculated just now.
 */
export function applyReplacement(
  months: MonthRecord[],
  revisions: MonthRevision[],
  newDays: DayFigures[],
  sourceId: BatterySourceId,
  now: string,
  revisedOn: string,
): MonthRecord[] {
  const replaced = new Set(revisions.map((revision) => revision.month))
  const kept = months.filter((record) => !replaced.has(record.month))
  const rebuilt = applyDays(
    [],
    revisions.flatMap((revision) => revision.replacement),
    sourceId,
    now,
  ).map((record) => ({ ...record, revisedOn }))
  const merged = [...kept, ...rebuilt].sort((a, b) => a.month.localeCompare(b.month))
  return applyDays(
    merged,
    newDays.filter((day) => !replaced.has(monthOf(day.date))),
    sourceId,
    now,
  )
}

/**
 * missingDays
 * @param months - Stored monthly records, before this file
 * @param days - Every complete, valid day in the file
 * @returns Ranges of days that will stay uncounted, between the last counted
 *   date (or the file's first day) and the file's last day
 *
 * These days are never estimated. Their months show as partial until a later
 * file fills them.
 */
export function missingDays(months: MonthRecord[], days: DayFigures[]): DateRange[] {
  if (!days.length) return []
  const fileDates = new Set(days.map((day) => day.date))
  const first = days[0].date
  const last = days[days.length - 1].date
  const lastCounted = lastCountedDate(months)
  const start = lastCounted && lastCounted < first ? addDays(lastCounted, 1) : first
  const covered = new Map(months.map((record) => [record.month, record.coveredRanges]))
  const gaps: string[] = []
  for (let date = start; date <= last; date = addDays(date, 1)) {
    if (fileDates.has(date)) continue
    if (isDateCovered(covered.get(monthOf(date)) ?? [], date)) continue
    gaps.push(date)
  }
  return mergeRanges([], gaps)
}
