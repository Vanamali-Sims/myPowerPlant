/**
 * Calendar arithmetic on YYYY-MM-DD and YYYY-MM strings.
 *
 * These are calendar labels, not instants, so the maths runs in UTC and is
 * never shifted by the browser's own time zone.
 */
import type { DateRange } from '../../types/goals'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/
const MS_PER_DAY = 86_400_000

/**
 * daysInMonth
 * @param month - YYYY-MM
 * @returns Number of calendar days, or 0 when the label is not a real month
 */
export function daysInMonth(month: string): number {
  const match = MONTH_PATTERN.exec(month)
  if (!match) return 0
  const year = Number(match[1])
  const index = Number(match[2])
  if (index < 1 || index > 12) return 0
  return new Date(Date.UTC(year, index, 0)).getUTCDate()
}

/**
 * isCalendarDate
 * @param value - Candidate YYYY-MM-DD
 * @returns True only for a real date such as 2026-02-28, not 2026-02-30
 */
export function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const day = Number(match[3])
  return day >= 1 && day <= daysInMonth(`${match[1]}-${match[2]}`)
}

/** Month label (YYYY-MM) for a YYYY-MM-DD date. */
export function monthOf(date: string): string {
  return date.slice(0, 7)
}

function toUtcMs(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/**
 * daysBetweenInclusive
 * @param start - First day
 * @param end - Last day, not before start
 * @returns Count of calendar days from start to end, both included
 */
export function daysBetweenInclusive(start: string, end: string): number {
  return Math.round((toUtcMs(end) - toUtcMs(start)) / MS_PER_DAY) + 1
}

/** Number of days covered by a list of non-overlapping ranges. */
export function countRangeDays(ranges: DateRange[]): number {
  return ranges.reduce((sum, [start, end]) => sum + daysBetweenInclusive(start, end), 0)
}
