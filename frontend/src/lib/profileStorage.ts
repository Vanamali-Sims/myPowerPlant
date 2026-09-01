/**
 * localStorage persistence for the household profile.
 *
 * The device copy is the source of truth for the UI. Server sync is best-effort
 * and must not block load or save.
 */
import { PROFILE_STORAGE_KEY } from '../constants/storage'
import { emptyProfile, type ProfileData } from '../types/profile'

/**
 * loadProfile
 * @returns Saved profile, or an empty profile when nothing is stored
 *
 * Merges stored JSON onto emptyProfile so older saves still get new fields.
 * Corrupt JSON is treated as a missing profile rather than crashing the app.
 */
export function loadProfile(): ProfileData {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return emptyProfile()
    const parsed = JSON.parse(raw) as Partial<ProfileData>
    return { ...emptyProfile(), ...parsed, fieldSources: parsed.fieldSources ?? {} }
  } catch {
    return emptyProfile()
  }
}

/**
 * saveProfile
 * @param profile - Household answers to persist
 * @returns The same profile with lastUpdated set to now
 *
 * Stamps lastUpdated so the dashboard and profile screen can show when the
 * answers were last confirmed on this device.
 */
export function saveProfile(profile: ProfileData): ProfileData {
  const next = { ...profile, lastUpdated: new Date().toISOString() }
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next))
  return next
}

/**
 * clearStoredProfile
 * @returns void
 *
 * Removes the saved profile key only. Household id is kept so a new profile
 * still updates the same backend row after a reset.
 */
export function clearStoredProfile(): void {
  localStorage.removeItem(PROFILE_STORAGE_KEY)
}
