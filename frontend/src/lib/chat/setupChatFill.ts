/**
 * Typed setup sentences via extractSlots (Epic 6.5.4).
 */
import type { ProfileData, SetupStepId } from '../../types/profile'
import { extractSlots } from '../voice/extract'
import { applyProfilePatch } from './applyProfilePatch'

export type SetupChatFillResult =
  | { kind: 'none' }
  | { kind: 'error'; message: string }
  | { kind: 'saved'; profile: ProfileData; message: string }

/**
 * trySetupChatFill
 * @param sentence - Raw chat line while the wizard is open
 * @param stepId - Current setup step (same scope as voice)
 * @param profile - In-progress answers
 */
export function trySetupChatFill(
  sentence: string,
  stepId: SetupStepId,
  profile: ProfileData,
): SetupChatFillResult {
  const { slots } = extractSlots(sentence, stepId)
  if (!slots.length) return { kind: 'none' }

  const patch: Partial<ProfileData> = {}
  for (const slot of slots) {
    Object.assign(patch, { [slot.field]: slot.value })
  }

  const result = applyProfilePatch(profile, patch)
  if (!result.ok) return { kind: 'error', message: result.message }

  const names = slots.map((slot) => slot.field.replace(/([A-Z])/g, ' $1').toLowerCase())
  return {
    kind: 'saved',
    profile: result.profile,
    message: `Filled ${names.join(', ')} from what you typed. ${result.message}`,
  }
}
