import type { ProfileData, SetupStepId } from '../types/profile'

/** Typical Kew household used when the user skips a step or chooses “Not sure”. */
export const BASELINE_PROFILE: Omit<ProfileData, 'fieldSources' | 'lastUpdated'> =
  {
    postcode: '3101',
    people: '3',
    rooms: '6',
    gas: 'yes',
    refrigerators: '2',
    dryer: 'yes',
    dryerWeek: '2',
    dryerWeekend: '1',
    heating: 'gas',
    cooling: 'air_conditioning',
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
  }

const stepFields: Record<SetupStepId, (keyof ProfileData)[]> = {
  household: [
    'postcode',
    'people',
    'rooms',
    'gas',
    'refrigerators',
    'dryer',
    'dryerWeek',
    'dryerWeekend',
    'heating',
    'cooling',
    'hotWater',
  ],
  usage: ['monthlyBill', 'monthlyKwh', 'peakPeriod', 'usageLevel', 'wfh'],
  solar: ['hasSolar', 'solarDirection', 'panelCount', 'panelWatts'],
  battery: ['batteryUnits', 'reservePercent', 'batteryAge', 'batteryModel'],
  provider: ['provider'],
}

export function applyBaseline(
  profile: ProfileData,
  step: SetupStepId,
): ProfileData {
  const next: ProfileData = { ...profile, fieldSources: { ...profile.fieldSources } }
  for (const field of stepFields[step]) {
    if (field === 'fieldSources' || field === 'lastUpdated') continue
    const value = BASELINE_PROFILE[field]
    ;(next[field] as typeof value) = value
    next.fieldSources[field] = 'baseline'
  }
  return next
}

export function markUserFields(
  profile: ProfileData,
  fields: (keyof ProfileData)[],
): ProfileData {
  const fieldSources = { ...profile.fieldSources }
  for (const field of fields) {
    if (field === 'fieldSources' || field === 'lastUpdated') continue
    const value = profile[field]
    const unsure =
      value === 'not_sure' || value === 'Not sure'
    fieldSources[field] = unsure ? 'baseline' : 'user'
  }
  return { ...profile, fieldSources }
}
