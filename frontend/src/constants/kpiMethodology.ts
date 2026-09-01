/**
 * KPI methodology numbers used by lib/kpis.
 *
 * These are modelling assumptions, not live meter data. Keep them here so the
 * calculation file stays about the algorithm, not the weights.
 */
import type { PeakPeriod } from '../types/profile'

export const KPI_PERIODS: { id: PeakPeriod; label: string; hint: string }[] = [
  { id: 'morning', label: 'Morning', hint: '6am – 12pm' },
  { id: 'afternoon', label: 'Afternoon', hint: '12pm – 6pm' },
  { id: 'evening', label: 'Evening', hint: '6pm – 10pm' },
  { id: 'night', label: 'Night', hint: '10pm – 6am' },
]

export const SOLAR_SHARE: Record<PeakPeriod, number> = {
  morning: 0.28,
  afternoon: 0.55,
  evening: 0.15,
  night: 0.02,
}

export const CONSUMPTION_SHARE_BASE = 0.2
export const CONSUMPTION_SHARE_PEAK = 0.4
export const DEFAULT_PEAK_PERIOD: PeakPeriod = 'evening'

/** Share of leftover daytime export that the battery can shift into evening. */
export const BATTERY_SHIFT_FACTOR = 0.5

export const DAYS_PER_WEEK = 7
export const WEEKS_PER_MONTH = 4

export const DISHWASHER_MIN_PEOPLE = 3
export const WFH_MONITOR_HOURS = 40
export const WASHER_MIN_HOURS = 2
export const AIRCON_BASE_HOURS = 8
export const AIRCON_HOURS_PER_ROOM = 1.5
export const AIRCON_MAX_HOURS = 28
export const EVAPORATIVE_HOURS = 12
export const HEATER_BASE_HOURS = 6
export const HEATER_MAX_HOURS = 24
export const WATER_HEATER_HOURS = 8
