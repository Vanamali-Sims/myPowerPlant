/**
 * Calendar facts used when scaling a modelled week.
 *
 * Lookup rates and appliance ratings now come from GET /api/methodology.
 */
import type { PeakPeriod } from '../types/profile'

export const DAYS_PER_WEEK = 7
export const WEEKS_PER_MONTH = 4

export const DEFAULT_PEAK_PERIOD: PeakPeriod = 'evening'
