/**
 * Read a chosen battery file in the browser with the File API.
 *
 * The file is never uploaded: its text is read here, passed to the reader for
 * the chosen source, and dropped when the caller lets go of the result.
 */
import { MAX_FILE_BYTES, type BatterySourceId } from '../../constants/batterySources'
import { getAdapter } from './adapters'
import type { ReadLimits, ReadResult } from './adapters/types'
import { detectSource } from './detectSource'

const SOURCE_TRY_ORDER: BatterySourceId[] = ['tesla', 'amber']

/**
 * checkFile
 * @param file - The File chosen or dropped
 * @returns A reason the file cannot be read, or null when it may be read
 *
 * Runs before any reading, using only the name and size.
 */
export function checkFile(file: Pick<File, 'name' | 'size'>): ReadResult | null {
  if (!/\.csv$/i.test(file.name)) return { ok: false, reason: 'not_csv' }
  if (file.size === 0) return { ok: false, reason: 'empty_file' }
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'file_too_large' }
  return null
}

/**
 * readBatteryFile
 * @param file - The File chosen or dropped
 * @param sourceId - The source Matt chose from the list (never auto-detected)
 * @param limits - Validity limits for energy values
 * @returns Days in the common format, or the reason the file was not read
 */
export async function readBatteryFile(
  file: File,
  sourceId: BatterySourceId,
  limits: ReadLimits,
): Promise<ReadResult> {
  const adapter = getAdapter(sourceId)
  if (!adapter) return { ok: false, reason: 'source_not_supported' }
  const early = checkFile(file)
  if (early) return early
  let text: string
  try {
    text = await file.text()
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  if (text.includes('\u0000')) return { ok: false, reason: 'unreadable' }
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  if (!body.trim()) return { ok: false, reason: 'empty_file' }
  return adapter(text, limits, sourceId)
}

/**
 * readBatteryFileAuto
 * @returns The first successful read, trying a filename hint then each known reader
 *
 * Tesla and Amber exports share the same template today; the person is not asked
 * to pick a brand.
 */
export async function readBatteryFileAuto(file: File, limits: ReadLimits): Promise<ReadResult> {
  const order: BatterySourceId[] = []
  const guess = detectSource(file.name)
  if (guess) order.push(guess)
  for (const id of SOURCE_TRY_ORDER) {
    if (!order.includes(id)) order.push(id)
  }
  let last: ReadResult | null = null
  for (const sourceId of order) {
    const result = await readBatteryFile(file, sourceId, limits)
    if (result.ok) return result
    last = result
  }
  return last ?? { ok: false, reason: 'malformed_csv' }
}
