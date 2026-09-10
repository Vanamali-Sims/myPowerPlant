/**
 * Storage for the household identifier.
 *
 * The identifier is issued by the server (POST /api/profile) and is the only
 * way a stored profile can be addressed. Security Plan S6.1 requires it be
 * "generated server-side and never derived from user input", so this module
 * only persists what the server returned - it never mints one.
 */
const STORAGE_KEY = 'mypowerplant.household_id'

/** A server-issued UUIDv4, or null if this device has never synced. */
export function readHouseholdId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeHouseholdId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Private browsing or blocked storage. The profile still works locally;
    // it just re-registers with the server next time.
  }
}

export function clearHouseholdId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to do
  }
}
