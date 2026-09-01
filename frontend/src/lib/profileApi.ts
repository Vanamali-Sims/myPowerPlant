/**
 * Best-effort PUT of the household profile to the FastAPI backend.
 */
import { API_BASE_URL, API_PATHS } from '../constants/api'
import type { ProfileData } from '../types/profile'
import { getHouseholdId } from './householdId'

export type ApiResult = { ok: true } | { ok: false; error: string }

function toPayload(profile: ProfileData, householdId: string) {
  return {
    household_id: householdId,
    postcode: profile.postcode,
    people: profile.people,
    rooms: profile.rooms,
    gas: profile.gas,
    refrigerators: profile.refrigerators,
    dryer: profile.dryer,
    dryer_week: profile.dryerWeek,
    dryer_weekend: profile.dryerWeekend,
    heating: profile.heating,
    cooling: profile.cooling,
    hot_water: profile.hotWater,
    monthly_bill: profile.monthlyBill,
    monthly_kwh: profile.monthlyKwh,
    peak_period: profile.peakPeriod,
    usage_level: profile.usageLevel,
    wfh: profile.wfh,
    has_solar: profile.hasSolar,
    solar_direction: profile.solarDirection,
    panel_count: profile.panelCount,
    panel_watts: profile.panelWatts,
    battery_units: profile.batteryUnits,
    reserve_percent: profile.reservePercent,
    battery_age: profile.batteryAge,
    battery_model: profile.batteryModel,
    provider: profile.provider,
    field_sources: profile.fieldSources,
  }
}

/**
 * syncProfileToServer
 * @param profile - Household answers already saved locally
 * @returns ok: true on a 2xx response, or ok: false with a short error
 *
 * localStorage remains the source of truth; this only mirrors the profile.
 * Failures are non-fatal so a down API never blocks the wizard.
 */
export async function syncProfileToServer(profile: ProfileData): Promise<ApiResult> {
  if (!API_BASE_URL) {
    return { ok: false, error: 'VITE_API_BASE_URL is not set.' }
  }

  const householdId = getHouseholdId()

  try {
    const response = await fetch(`${API_BASE_URL}${API_PATHS.profile(householdId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(profile, householdId)),
    })
    if (!response.ok) {
      return { ok: false, error: `Request failed (${response.status})` }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach the API. Is the backend running?' }
  }
}
