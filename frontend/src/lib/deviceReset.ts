/**
 * Clears all MyPowerPlant data stored on this device (profile, goals,
 * downloaded reminders, journey). Does not use the backend.
 */
import { clearGoals } from './goals/goalsStorage'
import { clearJourney } from './journeyStorage'
import { clearStoredProfile } from './profileStorage'
import { clearReminders } from './reminderStorage'

export function clearAllDeviceData(): void {
  clearStoredProfile()
  clearGoals()
  clearReminders()
  clearJourney()
}
