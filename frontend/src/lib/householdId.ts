/**
 * Anonymous household id stored in localStorage for backend profile sync.
 *
 * Created once per browser so later PUT /api/profile calls update the same row
 * without asking the user to sign in.
 */
import { HOUSEHOLD_ID_KEY } from '../constants/storage'

/**
 * getHouseholdId
 * @returns Stable UUID for this browser
 *
 * Reuses the stored id when present so a returning visitor maps to one row.
 * Generates a new UUID only on the first visit to this origin.
 */
export function getHouseholdId(): string {
  let id = localStorage.getItem(HOUSEHOLD_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(HOUSEHOLD_ID_KEY, id)
  }
  return id
}
