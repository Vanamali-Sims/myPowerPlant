/**
 * Persists which onboarding path the user chose (Matt vs Rain).
 * Does not touch profileStorage — only this key and small helpers.
 */
import { JOURNEY_STORAGE_KEY } from '../constants/storage'

export type UserJourney = 'matt' | 'rain'

export function loadJourney(): UserJourney | null {
  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY)
    if (raw === 'matt' || raw === 'rain') return raw
    return null
  } catch {
    return null
  }
}

export function saveJourney(journey: UserJourney): void {
  localStorage.setItem(JOURNEY_STORAGE_KEY, journey)
}

export function clearJourney(): void {
  localStorage.removeItem(JOURNEY_STORAGE_KEY)
}
