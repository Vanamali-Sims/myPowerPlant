/**
 * Battery files on the Goals tab.
 *
 * The person is never asked which VPP provider app a file is from: every
 * known source is read with the team's battery template layout for now, and
 * the reader tries each in turn. These ids are internal only. Mapping a
 * provider's own export onto TEMPLATE_COLUMNS can be added later as another
 * reader in lib/goals/adapters, without changing the rest of the flow.
 */

export type BatterySourceId = 'tesla' | 'amber'

export type SourceColumn = {
  name: string
  required: boolean
  description: string
}

/** The internal schema every reader converts to. */
export const TEMPLATE_COLUMNS: SourceColumn[] = [
  {
    name: 'interval_start',
    required: true,
    description:
      'When the interval starts, in Melbourne time, for example 2026-09-01 00:15 or 1/09/2026 0:15. An offset such as +10:00 may be added.',
  },
  {
    name: 'interval_minutes',
    required: true,
    description: 'Length of each interval in minutes: 5, 15, 30 or 60.',
  },
  {
    name: 'battery_discharge_kwh',
    required: true,
    description: 'Energy the battery gave out during the interval, in kWh.',
  },
  {
    name: 'battery_charge_kwh',
    required: false,
    description: 'Energy the battery took in during the interval, in kWh. Optional.',
  },
]

/** Allowed interval lengths in minutes. To be confirmed by the team. */
export const INTERVAL_MINUTES_ALLOWED = [5, 15, 30, 60] as const

/** Largest file read, in bytes. To be confirmed by the team. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024

export const TEMPLATE_FILE_NAME = 'mypowerplant-battery-template.csv'

/**
 * Largest single interval, as a multiple of the battery's usable capacity,
 * before a value is treated as invalid. To be confirmed by the team.
 */
export const MAX_INTERVAL_KWH_FACTOR = 1
