/**
 * Per-step validation for the household setup wizard and profile editor.
 *
 * Bounds and the Victorian postcode rule live in constants/validation so the
 * form UI and this file cannot drift apart.
 */
import { STEP_FIELDS } from '../constants/setup'
import { FIELD_BOUNDS, VIC_POSTCODE } from '../constants/validation'
import { isAllowedBatteryModel, isAllowedProvider } from '../data/profileOptions'
import type { ProfileData, SetupStepId } from '../types/profile'

const FIELD_TO_STEP: Partial<Record<keyof ProfileData, SetupStepId>> = {}
for (const [step, fields] of Object.entries(STEP_FIELDS) as [SetupStepId, (keyof ProfileData)[]][]) {
  for (const field of fields) {
    FIELD_TO_STEP[field] = step
  }
}

export type FieldErrors = Partial<Record<keyof ProfileData, string>> & { billUpload?: string }

function required(value: string, message: string): string | undefined {
  if (!value.trim()) return message
  return undefined
}

/**
 * isVictorianPostcode
 * @param postcode - Raw postcode string from the form
 * @returns True when the value is a 4-digit Victorian postcode
 *
 * Victoria uses 3xxx and 8xxx ranges, so the shared regex starts with 3 or 8.
 * Used by the wizard and by device geolocation before we accept a result.
 */
export function isVictorianPostcode(postcode: string): boolean {
  return VIC_POSTCODE.test(postcode.trim())
}

/**
 * validateStep
 * @param step - Wizard step being checked
 * @param profile - Current household answers
 * @returns Field-keyed error messages; empty object if the step is valid
 *
 * Checks only the fields that belong to this step.
 * Bounds and the Victorian postcode rule come from constants/validation.
 */
