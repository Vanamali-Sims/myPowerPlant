import type { ProfileData } from '../../types/profile'
import { isVictorianPostcode } from '../validateProfile'

/** Postcode and usage on the improve home step were confirmed from a bill upload. */
export function hasConfirmedBillHome(profile: ProfileData): boolean {
  const sources = profile.fieldSources
  return (
    sources.postcode === 'bill' &&
    sources.monthlyKwh === 'bill' &&
    isVictorianPostcode(profile.postcode) &&
    profile.monthlyKwh.trim() !== ''
  )
}

export const IMPROVE_BILL_DISPLAY_FIELDS: (keyof ProfileData)[] = [
  'postcode',
  'monthlyKwh',
  'monthlyBill',
  'provider',
]
