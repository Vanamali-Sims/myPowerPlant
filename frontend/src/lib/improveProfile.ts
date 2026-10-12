/**
 * Questions and checks for the improve-setup flow ("Access features").
 *
 * The answers live in the same profile as the explore flow, so whichever flow
 * changed them last is what both see. Only the questions What if, Goals, and
 * Reminders need are asked here.
 */
import { IMPROVE_BILL_DISPLAY_FIELDS, hasConfirmedBillHome } from './bills/billProfile'
import { FIELD_BOUNDS } from '../constants/validation'
import { isAllowedBatteryModel } from '../data/profileOptions'
import type { MethodologyBundle } from './methodologyApi'
import { emptyProfile, type ProfileData } from '../types/profile'
import type { FieldErrors } from './validateProfile'

export type ImproveStepId = 'home' | 'solar' | 'battery'

/** Fields per step. Home is bill upload only; listed bill fields are for display on the profile. */
export const IMPROVE_STEP_FIELDS: Record<ImproveStepId, (keyof ProfileData)[]> = {
  home: [...IMPROVE_BILL_DISPLAY_FIELDS],
  solar: ['panelCount', 'panelWatts', 'solarDirection'],
  battery: ['batteryModel', 'batteryUnits', 'reservePercent'],
}

export const IMPROVE_STEP_IDS = Object.keys(IMPROVE_STEP_FIELDS) as ImproveStepId[]

/** Setup answers beyond the bill (solar, battery). VPP and people are asked on What if. */
export const IMPROVE_REQUIRED_FIELDS: (keyof ProfileData)[] = [
  'batteryModel',
  'panelCount',
  'solarDirection',
  'reservePercent',
]

function inRange(raw: string, bounds: { min: number; max: number }): boolean {
  const n = Number(raw)
  return Number.isFinite(n) && n >= bounds.min && n <= bounds.max
}

function rangeMessage(bounds: { min: number; max: number; example?: number }, unit = ''): string {
  const example = bounds.example === undefined ? '' : ` Example: ${bounds.example}${unit}`
  return `Enter a number between ${bounds.min}${unit} and ${bounds.max}${unit}.${example}`
}

/**
 * validateImproveStep
 * @param step - Form step being checked
 * @param profile - Current answers
 * @returns Field-keyed error messages; empty when the step is valid
 *
 * Monthly bill, panel rating, and battery units are optional. When given they
 * must still be in range, the same bounds the explore form uses.
 */
export function validateImproveStep(step: ImproveStepId, profile: ProfileData): FieldErrors {
  const errors: FieldErrors = {}

  if (step === 'home') {
    if (!hasConfirmedBillHome(profile)) {
      errors.billUpload = 'Upload your electricity bill PDF and wait until we read it on this device.'
    }
    if (profile.monthlyBill.trim() && !inRange(profile.monthlyBill, FIELD_BOUNDS.monthlyBill)) {
      errors.monthlyBill = `Enter a typical monthly amount, for example ${FIELD_BOUNDS.monthlyBill.example}. Or leave it empty.`
    }
  }

  if (step === 'solar') {
    if (!profile.panelCount.trim()) {
      errors.panelCount = 'Please enter how many solar panels you have.'
    } else if (!inRange(profile.panelCount, FIELD_BOUNDS.panelCount)) {
      errors.panelCount = rangeMessage(FIELD_BOUNDS.panelCount)
    }
    if (!profile.solarDirection) {
      errors.solarDirection = 'Please select the direction your panels face, or Not sure.'
    }
    if (profile.panelWatts.trim() && !inRange(profile.panelWatts, FIELD_BOUNDS.panelWatts)) {
      errors.panelWatts = `${rangeMessage(FIELD_BOUNDS.panelWatts, ' W')} Or leave it empty.`
    }
  }

  if (step === 'battery') {
    if (!profile.batteryModel.trim()) {
      errors.batteryModel = 'Please select a model from the list, or choose Not sure.'
    } else if (!isAllowedBatteryModel(profile.batteryModel)) {
      errors.batteryModel = 'Please select a model from the list, or choose Not sure.'
    }
    if (!profile.reservePercent.trim()) {
      errors.reservePercent = 'Please enter the percentage of your battery you would like to keep.'
    } else if (!inRange(profile.reservePercent, FIELD_BOUNDS.reservePercent)) {
      errors.reservePercent = rangeMessage(FIELD_BOUNDS.reservePercent, '%')
    }
    if (
      profile.batteryUnits < FIELD_BOUNDS.batteryUnits.min ||
      profile.batteryUnits > FIELD_BOUNDS.batteryUnits.max
    ) {
      errors.batteryUnits = 'Enter the number of battery units at your property.'
    }
  }

  return errors
}

