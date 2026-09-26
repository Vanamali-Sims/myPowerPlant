/**
 * Profile screen values for chat (Epic 6.5.5).
 */
import { PROFILE_SECTIONS } from '../../constants/setup'
import type { ProfileData } from '../../types/profile'
import { displayValue, isBaseline } from '../formatProfile'

/**
 * buildProfileDisplayReply
 * @param profile - Saved household answers
 */
export function buildProfileDisplayReply(profile: ProfileData): string {
  const chunks: string[] = []
  for (const section of PROFILE_SECTIONS) {
    const lines: string[] = []
    for (const item of section.fields) {
      if (
        section.id === 'solar' &&
        item.field !== 'hasSolar' &&
        profile.hasSolar !== 'yes'
      ) {
        continue
      }
      let line = `${item.label}: ${displayValue(profile, item.field)}`
      if (isBaseline(profile, item.field)) line += ' (estimate)'
      lines.push(line)
    }
    if (lines.length) chunks.push(`${section.title}: ${lines.join('; ')}.`)
  }
  return chunks.join(' ')
}
