/**
 * Typical Kew household used when the user skips a step or chooses “Not sure”.
 */
import { STEP_FIELDS } from '../constants/setup'
import { NOT_SURE_VALUE } from './profileOptions'
import type { ProfileData, SetupStepId } from '../types/profile'

/** Typical Kew household used when the user skips a step or chooses “Not sure”. */
export const BASELINE_PROFILE: Omit<ProfileData, 'fieldSources' | 'lastUpdated' | 'improveUpdated'> =
  {
    postcode: '3101',
    people: '3',
    rooms: '6',
    gas: 'yes',
    refrigerators: '2',
    tvHoursPerWeek: '',
    washerCyclesPerWeek: '',
    dishwasherCyclesPerWeek: '',
    dryer: 'yes',
    dryerWeek: '2',
    dryerWeekend: '1',
    heating: 'gas',
    cooling: 'air_conditioning',
    airconHoursPerWeek: '',
    hotWater: 'yes',
    monthlyBill: '180',
    monthlyKwh: '540',
    peakPeriod: 'evening',
    usageLevel: 'moderate',
    wfh: 'yes',
    hasSolar: 'yes',
    solarDirection: 'S',
    panelCount: '12',
    panelWatts: '400',
    batteryUnits: 1,
    reservePercent: '20',
    batteryAge: '2',
    batteryModel: 'Tesla Powerwall 2',
    provider: 'AGL Energy',
    // No typical VPP: the improve flow asks for it and it has no skip.
    vppProvider: '',
  }

/**
 * applyBaseline
 * @param profile - Current answers
 * @param step - Wizard step being skipped
 * @returns Profile with that step’s fields filled from BASELINE_PROFILE
 *
 * Marks each filled field as baseline so the UI can show an Estimate badge.
 * Other steps are left untouched.
 */
export function applyBaseline(
  profile: ProfileData,
  step: SetupStepId,
): ProfileData {
  const next: ProfileData = { ...profile, fieldSources: { ...profile.fieldSources } }
  for (const field of STEP_FIELDS[step]) {
    if (field === 'fieldSources' || field === 'lastUpdated' || field === 'improveUpdated') continue
    const value = BASELINE_PROFILE[field]
    ;(next[field] as typeof value) = value
    next.fieldSources[field] = 'baseline'
  }
  return next
}

/**
 * markUserFields
 * @param profile - Current answers
 * @param fields - Fields the user just confirmed on this step
 * @returns Profile with those fields tagged user or baseline
 *
 * “Not sure” and not_sure still count as baseline so estimates stay labelled.
 * Called when the user continues a step rather than skipping it.
 */
export function markUserFields(
  profile: ProfileData,
  fields: (keyof ProfileData)[],
): ProfileData {
  const fieldSources = { ...profile.fieldSources }
  for (const field of fields) {
    if (field === 'fieldSources' || field === 'lastUpdated') continue
    const value = profile[field]
    const unsure =
      value === 'not_sure' || value === NOT_SURE_VALUE
    fieldSources[field] = unsure ? 'baseline' : 'user'
  }
  return { ...profile, fieldSources }
}
