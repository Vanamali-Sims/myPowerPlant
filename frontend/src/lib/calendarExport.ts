/**
 * Builds downloadable .ics (iCalendar, RFC 5545) files for reminder rows.
 *
 * .ics is a vendor-neutral format that Apple Calendar, Google Calendar,
 * Outlook, and Windows Calendar all open directly, so one file works across
 * Android, iOS, macOS, and Windows. Events are all-day: the forecast this
 * tab uses is a whole-day figure, with no specific recommended time window
 * yet. Nothing is uploaded anywhere — the file is built entirely in the
 * browser and handed straight to the device to open.
 */
import type { EventType } from '../types/reminders'
import type { ReminderRecommendation } from './reminderForecast'

const EVENT_TYPE_TITLE: Record<EventType, string> = {
  discharge: 'Discharge event reminder',
  opt_out: 'Opt-out event reminder',
}

/** RFC 5545 caps content lines at this many octets before they must fold. */
const FOLD_LIMIT = 75

/**
 * escapeIcsText
 * @param value - Raw text for a SUMMARY or DESCRIPTION field
 * @returns The same text with RFC 5545 special characters escaped
 */
function escapeIcsText(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex -- strips control chars RFC 5545 forbids in TEXT
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * foldIcsLine
 * @param line - One unfolded "PROPERTY:value" content line
 * @returns The line split onto continuation lines per RFC 5545
 *
 * A continuation line starts with a single space, which readers strip
 * before rejoining it with the line above.
 */
function foldIcsLine(line: string): string {
  if (line.length <= FOLD_LIMIT) return line
  let folded = line.slice(0, FOLD_LIMIT)
  let rest = line.slice(FOLD_LIMIT)
  while (rest.length > 0) {
    const chunk = rest.slice(0, FOLD_LIMIT - 1)
    folded += `\r\n ${chunk}`
    rest = rest.slice(FOLD_LIMIT - 1)
  }
  return folded
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * assertValidIsoDate
 * @param iso - entry.date, sourced from the Open-Meteo forecast response
 *
 * entry.date is never escaped before use in UID/DTSTART/DTEND (R22) - a
 * malformed value from a compromised or misbehaving forecast response
 * could otherwise inject raw calendar syntax into the exported file.
 * Validating the shape here, once, before any use is cheaper and safer
 * than escaping three separate call sites.
 */
function assertValidIsoDate(iso: string): void {
  if (!ISO_DATE.test(iso) || Number.isNaN(new Date(`${iso}T00:00:00`).getTime())) {
    throw new Error(`Refusing to build a calendar event for an invalid date: "${iso}"`)
  }
}

/** ISO date (YYYY-MM-DD) to the compact YYYYMMDD form iCalendar uses. */
function compactDate(iso: string): string {
  return iso.replace(/-/g, '')
}

/** The day after an ISO date, for an all-day event's exclusive DTEND. */
function nextCompactDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/** Current time as an iCalendar UTC timestamp (YYYYMMDDTHHMMSSZ). */
function timestampNow(): string {
  return `${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

/**
 * buildEventBlock
 * @param entry - One recommended day
 * @param eventType - Discharge or opt-out
 * @returns One folded, escaped VEVENT block
 *
 * The description repeats the same reason already shown when the row is
 * expanded, so the calendar reminder and the tab never say different things.
 */
function buildEventBlock(entry: ReminderRecommendation, eventType: EventType): string {
  assertValidIsoDate(entry.date)
  const summary = EVENT_TYPE_TITLE[eventType]
  const description = `${summary} for ${entry.dayLabel}.\n\n${entry.reason}\n\nEstimated generation, not a live meter reading. Downloaded from MyPowerPlant.`
  const lines = [
    'BEGIN:VEVENT',
    `UID:mypowerplant-${eventType}-${entry.date}@get-reminded`,
    `DTSTAMP:${timestampNow()}`,
    `DTSTART;VALUE=DATE:${compactDate(entry.date)}`,
    `DTEND;VALUE=DATE:${nextCompactDate(entry.date)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT',
  ]
  return lines.map(foldIcsLine).join('\r\n')
}

/**
 * buildIcsFile
 * @param entries - One or more recommended days to include
 * @param eventType - Discharge or opt-out, applied to every event in the file
 * @returns Full .ics file content, ready to hand to downloadIcsFile
 */
export function buildIcsFile(entries: ReminderRecommendation[], eventType: EventType): string {
  const body = entries.map((entry) => buildEventBlock(entry, eventType)).join('\r\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MyPowerPlant//Get Reminded//EN',
    'CALSCALE:GREGORIAN',
    body,
    'END:VCALENDAR',
  ].join('\r\n')
}

/**
 * downloadIcsFile
 * @param filename - Name for the downloaded file, e.g. "mypowerplant-discharge-reminders.ics"
 * @param content - Full .ics file text from buildIcsFile
 *
 * Builds a Blob in the browser and clicks a throwaway link to trigger the
 * save dialog. Nothing here reaches a server.
 */
export function downloadIcsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