export function validateStep(
  step: SetupStepId,
  profile: ProfileData,
): FieldErrors {
  const errors: FieldErrors = {}

  if (step === 'household') {
    if (!profile.postcode.trim()) {
      errors.postcode = 'Please enter a valid Victorian postcode (4 digits).'
    } else if (!isVictorianPostcode(profile.postcode)) {
      errors.postcode = 'Please enter a valid Victorian postcode (4 digits).'
    }
    if (!profile.people.trim()) {
      errors.people = 'Please enter how many people live in your house.'
    } else if (!isPositiveNumber(profile.people, FIELD_BOUNDS.people.min, FIELD_BOUNDS.people.max)) {
      errors.people = `Enter a number between ${FIELD_BOUNDS.people.min} and ${FIELD_BOUNDS.people.max}. Example: ${FIELD_BOUNDS.people.example}`
    }
    if (!profile.rooms.trim()) {
      errors.rooms = 'Please enter how many rooms you have.'
    } else if (!isPositiveNumber(profile.rooms, FIELD_BOUNDS.rooms.min, FIELD_BOUNDS.rooms.max)) {
      errors.rooms = `Enter a number between ${FIELD_BOUNDS.rooms.min} and ${FIELD_BOUNDS.rooms.max}. Example: ${FIELD_BOUNDS.rooms.example}`
    }
    const gas = required(profile.gas, 'Please tell us whether you have gas.')
    if (gas) errors.gas = gas
    if (!profile.refrigerators.trim()) {
      errors.refrigerators = 'Please enter how many refrigerators you own. Enter 0 if you have none.'
    } else if (
      !isPositiveNumber(profile.refrigerators, FIELD_BOUNDS.refrigerators.min, FIELD_BOUNDS.refrigerators.max)
    ) {
      errors.refrigerators = `Enter a number between ${FIELD_BOUNDS.refrigerators.min} and ${FIELD_BOUNDS.refrigerators.max}. Example: ${FIELD_BOUNDS.refrigerators.example}`
    }
    const tvHours = optionalNumberError(
      profile.tvHoursPerWeek,
      FIELD_BOUNDS.tvHoursPerWeek.min,
      FIELD_BOUNDS.tvHoursPerWeek.max,
      FIELD_BOUNDS.tvHoursPerWeek.example,
    )
    if (tvHours) errors.tvHoursPerWeek = tvHours
    const washerCycles = optionalNumberError(
      profile.washerCyclesPerWeek,
      FIELD_BOUNDS.washerCyclesPerWeek.min,
      FIELD_BOUNDS.washerCyclesPerWeek.max,
      FIELD_BOUNDS.washerCyclesPerWeek.example,
    )
    if (washerCycles) errors.washerCyclesPerWeek = washerCycles
    const dishwasherCycles = optionalNumberError(
      profile.dishwasherCyclesPerWeek,
      FIELD_BOUNDS.dishwasherCyclesPerWeek.min,
      FIELD_BOUNDS.dishwasherCyclesPerWeek.max,
      FIELD_BOUNDS.dishwasherCyclesPerWeek.example,
    )
    if (dishwasherCycles) errors.dishwasherCyclesPerWeek = dishwasherCycles
    const dryer = required(profile.dryer, 'Please tell us whether you have a clothes dryer.')
    if (dryer) errors.dryer = dryer
    if (profile.dryer === 'yes') {
      if (!profile.dryerWeek.trim()) {
        errors.dryerWeek = 'Please enter weekday dryer use.'
      } else if (
        !isPositiveNumber(profile.dryerWeek, FIELD_BOUNDS.dryerWeek.min, FIELD_BOUNDS.dryerWeek.max)
      ) {
        errors.dryerWeek = `Enter a number between ${FIELD_BOUNDS.dryerWeek.min} and ${FIELD_BOUNDS.dryerWeek.max}. Example: ${FIELD_BOUNDS.dryerWeek.example}`
      }
      if (!profile.dryerWeekend.trim()) {
        errors.dryerWeekend = 'Please enter weekend dryer use.'
      } else if (
        !isPositiveNumber(
          profile.dryerWeekend,
          FIELD_BOUNDS.dryerWeekend.min,
          FIELD_BOUNDS.dryerWeekend.max,
        )
      ) {
        errors.dryerWeekend = `Enter a number between ${FIELD_BOUNDS.dryerWeekend.min} and ${FIELD_BOUNDS.dryerWeekend.max}. Example: ${FIELD_BOUNDS.dryerWeekend.example}`
      }
    }
    const heating = required(profile.heating, 'Please select how you heat your home.')
    if (heating) errors.heating = heating
    const cooling = required(profile.cooling, 'Please select how you cool your home.')
    if (cooling) errors.cooling = cooling
    if (profile.cooling === 'air_conditioning') {
      const aircon = optionalNumberError(
        profile.airconHoursPerWeek,
        FIELD_BOUNDS.airconHoursPerWeek.min,
        FIELD_BOUNDS.airconHoursPerWeek.max,
        FIELD_BOUNDS.airconHoursPerWeek.example,
      )
      if (aircon) errors.airconHoursPerWeek = aircon
    }
    const hotWater = required(
      profile.hotWater,
      'Please tell us whether you have a hot water system.',
    )
    if (hotWater) errors.hotWater = hotWater
  }

  if (step === 'usage') {
    if (!profile.monthlyBill.trim()) {
      errors.monthlyBill = 'Please enter your average monthly electricity bill.'
    } else if (
      !isPositiveNumber(
        profile.monthlyBill,
        FIELD_BOUNDS.monthlyBill.min,
        FIELD_BOUNDS.monthlyBill.max,
      )
    ) {
      errors.monthlyBill = `Enter a typical monthly amount, for example ${FIELD_BOUNDS.monthlyBill.example}.`
    }
    const peak = required(
      profile.peakPeriod,
      'Please select when you use the most energy.',
    )
    if (peak) errors.peakPeriod = peak
    const level = required(profile.usageLevel, 'Please describe your energy usage.')
    if (level) errors.usageLevel = level
    const wfh = required(
      profile.wfh,
      'Please tell us whether anyone works or studies from home.',
    )
    if (wfh) errors.wfh = wfh
  }

  if (step === 'solar') {
    const hasSolar = required(
      profile.hasSolar,
      'Please tell us whether you have solar panels.',
    )
    if (hasSolar) errors.hasSolar = hasSolar
    if (profile.hasSolar === 'yes') {
      const direction = required(
        profile.solarDirection,
        'Please select the direction your panels face, or Not sure.',
      )
      if (direction) errors.solarDirection = direction
      if (!profile.panelCount.trim()) {
        errors.panelCount = 'Please enter how many solar panels you have.'
      } else if (
        !isPositiveNumber(
          profile.panelCount,
          FIELD_BOUNDS.panelCount.min,
          FIELD_BOUNDS.panelCount.max,
        )
      ) {
        errors.panelCount = `Enter a number of panels between ${FIELD_BOUNDS.panelCount.min} and ${FIELD_BOUNDS.panelCount.max}. Example: ${FIELD_BOUNDS.panelCount.example}`
      }
      if (!profile.panelWatts.trim()) {
        errors.panelWatts = 'Please enter a valid average power rating.'
      } else if (
        !isPositiveNumber(
          profile.panelWatts,
          FIELD_BOUNDS.panelWatts.min,
          FIELD_BOUNDS.panelWatts.max,
        )
      ) {
        errors.panelWatts = `Enter a value between ${FIELD_BOUNDS.panelWatts.min} W and ${FIELD_BOUNDS.panelWatts.max} W. Example: ${FIELD_BOUNDS.panelWatts.example}`
      }
    }
  }

  if (step === 'battery') {
    if (
      profile.batteryUnits < FIELD_BOUNDS.batteryUnits.min ||
      profile.batteryUnits > FIELD_BOUNDS.batteryUnits.max
    ) {
      errors.batteryUnits = 'Enter the number of battery units at your property.'
    }
    if (!profile.reservePercent.trim()) {
      errors.reservePercent = 'Please enter the minimum battery level you want to keep.'
    } else if (
      !isPositiveNumber(
        profile.reservePercent,
        FIELD_BOUNDS.reservePercent.min,
        FIELD_BOUNDS.reservePercent.max,
      )
    ) {
      errors.reservePercent = `Enter a percentage between ${FIELD_BOUNDS.reservePercent.min} and ${FIELD_BOUNDS.reservePercent.max}. Example: ${FIELD_BOUNDS.reservePercent.example}`
    }
    const age = required(profile.batteryAge, 'Please enter the approximate age of your battery.')
    if (age) {
      errors.batteryAge = age
    } else if (
      !isPositiveNumber(
        profile.batteryAge,
        FIELD_BOUNDS.batteryAge.min,
        FIELD_BOUNDS.batteryAge.max,
      )
    ) {
      errors.batteryAge = `Enter the age in years, for example ${FIELD_BOUNDS.batteryAge.example}.`
    }
    if (!profile.batteryModel.trim()) {
      errors.batteryModel = 'Please select a model from the list, or choose Not sure.'
    } else if (!isAllowedBatteryModel(profile.batteryModel)) {
      errors.batteryModel =
        'Battery model not found. Please select a model from the list. If you can’t find your model, choose “Not sure”.'
    }
  }

  if (step === 'provider') {
    if (!profile.provider.trim()) {
      errors.provider = 'Please select your electricity provider, or choose Not sure.'
    } else if (!isAllowedProvider(profile.provider)) {
      errors.provider = 'Please select a provider from the list, or choose Not sure.'
    }
  }

  return errors
}

