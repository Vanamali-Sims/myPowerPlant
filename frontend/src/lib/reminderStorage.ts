/**
 * Reminders downloaded from the Reminders tab, kept on this device so the
 * improve-flow profile can list them. Only the day and event type are kept.
 */
import { REMINDERS_STORAGE_KEY } from '../constants/storage'
import type { EventType } from '../types/reminders'

export type SavedReminder = {
  /** Melbourne date, YYYY-MM-DD. */
  date: string
  eventType: EventType
  /** ISO timestamp of the download. */
  savedOn: string
}

const MAX_SAVED_REMINDERS = 200
const EVENT_TYPES: readonly EventType[] = ['discharge', 'opt_out']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Key used by the Reminders tab for one day of one event type. */
export function reminderKey(eventType: EventType, date: string): string {
  return `${eventType}:${date}`
}

function isSavedReminder(value: unknown): value is SavedReminder {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.date === 'string' &&
    DATE_PATTERN.test(row.date) &&
    EVENT_TYPES.includes(row.eventType as EventType) &&
    typeof row.savedOn === 'string' &&
    row.savedOn.length <= 40 &&
    Number.isFinite(Date.parse(row.savedOn))
  )
}

/**
 * loadReminders
 * @returns Saved reminders, soonest day first; rows that fail a check are dropped
 */
export function loadReminders(): SavedReminder[] {
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY)
    if (!raw || raw.length > 32768) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSavedReminder).slice(0, MAX_SAVED_REMINDERS)
  } catch {
    return []
  }
}

function write(rows: SavedReminder[]): SavedReminder[] {
  const sorted = [...rows]
    .sort((a, b) => a.date.localeCompare(b.date) || a.eventType.localeCompare(b.eventType))
    .slice(0, MAX_SAVED_REMINDERS)
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(sorted))
  } catch {
    // The download itself already happened; the list is a convenience.
  }
  return sorted
}

/**
 * addReminders
 * @param entries - Days just downloaded
 * @returns The saved list; a day already saved for that event type is not added twice
 */
export function addReminders(entries: { date: string; eventType: EventType }[]): SavedReminder[] {
  const current = loadReminders()
  const keys = new Set(current.map((row) => reminderKey(row.eventType, row.date)))
  const savedOn = new Date().toISOString()
  const added = entries
    .filter((entry) => !keys.has(reminderKey(entry.eventType, entry.date)))
    .map((entry) => ({ ...entry, savedOn }))
  return write([...current, ...added])
}

/** Removes one day of one event type from the list. */
export function removeReminder(eventType: EventType, date: string): SavedReminder[] {
  return write(loadReminders().filter((row) => reminderKey(row.eventType, row.date) !== reminderKey(eventType, date)))
}

export function clearReminders(): void {
  try {
    localStorage.removeItem(REMINDERS_STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}
