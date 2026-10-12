/**
 * Guess which provider a battery file came from.
 *
 * Tesla and Amber files use the same template layout, so nothing inside the
 * file tells them apart. The file name is the only clue; when it names neither,
 * the person is asked.
 */
import type { BatterySourceId } from '../../constants/batterySources'

export function detectSource(fileName: string): BatterySourceId | null {
  const name = fileName.toLowerCase()
  const tesla = name.includes('tesla') || name.includes('powerwall')
  const amber = name.includes('amber')
  if (tesla === amber) return null
  return tesla ? 'tesla' : 'amber'
}
