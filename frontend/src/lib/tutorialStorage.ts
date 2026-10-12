/**
 * Remembers which flow tutorials were finished or skipped on this device.
 * Does not touch profileStorage — only this key and small helpers.
 */
import { TUTORIAL_STORAGE_KEY } from '../constants/storage'
import type { TutorialFlow } from '../constants/tutorials'

export type TutorialOutcome = 'done' | 'skipped'

export type TutorialSeen = Partial<Record<TutorialFlow, TutorialOutcome>>

const FLOWS: TutorialFlow[] = ['explore', 'improve']

function isOutcome(value: unknown): value is TutorialOutcome {
  return value === 'done' || value === 'skipped'
}

/**
 * loadTutorialSeen
 * @returns The flows whose tutorial has been finished or skipped; empty when missing or corrupt
 */
export function loadTutorialSeen(): TutorialSeen {
  try {
    const raw = localStorage.getItem(TUTORIAL_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const seen: TutorialSeen = {}
    for (const flow of FLOWS) {
      const value = (parsed as Record<string, unknown>)[flow]
      if (isOutcome(value)) seen[flow] = value
    }
    return seen
  } catch {
    return {}
  }
}

/**
 * markTutorialSeen
 * @returns The updated record, so callers can keep state in step with storage
 *
 * A failed write is ignored: the tutorial may show again, which is harmless.
 */
export function markTutorialSeen(flow: TutorialFlow, outcome: TutorialOutcome): TutorialSeen {
  const next = { ...loadTutorialSeen(), [flow]: outcome }
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage full or blocked; keep the in-memory record only.
  }
  return next
}

export function clearTutorialSeen(): void {
  localStorage.removeItem(TUTORIAL_STORAGE_KEY)
}
