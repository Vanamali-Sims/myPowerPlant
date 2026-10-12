import type { ProfileData } from '../../types/profile'
import type { BillFacts } from './types'

const BILL_FIELDS: (keyof ProfileData)[] = ['postcode', 'monthlyKwh', 'monthlyBill', 'provider']

/**
 * Merge confirmed bill facts into the shared profile. VPP, people, and solar/battery are unchanged.
 */
export function applyBillToProfile(profile: ProfileData, facts: BillFacts): ProfileData {
  const fieldSources = { ...profile.fieldSources }
  for (const field of BILL_FIELDS) {
    fieldSources[field] = 'bill'
  }
  return {
    ...profile,
    postcode: facts.postcode,
    monthlyKwh: facts.monthlyKwh,
    monthlyBill: facts.monthlyBill,
    provider: facts.retailerLabel,
    fieldSources,
  }
}
