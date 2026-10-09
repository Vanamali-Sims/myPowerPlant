/**
 * Clears all MyPowerPlant data stored on this device (profile, goals, journey).
 * Does not use the backend.
 */
import { clearGoals } from './goals/goalsStorage'
import { clearJourney } from './journeyStorage'
import { clearStoredProfile } from './profileStorage'

export function clearAllDeviceData(): void {
  clearStoredProfile()
  clearGoals()
  clearJourney()
}
