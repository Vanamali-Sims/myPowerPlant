/**
 * Belt-and-suspenders check before merging bill facts into the profile.
 * Parsers should never populate these patterns; this blocks mistakes.
 */
import type { BillFacts } from './types'

const NMI_LIKE = /\b\d{10,11}\b/
const EMAIL = /@[a-z0-9.-]+\.[a-z]{2,}/i

function scan(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (NMI_LIKE.test(trimmed)) return false
  if (EMAIL.test(trimmed)) return false
  if (trimmed.length > 12) return false
  return true
}

export function assertSafeFacts(facts: BillFacts): boolean {
  return (
    scan(facts.postcode) &&
    scan(facts.monthlyKwh) &&
    scan(facts.monthlyBill) &&
    scan(facts.retailerLabel) &&
    facts.postcode.length === 4 &&
    !NMI_LIKE.test(facts.monthlyKwh) &&
    !NMI_LIKE.test(facts.monthlyBill)
  )
}
