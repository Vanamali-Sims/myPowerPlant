/**
 * Melbourne local time for battery intervals, including daylight saving days.
 *
 * Melbourne is UTC+10 (AEST) or UTC+11 (AEDT). On the day clocks go back one
 * local hour happens twice, and on the day they go forward one local hour is
 * skipped, so a day can be 23, 24, or 25 hours long.
 */
import { addDays, isCalendarDate } from './calendar'

const TIME_ZONE = 'Australia/Melbourne'
const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 3_600_000
const MELBOURNE_OFFSETS = [660, 600] as const

const offsetFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: TIME_ZONE,
  timeZoneName: 'longOffset',
  year: 'numeric',
})

// Melbourne only changes offset on a whole UTC hour, so one lookup per hour is exact.
const offsetCache = new Map<number, number>()

/**
 * melbourneOffsetMinutes
 * @param instant - Milliseconds since the epoch
 * @returns Minutes ahead of UTC in Melbourne at that instant (600 or 660)
 */
export function melbourneOffsetMinutes(instant: number): number {
  const hour = Math.floor(instant / MS_PER_HOUR)
  const cached = offsetCache.get(hour)
  if (cached !== undefined) return cached
  const name = offsetFormatter
    .formatToParts(new Date(hour * MS_PER_HOUR))
    .find((part) => part.type === 'timeZoneName')?.value
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? '')
  const minutes = match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 600
  offsetCache.set(hour, minutes)
  return minutes
}

/**
 * melbourneDate
 * @param instant - Milliseconds since the epoch
 * @returns The Melbourne calendar date (YYYY-MM-DD) at that instant
 */
export function melbourneDate(instant: number): string {
  const local = new Date(instant + melbourneOffsetMinutes(instant) * MS_PER_MINUTE)
  return local.toISOString().slice(0, 10)
}

/**
 * melbourneWallTime
 * @param instant - Milliseconds since the epoch
 * @returns Melbourne local "YYYY-MM-DD HH:MM" at that instant
 */
export function melbourneWallTime(instant: number): string {
  const local = new Date(instant + melbourneOffsetMinutes(instant) * MS_PER_MINUTE)
  return local.toISOString().slice(0, 16).replace('T', ' ')
}

/**
 * wallTimeInstants
 * @param date - Melbourne calendar date
 * @param hour - Local hour, 0 to 23
 * @param minute - Local minute
 * @returns Every instant that shows this local time in Melbourne, earliest first
 *
 * Normally one instant. Two in the repeated hour when clocks go back (AEDT
 * first, then AEST). None in the skipped hour when clocks go forward.
 */
export function wallTimeInstants(date: string, hour: number, minute: number): number[] {
  const [year, month, day] = date.split('-').map(Number)
  const asUtc = Date.UTC(year, month - 1, day, hour, minute)
  return MELBOURNE_OFFSETS.map((offset) => asUtc - offset * MS_PER_MINUTE).filter(
    (instant, index) => melbourneOffsetMinutes(instant) === MELBOURNE_OFFSETS[index],
  )
}

/** The instant a Melbourne calendar day begins. Midnight is never skipped or repeated. */
export function melbourneDayStart(date: string): number {
  return wallTimeInstants(date, 0, 0)[0]
}

/**
 * melbourneDayMinutes
 * @param date - Melbourne calendar date
 * @returns 1380, 1440, or 1500 minutes
 */
export function melbourneDayMinutes(date: string): number {
  return (melbourneDayStart(addDays(date, 1)) - melbourneDayStart(date)) / MS_PER_MINUTE
}

/**
 * expectedIntervals
 * @param date - Melbourne calendar date
 * @param intervalMinutes - Length of each interval
 * @returns How many intervals make a complete day, e.g. 92, 96, or 100 for 15 minutes
 */
export function expectedIntervals(date: string, intervalMinutes: number): number {
  return melbourneDayMinutes(date) / intervalMinutes
}

export type ParsedTime =
  | { kind: 'instant'; instant: number }
  | { kind: 'wall'; date: string; hour: number; minute: number }

const ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/
const AU_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/

function offsetMinutes(text: string): number {
  if (text === 'Z') return 0
  const sign = text.startsWith('-') ? -1 : 1
  const digits = text.slice(1).replace(':', '')
  return sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2)))
}

/**
 * parseIntervalStart
 * @param raw - interval_start cell
 * @returns An exact instant when an offset is given, a Melbourne wall time
 *   when it is not, or null when the text is not a real date and time
 *
 * Accepts "2026-09-01 00:15", "2026-09-01T00:15:00+10:00", and the Australian
 * spreadsheet form "1/09/2026 0:15" (day first). Seconds must be zero.
 */
export function parseIntervalStart(raw: string): ParsedTime | null {
  const text = raw.trim()
  let year: string, month: string, day: string, hour: string, minute: string
  let second: string | undefined
  let offset: string | undefined
  const iso = ISO_PATTERN.exec(text)
  if (iso) {
    ;[, year, month, day, hour, minute, second, offset] = iso
  } else {
    const au = AU_PATTERN.exec(text)
    if (!au) return null
    ;[, day, month, year, hour, minute, second] = au
    day = day.padStart(2, '0')
    month = month.padStart(2, '0')
  }
  const date = `${year}-${month}-${day}`
  const h = Number(hour)
  const m = Number(minute)
  if (!isCalendarDate(date) || h > 23 || m > 59 || (second !== undefined && Number(second) !== 0)) {
    return null
  }
  if (offset) {
    const asUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), h, m)
    return { kind: 'instant', instant: asUtc - offsetMinutes(offset) * MS_PER_MINUTE }
  }
  return { kind: 'wall', date, hour: h, minute: m }
}
