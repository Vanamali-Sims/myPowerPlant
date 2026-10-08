/**
 * Hour-by-hour shape of a typical day, for the load-versus-solar chart.
 *
 * The daily totals come straight from the KPI report, so this only decides how
 * that energy is spread across 24 hours. Nothing here is a meter reading.
 */
import { DAYS_PER_WEEK } from '../constants/kpiMethodology'
import type { BalancePeriod } from './kpis'
import type { PeakPeriod } from '../types/profile'

export type HourPoint = {
  hour: number
  loadKwh: number
  solarKwh: number
}

const HOURS_IN_DAY = 24

/** Which hours belong to each day-part, matching the seeded period hints. */
const PERIOD_HOURS: Record<PeakPeriod, number[]> = {
  morning: [6, 7, 8, 9, 10, 11],
  afternoon: [12, 13, 14, 15, 16, 17],
  evening: [18, 19, 20, 21],
  night: [22, 23, 0, 1, 2, 3, 4, 5],
}

/**
 * Shape inside a day-part. The weights are normalised, so the period total
 * stays the modelled figure. The line then rises in the morning and evening
 * instead of sitting flat.
 */
const PERIOD_SHAPE: Record<PeakPeriod, number[]> = {
  morning: [0.7, 1.1, 1.3, 1.1, 0.9, 0.7],
  afternoon: [0.8, 0.7, 0.65, 0.7, 0.9, 1.15],
  evening: [1.35, 1.5, 1.15, 0.75],
  night: [0.9, 0.55, 0.35, 0.3, 0.3, 0.35, 0.55, 0.85],
}

/** Daylight window and peak used to shape solar within the day. */
const SUNRISE = 6
const SUNSET = 20
const SOLAR_PEAK = 13

/**
 * solarWeights
 * @returns A 24-slot weight array summing to 1, zero outside daylight
 *
 * Generation follows a half-sine between sunrise and sunset rather than the
 * period shares, so the curve does not show solar at 2am. Period totals still
 * drive the day-part bars; this only shapes the line.
 */
function solarWeights(): number[] {
  const weights = new Array<number>(HOURS_IN_DAY).fill(0)
  for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
    const midpoint = hour + 0.5
    if (midpoint <= SUNRISE || midpoint >= SUNSET) continue
    // Skew the sine so its crest sits at SOLAR_PEAK instead of solar noon.
    const half = midpoint < SOLAR_PEAK ? SOLAR_PEAK - SUNRISE : SUNSET - SOLAR_PEAK
    const offset = Math.abs(midpoint - SOLAR_PEAK) / half
    weights[hour] = Math.cos((offset * Math.PI) / 2)
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  return total > 0 ? weights.map((weight) => weight / total) : weights
}

/**
 * buildTypicalDay
 * @param periods - Weekly consumption and generation for each day-part
 * @returns 24 points of load and solar in kWh for one typical day
 *
 * Each day-part keeps its modelled total. Inside the part, use rises toward
 * breakfast and the evening, which is when a home actually draws power.
 * Solar is reshaped onto a daylight curve so it does not appear at night.
 */
export function buildTypicalDay(periods: BalancePeriod[]): HourPoint[] {
  const load = new Array<number>(HOURS_IN_DAY).fill(0)
  let dailySolar = 0

  for (const period of periods) {
    const hours = PERIOD_HOURS[period.id]
    if (!hours?.length) continue
    const dailyLoad = period.consumptionKwh / DAYS_PER_WEEK
    const shape = PERIOD_SHAPE[period.id]
    const weight = shape.reduce((sum, value) => sum + value, 0) || 1
    hours.forEach((hour, index) => {
      load[hour] += dailyLoad * ((shape[index] ?? 1) / weight)
    })
    dailySolar += period.generationKwh / DAYS_PER_WEEK
  }

  const weights = solarWeights()
  return Array.from({ length: HOURS_IN_DAY }, (_unused, hour) => ({
    hour,
    loadKwh: load[hour],
    solarKwh: dailySolar * weights[hour],
  }))
}

/**
 * leftoverHours
 * @param points - A typical day
 * @returns Only the hours where solar is above household use
 *
 * This is the window a VPP can draw from, so it is highlighted on the chart.
 */
export function leftoverHours(points: HourPoint[]): HourPoint[] {
  return points.filter((point) => point.solarKwh > point.loadKwh)
}

/**
 * peakLeftoverHour
 * @param points - A typical day
 * @returns The hour with the largest solar surplus, or null if there is none
 */
export function peakLeftoverHour(points: HourPoint[]): HourPoint | null {
  let best: HourPoint | null = null
  let bestGap = 0
  for (const point of points) {
    const gap = point.solarKwh - point.loadKwh
    if (gap > bestGap) {
      best = point
      bestGap = gap
    }
  }
  return best
}

/**
 * formatHour
 * @param hour - Hour of the day from 0 to 23
 * @returns A short label such as "12am", "9am", or "6pm"
 */
export function formatHour(hour: number): string {
  const suffix = hour < 12 ? 'am' : 'pm'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}${suffix}`
}
