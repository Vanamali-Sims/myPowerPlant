/**
 * Figures for the dashboard card on the improve home: the next discharge day
 * from the solar forecast, and the dates the last battery CSV covered.
 * Everything comes from the household's own setup and uploads.
 */
import { melbourneDate } from './goals/melbourneTime'
import type { ReminderRecommendation } from './reminderForecast'
import type { GoalsStore } from '../types/goals'

const UTC_DAY: Intl.DateTimeFormatOptions = { timeZone: 'UTC' }

/** Fixed short names: en-AU writes "Sept", and the card wants three letters. */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function partsOf(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`)
  return {
    weekday: WEEKDAYS[date.getUTCDay()],
    day: date.getUTCDate(),
    month: MONTHS[date.getUTCMonth()],
    year: date.getUTCFullYear(),
  }
}

/**
 * formatShortDay
 * @param iso - Calendar date, YYYY-MM-DD
 * @returns "Sat 10 Oct"
 */
export function formatShortDay(iso: string): string {
  const { weekday, day, month } = partsOf(iso)
  return `${weekday} ${day} ${month}`
}

/**
 * formatDateRange
 * @param start - First day, YYYY-MM-DD
 * @param end - Last day, YYYY-MM-DD
 * @returns "1 Sep – 30 Sep", with years only when the range crosses one
 */
export function formatDateRange(start: string, end: string): string {
  const from = partsOf(start)
  const to = partsOf(end)
  if (start === end) return `${from.day} ${from.month}`
  if (from.year !== to.year) return `${from.day} ${from.month} ${from.year} – ${to.day} ${to.month} ${to.year}`
  return `${from.day} ${from.month} – ${to.day} ${to.month}`
}

/**
 * nextDischargeDay
 * @param recommendations - Discharge days from the forecast, soonest first
 * @param today - Today in Melbourne, YYYY-MM-DD
 * @returns The first recommended day from today on, or null when none qualify
 */
export function nextDischargeDay(
  recommendations: ReminderRecommendation[],
  today: string,
): ReminderRecommendation | null {
  return recommendations.find((entry) => entry.date >= today) ?? null
}

export type LastUpload =
  | { kind: 'months'; start: string; end: string; uploadedOn: string }
  | { kind: 'baseline'; month: string; uploadedOn: string }

/**
 * lastUpload
 * @param store - Saved goals, months, and baseline
 * @returns The dates the most recent CSV added, or null before any upload
 *
 * Every month an upload touches gets the same `updatedOn`, so the latest
 * stamp picks out that upload's months. Only the counted days per month are
 * kept, so the range runs from the first to the last day counted in them.
 * Before any monthly upload, the CSV read for the goal baseline is used.
 */
export function lastUpload(store: GoalsStore): LastUpload | null {
  const latest = store.months.reduce<string | null>(
    (best, record) => (!best || record.updatedOn > best ? record.updatedOn : best),
    null,
  )
  if (latest) {
    const ranges = store.months
      .filter((record) => record.updatedOn === latest)
      .flatMap((record) => record.coveredRanges)
    if (ranges.length) {
      const start = ranges.reduce((min, range) => (range[0] < min ? range[0] : min), ranges[0][0])
      const end = ranges.reduce((max, range) => (range[1] > max ? range[1] : max), ranges[0][1])
      return { kind: 'months', start, end, uploadedOn: melbourneDate(Date.parse(latest)) }
    }
  }
  if (store.baseline) {
    return { kind: 'baseline', month: store.baseline.month, uploadedOn: melbourneDate(Date.parse(store.baseline.setOn)) }
  }
  return null
}

/**
 * formatMonth
 * @param month - YYYY-MM
 * @returns "September 2026"
 */
export function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-AU', { ...UTC_DAY, month: 'long', year: 'numeric' })
}
