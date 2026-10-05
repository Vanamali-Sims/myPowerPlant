/**
 * Household What if drafts: detect edits that differ from the saved profile.
 */
import type { ProfileData } from '../../types/profile'

/** True when the user has edited a field away from the saved profile value. */
export function hasHouseholdDraftChanges(
  profile: ProfileData,
  peopleDraft: string,
  dishwasherDraft: string,
  washerDraft: string,
): boolean {
  const changed = (draft: string, saved: string) =>
    draft.trim() !== '' && draft.trim() !== saved.trim()
  return (
    changed(peopleDraft, profile.people) ||
    changed(dishwasherDraft, profile.dishwasherCyclesPerWeek) ||
    changed(washerDraft, profile.washerCyclesPerWeek)
  )
}