/** Bill plus the fields on the home and VPP onboarding card (step 1). */
export function validateHomeVppStep(profile: ProfileData): FieldErrors {
  const errors = validateImproveStep('home', profile)
  const solar = validateImproveStep('solar', profile)
  if (solar.panelCount) errors.panelCount = solar.panelCount
  if (solar.solarDirection) errors.solarDirection = solar.solarDirection
  const battery = validateImproveStep('battery', profile)
  if (battery.batteryModel) errors.batteryModel = battery.batteryModel
  if (battery.reservePercent) errors.reservePercent = battery.reservePercent
  if (battery.batteryUnits) errors.batteryUnits = battery.batteryUnits
  if (!profile.people.trim()) {
    errors.people = 'Please enter how many people live in your house.'
  } else {
    const n = Number(profile.people)
    if (!Number.isFinite(n) || n < FIELD_BOUNDS.people.min || n > FIELD_BOUNDS.people.max) {
      errors.people = `Enter a number between ${FIELD_BOUNDS.people.min} and ${FIELD_BOUNDS.people.max}. Example: ${FIELD_BOUNDS.people.example}`
    }
  }
  return errors
}

/** Choice for a VPP that is not on the Plans list. */
export const VPP_NOT_LISTED = 'Not listed'

/**
 * vppProviderOptions
 * @param bundle - Methodology data, or null while it loads
 * @returns The VPP brands the Plans page lists, A to Z, without repeats
 */
export function vppProviderOptions(bundle: MethodologyBundle | null): string[] {
  if (!bundle) return []
  const plans = bundle.vppSuggestionPlans.length ? bundle.vppSuggestionPlans : bundle.vppPlans
  return [...new Set(plans.map((plan) => plan.brand.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

/**
 * resetImproveAnswers
 * @param profile - Shared answers
 * @returns The answers with the improve flow undone
 *
 * Answers are shared with the explore flow. When the explore form has been
 * saved, its answers stay and only improve-owned fields are cleared.
 */
export function resetImproveAnswers(profile: ProfileData): ProfileData {
  const blank = emptyProfile()
  const fields: (keyof ProfileData)[] = profile.lastUpdated
    ? IMPROVE_BILL_DISPLAY_FIELDS.filter((field) => profile.fieldSources[field] === 'bill')
    : IMPROVE_STEP_IDS.flatMap((step) => IMPROVE_STEP_FIELDS[step])
  const next: ProfileData = { ...profile, fieldSources: { ...profile.fieldSources }, improveUpdated: null }
  for (const field of fields) {
    ;(next as Record<string, unknown>)[field] = blank[field]
    delete next.fieldSources[field]
  }
  if (!profile.lastUpdated) next.hasSolar = blank.hasSolar
  return next
}

/** True when the home and VPP setup screen is complete, so features can open. */
export function isImproveReady(profile: ProfileData): boolean {
  return (
    Boolean(profile.improveUpdated) &&
    !Object.keys(validateHomeVppStep(profile)).length
  )
}

/**
 * hasImproveAnswers
 * @param profile - Current answers
 * @returns True when any required question has an answer other than its blank-form default
 */
export function hasImproveAnswers(profile: ProfileData): boolean {
  const blank = emptyProfile()
  return (
    hasConfirmedBillHome(profile) ||
    IMPROVE_REQUIRED_FIELDS.some((field) => {
      const value = profile[field]
      return typeof value === 'string' && value.trim() !== '' && value !== blank[field]
    })
  )
}

/**
 * prefilledFromExplore
 * @param profile - Current answers
 * @returns True when the explore form saved answers and the improve form has not been saved yet
 */
export function prefilledFromExplore(profile: ProfileData): boolean {
  return Boolean(profile.lastUpdated) && !profile.improveUpdated && hasImproveAnswers(profile)
}

/**
 * finishImproveProfile
 * @param profile - Answers that passed every step
 * @returns The answers ready to save: solar on, and the asked fields marked as the person's own
 */
export function finishImproveProfile(profile: ProfileData): ProfileData {
  const fieldSources = { ...profile.fieldSources }
  for (const step of IMPROVE_STEP_IDS) {
    for (const field of IMPROVE_STEP_FIELDS[step]) {
      const value = profile[field]
      if (typeof value === 'number' || (typeof value === 'string' && value.trim())) {
        const existing = fieldSources[field]
        fieldSources[field] =
          value === 'not_sure' || value === 'Not sure'
            ? 'baseline'
            : existing === 'bill'
              ? 'bill'
              : 'user'
      }
    }
  }
  return { ...profile, hasSolar: 'yes', fieldSources }
}

/** One unit on the home step progress bar (bill confirmed). */
export function improveHomeStepAnswered(profile: ProfileData): number {
  return hasConfirmedBillHome(profile) ? 1 : 0
}

/** Total field units across improve setup steps (home counts as 1 for the bill). */
export function improveSetupFieldUnits(): number {
  return (
    1 +
    IMPROVE_STEP_FIELDS.solar.length +
    IMPROVE_STEP_FIELDS.battery.length
  )
}

/** Answered field units for the improve setup progress bar. */
export function improveSetupAnswered(profile: ProfileData): number {
  let count = improveHomeStepAnswered(profile)
  for (const step of ['solar', 'battery'] as ImproveStepId[]) {
    for (const field of IMPROVE_STEP_FIELDS[step]) {
      const value = profile[field]
      if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) {
        count += 1
      }
    }
  }
  return count
}
