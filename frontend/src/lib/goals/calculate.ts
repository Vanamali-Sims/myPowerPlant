/**
 * Estimated savings and carbon avoided from battery activity.
 *
 * Every kWh the battery gave out and every kWh it took in counts as battery
 * energy. Savings = battery energy × rate. Carbon = battery energy × the
 * Victorian grid emissions factor. The rate and factor are the same values the
 * dashboard uses; neither number is typed in here.
 */
import type { ValueKind } from '../kpis'
import { buildKpiReport } from '../kpis'
import type { MethodologyBundle } from '../methodologyApi'
import type { ProfileData } from '../../types/profile'
import type { DayReading } from './adapters/types'

export type CalculationContext = {
  /** AUD per kWh, from buildKpiReport. */
  rate: number
  /** 'from_you' means the household's own bill and usage; anything else is an estimate. */
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
 * @param profile - Saved household answers
 * @param bundle - Methodology data App already loaded
 * @returns The rate and emissions factor the dashboard would use for this household
 */
export function buildCalculationContext(
  profile: ProfileData,
  bundle: MethodologyBundle,
): CalculationContext {
  const report = buildKpiReport(profile, bundle)
  return {
    rate: report.retailRate,
    rateKind: report.retailRateKind,
    factor: getEmissionsFactor(bundle),
  }
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
 * @returns The day with battery energy, estimated savings, and estimated carbon
 */
export function calculateDay(day: DayReading, context: CalculationContext): DayFigures {
  const energyKwh = day.dischargeKwh + (day.intakeKwh ?? 0)
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
