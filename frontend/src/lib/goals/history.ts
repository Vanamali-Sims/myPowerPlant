/**
 * Monthly history: adding confirmed days and deriving what the page shows.
 *
 * Only monthly records are stored. Totals, the last counted date, partial
 * flags, and table rows are always worked out from them, never stored.
 */
import type { BatterySourceId } from '../../constants/batterySources'
import type { DateRange, MonthRecord } from '../../types/goals'
import type { DayFigures } from './calculate'
import { countRangeDays, daysInMonth, isDateCovered, mergeRanges, monthOf } from './calendar'

export type MergePlan = {
  /** Days not counted before; these are what Confirm adds. */
  newDays: DayFigures[]
  /** Days already inside a month's counted ranges, left as they were. */
  skippedDays: string[]
}

export type HistoryRow = {
  month: string
  daysCounted: number
  daysInMonth: number
  partial: boolean
  savingsAud: number
  carbonKg: number
  revisedOn?: string
}

function rangesByMonth(months: MonthRecord[]): Map<string, DateRange[]> {
  return new Map(months.map((record) => [record.month, record.coveredRanges]))
}

/**
 * planMerge
 * @param months - Stored monthly records
 * @param days - Calculated days from the file
 * @returns Which days are new and which are already counted
 *
 * A day inside a month's counted ranges is never counted twice. Days outside
 * every range are new, whether they are later than the last counted date or
 * fill an earlier gap.
 */
export function planMerge(months: MonthRecord[], days: DayFigures[]): MergePlan {
  const covered = rangesByMonth(months)
  const newDays: DayFigures[] = []
  const skippedDays: string[] = []
  for (const day of days) {
    const ranges = covered.get(monthOf(day.date)) ?? []
    if (isDateCovered(ranges, day.date)) skippedDays.push(day.date)
    else newDays.push(day)
  }
  return { newDays, skippedDays }
}

/**
 * applyDays
 * @param months - Stored monthly records
 * @param days - New days only, from planMerge
 * @param sourceId - Provider the file came from
 * @param now - Timestamp for updatedOn
 * @returns Monthly records with the days added, sorted by month
 *
 * Intake stays null for a month until a file with an intake column adds to it.
 */
export function applyDays(
  months: MonthRecord[],
  days: DayFigures[],
  sourceId: BatterySourceId,
  now: string,
): MonthRecord[] {
  const byMonth = new Map(months.map((record) => [record.month, record]))
  const grouped = new Map<string, DayFigures[]>()
  for (const day of days) {
    const key = monthOf(day.date)
    grouped.set(key, [...(grouped.get(key) ?? []), day])
  }
  for (const [month, monthDays] of grouped) {
    const existing = byMonth.get(month)
    const coveredRanges = mergeRanges(
      existing?.coveredRanges ?? [],
      monthDays.map((day) => day.date),
    )
    const addedIntake = monthDays.some((day) => day.intakeKwh !== null)
    const intakeBefore = existing?.intakeKwh ?? null
    const intakeAdded = monthDays.reduce((sum, day) => sum + (day.intakeKwh ?? 0), 0)
    const record: MonthRecord = {
      month,
      daysInMonth: daysInMonth(month),
      daysCounted: countRangeDays(coveredRanges),
      coveredRanges,
      savingsAud: (existing?.savingsAud ?? 0) + monthDays.reduce((sum, day) => sum + day.savingsAud, 0),
      carbonKg: (existing?.carbonKg ?? 0) + monthDays.reduce((sum, day) => sum + day.carbonKg, 0),
      dischargeKwh:
        (existing?.dischargeKwh ?? 0) + monthDays.reduce((sum, day) => sum + day.dischargeKwh, 0),
      intakeKwh:
        intakeBefore === null && !addedIntake ? null : (intakeBefore ?? 0) + intakeAdded,
      sourceId,
      updatedOn: now,
    }
    if (existing?.revisedOn) record.revisedOn = existing.revisedOn
    byMonth.set(month, record)
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * removeMonth
 * @param months - Stored monthly records
 * @param month - YYYY-MM to take out
 * @returns The records without that month; reached goals are kept elsewhere and not touched
 */
export function removeMonth(months: MonthRecord[], month: string): MonthRecord[] {
  return months.filter((record) => record.month !== month)
}

/** The latest day counted in any month, or null before any upload. */
export function lastCountedDate(months: MonthRecord[]): string | null {
  let latest: string | null = null
  for (const record of months) {
    const end = record.coveredRanges[record.coveredRanges.length - 1]?.[1]
    if (end && (!latest || end > latest)) latest = end
  }
  return latest
}

/** One table row per stored month, oldest first. */
export function historyRows(months: MonthRecord[]): HistoryRow[] {
  return months.map((record) => ({
    month: record.month,
    daysCounted: record.daysCounted,
    daysInMonth: record.daysInMonth,
    partial: record.daysCounted < record.daysInMonth,
    savingsAud: record.savingsAud,
    carbonKg: record.carbonKg,
    revisedOn: record.revisedOn,
  }))
}
