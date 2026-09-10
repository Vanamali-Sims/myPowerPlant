import type { ProfileData } from '../types/profile'
import { clearHouseholdId, readHouseholdId, storeHouseholdId } from './householdId'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export type ApiResult = { ok: true } | { ok: false; error: string }

function toPayload(profile: ProfileData) {
  return {
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

function describe(status: number): string {
  if (status === 429) return 'Too many updates for now. Please try again later.'
  if (status === 422) return 'The server rejected some values.'
  if (status === 503) return 'The server is temporarily unavailable.'
  return `Request failed (${status}).`
}

/** Register a new profile and remember the identifier the server issues. */
async function createOnServer(profile: ProfileData): Promise<ApiResult> {
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(profile)),
  })
  if (!response.ok) return { ok: false, error: describe(response.status) }
  const body = (await response.json()) as { household_id?: string }
  if (!body.household_id) return { ok: false, error: 'Server did not return an identifier.' }
  storeHouseholdId(body.household_id)
  return { ok: true }
}

/**
 * Best-effort sync to the backend. localStorage remains the source of truth
 * for the app itself - this mirrors the profile server-side so it's available
 * for dashboard calculations later. Failures are non-fatal.
 *
 * The identifier is issued by the server, so the first sync POSTs and every
 * later one PUTs. A stored identifier the server doesn't recognise (a profile
 * purged under the retention policy, or one minted by an older build that
 * generated UUIDs client-side) falls back to registering afresh.
 */
export async function syncProfileToServer(profile: ProfileData): Promise<ApiResult> {
  if (!API_BASE_URL) {
    return { ok: false, error: 'VITE_API_BASE_URL is not set.' }
  }

  try {
    const householdId = readHouseholdId()
    if (!householdId) return await createOnServer(profile)

    const response = await fetch(`${API_BASE_URL}/api/profile/${householdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(profile)),
    })
    if (response.ok) return { ok: true }

    if (response.status === 404) {
      clearHouseholdId()
      return await createOnServer(profile)
    }
    return { ok: false, error: describe(response.status) }
  } catch {
    return { ok: false, error: 'Could not reach the API. Is the backend running?' }
  }
}