/**
 * validateProfileFields
 * @param profile - Household answers after a chat or setup patch
 * @param fields - Fields that changed
 * @returns Wizard-style errors for those fields only
 *
 * Used by chat profile edits and typed setup sentences so rejections match
 * the form.
 */
export function validateProfileFields(
  profile: ProfileData,
  fields: (keyof ProfileData)[],
): FieldErrors {
  const errors: FieldErrors = {}
  const steps = new Set<SetupStepId>()
  for (const field of fields) {
    const step = FIELD_TO_STEP[field]
    if (step) steps.add(step)
  }
  for (const step of steps) {
    const stepErrors = validateStep(step, profile)
    for (const field of fields) {
      if (stepErrors[field]) errors[field] = stepErrors[field]
    }
  }
  return errors
}

function isPositiveNumber(raw: string, min: number, max: number): boolean {
  const n = Number(raw)
  return Number.isFinite(n) && n >= min && n <= max
}

/**
 * optionalNumberError
 * @returns An error message, or undefined when blank (baseline applies) or in range
 *
 * These fields may be left blank to fall back to a published estimate, but a
 * value that is present must still be a real, sensible number — not silently
 * ignored — so a typo like "500" fridges cannot pass through unnoticed.
 */
function optionalNumberError(raw: string, min: number, max: number, example: number): string | undefined {
  if (!raw.trim()) return undefined
  if (!isPositiveNumber(raw, min, max)) {
    return `Enter a number between ${min} and ${max}, or leave blank for a typical estimate. Example: ${example}`
  }
  return undefined
}

/**
 * hasErrors
 * @param errors - Field error map from validateStep
 * @returns True when at least one field has a message
 *
 * Used by the wizard continue button and the profile save path.
 * An empty object means the current step (or whole profile) is ready.
 */
export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}
