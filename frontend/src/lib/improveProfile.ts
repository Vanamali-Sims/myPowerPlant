/**
 * Questions and checks for the improve-setup flow ("Access features").
 *
 * The answers live in the same profile as the explore flow, so whichever flow
 * changed them last is what both see. Only the questions What if, Goals, and
 * Reminders need are asked here.
 */
import { FIELD_BOUNDS } from '../constants/validation'
import { isAllowedBatteryModel } from '../data/profileOptions'
import type { MethodologyBundle } from './methodologyApi'
import { emptyProfile, type ProfileData } from '../types/profile'
import { isVictorianPostcode, type FieldErrors } from './validateProfile'

export type ImproveStepId = 'home' | 'solar' | 'battery'

/** Fields per step. Required ones are checked in validateImproveStep. */
export const IMPROVE_STEP_FIELDS: Record<ImproveStepId, (keyof ProfileData)[]> = {
  home: ['vppProvider', 'postcode', 'people', 'monthlyKwh', 'monthlyBill'],
  solar: ['panelCount', 'panelWatts', 'solarDirection'],
  battery: ['batteryModel', 'batteryUnits', 'reservePercent'],
}

export const IMPROVE_STEP_IDS = Object.keys(IMPROVE_STEP_FIELDS) as ImproveStepId[]

/** The questions that must be answered before the features open. */
export const IMPROVE_REQUIRED_FIELDS: (keyof ProfileData)[] = [
  'vppProvider',
  'batteryModel',
  'panelCount',
  'solarDirection',
  'reservePercent',
  'people',
  'postcode',
  'monthlyKwh',
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
    if (!profile.vppProvider.trim()) errors.vppProvider = 'Please enter the VPP you have joined.'
    if (!isVictorianPostcode(profile.postcode)) {
      errors.postcode = 'Please enter a valid Victorian postcode (4 digits).'
    }
    if (!profile.people.trim()) {
      errors.people = 'Please enter how many people live in your house.'
    } else if (!inRange(profile.people, FIELD_BOUNDS.people)) {
      errors.people = rangeMessage(FIELD_BOUNDS.people)
    }
    if (!profile.monthlyKwh.trim()) {
      errors.monthlyKwh = 'Please enter your average electricity usage for a month, in kWh.'
    } else if (!inRange(profile.monthlyKwh, FIELD_BOUNDS.monthlyKwh)) {
      errors.monthlyKwh = rangeMessage(FIELD_BOUNDS.monthlyKwh, ' kWh')
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
 * saved, its answers stay and only the VPP (asked by this flow alone) is
 * cleared, so the improve form pre-fills from them again. Otherwise every
 * improve answer goes back to the blank form.
 */
export function resetImproveAnswers(profile: ProfileData): ProfileData {
  const blank = emptyProfile()
  const fields: (keyof ProfileData)[] = profile.lastUpdated
    ? ['vppProvider']
    : IMPROVE_STEP_IDS.flatMap((step) => IMPROVE_STEP_FIELDS[step])
  const next: ProfileData = { ...profile, fieldSources: { ...profile.fieldSources }, improveUpdated: null }
  for (const field of fields) {
    ;(next as Record<string, unknown>)[field] = blank[field]
    delete next.fieldSources[field]
  }
  if (!profile.lastUpdated) next.hasSolar = blank.hasSolar
  return next
}

/** True when every step passes, so What if, Goals, and Reminders can open. */
export function isImproveReady(profile: ProfileData): boolean {
  return IMPROVE_STEP_IDS.every((step) => !Object.keys(validateImproveStep(step, profile)).length)
}

/**
 * hasImproveAnswers
 * @param profile - Current answers
 * @returns True when any required question has an answer other than its blank-form default
 *
 * Used to choose between "Access features" (nothing yet) and "Complete
 * profile" (some answers, for example from the explore form). The reserve
 * starts at a default, so that alone does not count as an answer.
 */
export function hasImproveAnswers(profile: ProfileData): boolean {
  const blank = emptyProfile()
  return IMPROVE_REQUIRED_FIELDS.some((field) => {
    const value = profile[field]
    return typeof value === 'string' && value.trim() !== '' && value !== blank[field]
  })
}

/**
 * prefilledFromExplore
 * @param profile - Current answers
 * @returns True when the explore form saved answers and the improve form has not been saved yet
 *
 * The improve form then opens with those answers and says where they came from.
 */
export function prefilledFromExplore(profile: ProfileData): boolean {
  return Boolean(profile.lastUpdated) && !profile.improveUpdated && hasImproveAnswers(profile)
}

/**
 * finishImproveProfile
 * @param profile - Answers that passed every step
 * @returns The answers ready to save: solar on, and the asked fields marked as the person's own
 *
 * A panel count is required here, so the home has solar.
 */
export function finishImproveProfile(profile: ProfileData): ProfileData {
  const fieldSources = { ...profile.fieldSources }
  for (const step of IMPROVE_STEP_IDS) {
    for (const field of IMPROVE_STEP_FIELDS[step]) {
      const value = profile[field]
      if (typeof value === 'number' || (typeof value === 'string' && value.trim())) {
        fieldSources[field] = value === 'not_sure' || value === 'Not sure' ? 'baseline' : 'user'
      }
    }
  }
  return { ...profile, hasSolar: 'yes', fieldSources }
}
