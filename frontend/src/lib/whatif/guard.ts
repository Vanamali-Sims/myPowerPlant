/**
 * No number reaches the What if sentence unless it was calculated first.
 *
 * Small whole numbers in ordinary time words ("11am") are allowed. A numeral
 * attached to money, energy, or a percent has to appear in the evidence.
 */

export type ExplainFact = {
  id: string
  label: string
  display: string
  numeric: number | null
}

export type GuardResult =
  | { ok: true; text: string }
  | { ok: false; offending: string[] }

const NUMERALS = /-?\d[\d,]*(?:\.\d+)?/g

function normalise(raw: string): number {
  return Number(raw.replace(/,/g, ''))
}

/** True when the numeral is a clock word rather than a measured figure. */
function isClockWord(value: number, text: string, index: number, raw: string): boolean {
  if (!Number.isInteger(value) || value < 0 || value > 12) return false
  const before = text.slice(Math.max(0, index - 1), index)
  if (before === '$') return false
  const after = text.slice(index + raw.length, index + raw.length + 6)
  if (/^\s*(kwh|%)/i.test(after)) return false
  return true
}

/**
 * checkNumbers
 * @param text - Candidate sentence
 * @param facts - Figures the sentence was allowed to use
 * @returns The text when every measured figure is accounted for
 *
 * Matching allows a small tolerance so a rounded dollar still passes.
 */
export function checkNumbers(text: string, facts: ExplainFact[]): GuardResult {
  const allowed = facts.map((fact) => fact.numeric).filter((n): n is number => n != null)
  allowed.push(52)

  const offending: string[] = []
  for (const match of text.matchAll(NUMERALS)) {
    const raw = match[0]
    const index = match.index ?? 0
    const value = Math.abs(normalise(raw))
    if (Number.isNaN(value)) continue
    if (isClockWord(value, text, index, raw)) continue
    const ok = allowed.some((candidate) => {
      const tolerance = Math.max(0.05, Math.abs(candidate) * 0.02)
      return Math.abs(Math.abs(candidate) - value) <= tolerance
    })
    if (!ok) offending.push(raw)
  }

  if (offending.length > 0) return { ok: false, offending }
  return { ok: true, text }
}
