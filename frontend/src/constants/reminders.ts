/**
 * Get Reminded tab config: reminder period choices and the event-type toggle.
 *
 * Kept out of RemindersView so the same values can be reused once the
 * discharge and opt-out lists are wired up to the solar forecast.
 */
import type { EventType } from '../types/reminders'

/** Open-Meteo forecasts at most 16 days ahead; 14 keeps a clear runway. */
export const MAX_REMINDER_PERIOD_DAYS = 14

export const REMINDER_PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '5', label: '5 days' },
  { value: '7', label: '7 days' },
  { value: '10', label: '10 days' },
  { value: String(MAX_REMINDER_PERIOD_DAYS), label: `${MAX_REMINDER_PERIOD_DAYS} days` },
]

export const DEFAULT_REMINDER_PERIOD_DAYS = '7'

export const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'discharge', label: 'Discharge event' },
  { value: 'opt_out', label: 'Opt-out event' },
]

export const DEFAULT_EVENT_TYPE: EventType = 'discharge'

export const EVENT_TYPE_RESULTS_HEADING: Record<EventType, string> = {
  discharge: 'Recommended discharge days',
  opt_out: 'Recommended opt-out days',
}
