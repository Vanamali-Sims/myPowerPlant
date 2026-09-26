/**
 * Merge, validate, and describe chat-driven profile edits (Epic 6.5.1).
 */
import { PROFILE_SECTIONS } from '../../constants/setup'
import type { ProfileData } from '../../types/profile'
import { displayValue } from '../formatProfile'
import { hasErrors, validateProfileFields, type FieldErrors } from '../validateProfile'

export type ProfilePatchResult =
  | { ok: true; profile: ProfileData; message: string }
  | { ok: false; message: string; errors: FieldErrors }

function mergePatch(profile: ProfileData, patch: Partial<ProfileData>): ProfileData {
  const next: ProfileData = {
    ...profile,
    ...patch,
    fieldSources: { ...profile.fieldSources },
  }
  for (const key of Object.keys(patch) as (keyof ProfileData)[]) {
    next.fieldSources[key] = 'user'
  }
  if (patch.hasSolar === 'no') {
    next.solarDirection = ''
    next.panelCount = ''
    next.panelWatts = ''
  }
  return next
}

function labelFor(field: keyof ProfileData): string {
  for (const section of PROFILE_SECTIONS) {
    const match = section.fields.find((item) => item.field === field)
    if (match) return match.label
  }
  return String(field)
}

/**
 * applyProfilePatch
 * @param profile - Current household answers
 * @param patch - Parsed fields from chat
 */
export function applyProfilePatch(
  profile: ProfileData,
  patch: Partial<ProfileData>,
): ProfilePatchResult {
  const fields = Object.keys(patch) as (keyof ProfileData)[]
  const merged = mergePatch(profile, patch)
  const errors = validateProfileFields(merged, fields)
  if (hasErrors(errors)) {
    const firstField = fields.find((field) => errors[field]) ?? fields[0]!
    return {
      ok: false,
      errors,
      message: errors[firstField] ?? 'That value could not be saved.',
    }
  }
  const lines = fields.map(
    (field) => `${labelFor(field)}: ${displayValue(merged, field)}.`,
  )
  return {
    ok: true,
    profile: merged,
    message: `Saved on this device. ${lines.join(' ')}`,
  }
}
