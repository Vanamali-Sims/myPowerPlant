/**
 * Estimated savings and carbon avoided from battery activity.
 *
 * Only energy the battery gave out (discharge) counts; energy it took in is
 * read but not counted. Savings = discharge × rate. Carbon = discharge × the
 * Victorian grid emissions factor. The rate is the person's own usage rate
 * when they gave one, else the typical Victorian rate from the methodology data.
 */
import { GOAL_RATE_CENTS } from '../../constants/goals'
import type { ProfileData } from '../../types/profile'
import type { ValueKind } from '../kpis'
import type { MethodologyBundle } from '../methodologyApi'
import type { DayReading } from './adapters/types'

export type CalculationContext = {
  /** AUD per kWh: the person's own rate, or the typical Victorian rate. */
  rate: number
  /** 'from_you' means the rate the person entered; anything else is an estimate. */
  rateKind: ValueKind
  /** kg CO2e per kWh, the methodology field buildKpiReport reads. */
  factor: number
}

export type DayFigures = DayReading & {
  energyKwh: number
  savingsAud: number
  carbonKg: number
}

export type PreviewTotals = {
  firstDate: string
  lastDate: string
  dayCount: number
  dischargeKwh: number
  /** null when the file had no intake column, which is not the same as zero. */
  intakeKwh: number | null
  energyKwh: number
  savingsAud: number
  carbonKg: number
}

/**
 * buildCalculationContext
 * @param ratePerKwh - Usage rate (AUD per kWh) from the person's bill or contract, or null
 * @param bundle - Methodology data App already loaded
 * @returns The rate and emissions factor used to value battery discharge
 *
 * With no rate given, the typical Victorian rate is used and marked as an estimate.
 */
export function buildCalculationContext(
  ratePerKwh: number | null,
  bundle: MethodologyBundle,
): CalculationContext {
  const own = ratePerKwh !== null && Number.isFinite(ratePerKwh) && ratePerKwh > 0
  return {
    rate: own ? ratePerKwh : bundle.methodology.defaultRetailRate,
    rateKind: own ? 'from_you' : 'estimate',
    factor: getEmissionsFactor(bundle),
  }
}

/**
 * profileRate
 * @param profile - Household answers
 * @returns Monthly bill ÷ monthly kWh (AUD per kWh) when both are in the profile and
 *   the result is a believable usage rate, else null
 */
export function profileRate(profile: ProfileData): number | null {
  const bill = Number.parseFloat(profile.monthlyBill)
  const kwh = Number.parseFloat(profile.monthlyKwh)
  if (!(bill > 0) || !(kwh > 0)) return null
  const rate = bill / kwh
  return rate >= GOAL_RATE_CENTS.min / 100 && rate <= GOAL_RATE_CENTS.max / 100 ? rate : null
}

/** The shared Victorian grid emissions factor. Never a copied number. */
export function getEmissionsFactor(bundle: MethodologyBundle): number {
  return bundle.methodology.vicGridKgCo2PerKwh
}

/**
 * getRateForInterval
 * @param context - Rate and factor for this household
 * @param _date - Melbourne date of the energy being valued
 * @returns AUD per kWh for that time
 *
 * Which rate values savings is to be confirmed by the team. Today it is the
 * household's flat rate. A time-of-use rate would replace this one function
 * (and would need interval figures rather than day totals).
 */
export function getRateForInterval(context: CalculationContext, _date: string): number {
  return context.rate
}

/**
 * calculateDay
 * @param day - One complete day read from the file
 * @param context - Rate and factor for this household
 * @returns The day with counted energy (discharge only), estimated savings, and estimated carbon
 */
export function calculateDay(day: DayReading, context: CalculationContext): DayFigures {
  const energyKwh = day.dischargeKwh
  return {
    ...day,
    energyKwh,
    savingsAud: energyKwh * getRateForInterval(context, day.date),
    carbonKg: energyKwh * context.factor,
  }
}

/**
 * summariseDays
 * @param days - Calculated days, in date order, at least one
 * @returns Date range, day count, and totals for the preview
 */
export function summariseDays(days: DayFigures[]): PreviewTotals {
  const hasIntake = days.some((day) => day.intakeKwh !== null)
  return {
    firstDate: days[0].date,
    lastDate: days[days.length - 1].date,
    dayCount: days.length,
    dischargeKwh: days.reduce((sum, day) => sum + day.dischargeKwh, 0),
    intakeKwh: hasIntake ? days.reduce((sum, day) => sum + (day.intakeKwh ?? 0), 0) : null,
    energyKwh: days.reduce((sum, day) => sum + day.energyKwh, 0),
    savingsAud: days.reduce((sum, day) => sum + day.savingsAud, 0),
    carbonKg: days.reduce((sum, day) => sum + day.carbonKg, 0),
  }
}
