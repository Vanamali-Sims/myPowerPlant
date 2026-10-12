/**
 * Shared reminder list for Reminders screen and chat (Epic 6.4).
 * Uses the same forecast + qualification logic as RemindersView.
 */
import { DEFAULT_RESERVE_PERCENT, FIELD_BOUNDS, clampNumber } from '../constants/validation'
import { coordsFromPostcode } from '../data/profileOptions'
import { formatKwh, panelWattsOrTypical, parseCount } from './kpis'
import type { MethodologyBundle } from './methodologyApi'
import {
  buildReminderRecommendations,
  emptyStateMessage,
  type ReminderRecommendation,
} from './reminderForecast'
import { fetchSolarForecast, pointsForView, type SolarInputs } from './solarForecast'
import type { ProfileData } from '../types/profile'
import type { EventType } from '../types/reminders'

export type ReminderLoadInput = {
  profile: ProfileData
  bundle: MethodologyBundle
  eventType: EventType
  reminderPeriodDays: string
  /** Forecast location; Reminders page may override, chat uses saved profile. */
  postcode: string
}

export type ReminderLoadResult =
  | { ok: true; recommendations: ReminderRecommendation[]; eventType: EventType }
  | { ok: false; message: string }

function solarInputsFor(
  profile: ProfileData,
  bundle: MethodologyBundle,
  postcode: string,
): SolarInputs | null {
  const hasOwnSolar = profile.hasSolar === 'yes'
  const systemKw = hasOwnSolar
    ? (parseCount(profile.panelCount) * panelWattsOrTypical(profile)) / 1000
    : bundle.methodology.typicalPotentialKw
  const orientationFactor =
    bundle.orientationFactors[profile.solarDirection] ?? bundle.orientationFactors.not_sure ?? 1
  const { lat, lon } = coordsFromPostcode(postcode)
  return {
    lat,
    lon,
    systemKw,
    orientationFactor,
    performanceRatio: bundle.methodology.solarPerformanceRatio,
  }
}

/**
 * loadReminderRecommendations
 * @param input - Profile, methodology, event type, period, and postcode
 * @returns Qualifying days or a plain failure line (no invented dates)
 */
export async function loadReminderRecommendations(
  input: ReminderLoadInput,
): Promise<ReminderLoadResult> {
  const solarInputs = solarInputsFor(input.profile, input.bundle, input.postcode)
  if (!solarInputs) {
    return { ok: false, message: 'Loading rates and appliance ratings… Ask again in a moment.' }
  }

  let forecast
  try {
    forecast = await fetchSolarForecast(solarInputs)
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : 'Could not load the solar forecast.'
    return { ok: false, message: detail }
  }

  const typicalDailyKwh =
    solarInputs.systemKw *
    input.bundle.methodology.melbournePeakSunHours *
    input.bundle.methodology.solarPerformanceRatio *
    solarInputs.orientationFactor

  const periodDays = Number.parseInt(input.reminderPeriodDays, 10)
  const dailyPoints = pointsForView(forecast, 'fortnightly').slice(0, periodDays)

  const reservePercent = clampNumber(
    Number.parseInt(input.profile.reservePercent || DEFAULT_RESERVE_PERCENT, 10),
    FIELD_BOUNDS.reservePercent.min,
    FIELD_BOUNDS.reservePercent.max,
  )

  const recommendations = buildReminderRecommendations(
    dailyPoints,
    typicalDailyKwh,
    input.eventType,
    reservePercent,
  )

  return { ok: true, recommendations, eventType: input.eventType }
}

/**
 * formatReminderDaysReply
 * @param recommendations - Qualifying days from loadReminderRecommendations
 * @param eventType - Discharge or opt-out list shown on Reminders
 * @returns Sentences for the chat transcript
 */
export function formatReminderDaysReply(
  recommendations: ReminderRecommendation[],
  eventType: EventType,
  reservePercent: number,
): string {
  if (!recommendations.length) {
    return emptyStateMessage(eventType, reservePercent)
  }
  const lines = recommendations.map(
    (entry) => `${entry.dayLabel}: ${formatKwh(entry.forecastKwh)} forecast`,
  )
  return `Reminder days (${eventType === 'discharge' ? 'join' : 'opt out'}): ${lines.join('; ')}.`
}
