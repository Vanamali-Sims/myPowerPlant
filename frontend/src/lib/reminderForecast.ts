/**
 * Turns the shared solar generation forecast into discharge and opt-out day
 * recommendations for the Get Reminded tab.
 *
 * The qualifying margin is not a fixed number — it is the household's own
 * battery reserve percentage. A day qualifies for a discharge event when its
 * forecast generation is at least that percentage above what this system
 * typically produces on an average day, since that margin is the same
 * caution the household already applies to their battery. A day qualifies
 * for opt-out when forecast generation is at least that percentage below
 * typical, since the battery may not recharge back above the household's
 * reserve level if it also discharges for an event.
 */
import type { EventType } from '../types/reminders'
import { formatKwh } from './kpis'
import type { ForecastPoint } from './solarForecast'

export type ReminderRecommendation = {
  date: string
  dayLabel: string
  forecastKwh: number
  typicalKwh: number
  reason: string
}

/**
 * dischargeFactor
 * @param reservePercent - Household's battery reserve percentage
 * @returns The multiple of a typical day that forecast generation must clear
 *
 * A 20% reserve means a day needs at least 20% more generation than typical.
 */
function dischargeFactor(reservePercent: number): number {
  return 1 + reservePercent / 100
}

/**
 * optOutFactor
 * @param reservePercent - Household's battery reserve percentage
 * @returns The multiple of a typical day that forecast generation must fall under
 *
 * A 20% reserve means a day needs at least 20% less generation than typical.
 */
function optOutFactor(reservePercent: number): number {
  return 1 - reservePercent / 100
}

/**
 * formatDayLabel
 * @param iso - ISO date (YYYY-MM-DD) for a forecast day
 * @returns A full day label such as "Tuesday, 23 September"
 */
function formatDayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

function reasonFor(
  eventType: EventType,
  forecastKwh: number,
  typicalKwh: number,
  reservePercent: number,
): string {
  if (eventType === 'discharge') {
    return `Forecast generation of ${formatKwh(forecastKwh)} is at least ${reservePercent}% above this system's typical day (${formatKwh(typicalKwh)}) — the same margin as your battery's reserve level — so the battery should recharge fully even after a discharge event.`
  }
  return `Forecast generation of ${formatKwh(forecastKwh)} is at least ${reservePercent}% below this system's typical day (${formatKwh(typicalKwh)}). With the battery reserve set to ${reservePercent}%, discharging today risks dropping below that reserve.`
}

/**
 * buildReminderRecommendations
 * @param points - Daily forecast points for the selected reminder period, starting today
 * @param typicalDailyKwh - This system's expected generation on an average day
 * @param eventType - Which side of the toggle to build recommendations for
 * @param reservePercent - Household's battery reserve percentage, used as the qualifying margin
 * @returns Only the days that qualify, each with a reason and estimate figure
 */
export function buildReminderRecommendations(
  points: ForecastPoint[],
  typicalDailyKwh: number,
  eventType: EventType,
  reservePercent: number,
): ReminderRecommendation[] {
  const recommendations: ReminderRecommendation[] = []
  const factor =
    eventType === 'discharge' ? dischargeFactor(reservePercent) : optOutFactor(reservePercent)

  points.forEach((point) => {
    const qualifies =
      eventType === 'discharge'
        ? point.kwh >= typicalDailyKwh * factor
        : point.kwh <= typicalDailyKwh * factor
    if (!qualifies) return

    recommendations.push({
      date: point.date,
      dayLabel: formatDayLabel(point.date),
      forecastKwh: point.kwh,
      typicalKwh: typicalDailyKwh,
      reason: reasonFor(eventType, point.kwh, typicalDailyKwh, reservePercent),
    })
  })

  return recommendations
}

/**
 * resultsCaption
 * @param eventType - Which side of the toggle is showing
 * @param reservePercent - Household's battery reserve percentage
 * @returns A caption explaining the qualifying margin, for the results section
 */
export function resultsCaption(eventType: EventType, reservePercent: number): string {
  const direction = eventType === 'discharge' ? 'above' : 'below'
  return `Estimated from your solar forecast — a day qualifies when its generation is at least ${reservePercent}% ${direction} this system's typical day, matching your battery's reserve level. Not a live meter reading.`
}

/**
 * emptyStateMessage
 * @param eventType - Which side of the toggle is showing
 * @param reservePercent - Household's battery reserve percentage
 * @returns Copy for when no days in the selected period qualify
 */
export function emptyStateMessage(eventType: EventType, reservePercent: number): string {
  const direction = eventType === 'discharge' ? 'above' : 'below'
  return `None of the days in this period forecast generation at least ${reservePercent}% ${direction} this system's typical day — the margin set by your battery's reserve level. Check back later, choose a longer period, or change your reserve percentage in your profile.`
}
