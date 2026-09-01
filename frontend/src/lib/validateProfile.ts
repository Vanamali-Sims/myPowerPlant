/**
 * Per-step validation for the household setup wizard and profile editor.
 *
 * Bounds and the Victorian postcode rule live in constants/validation so the
 * form UI and this file cannot drift apart.
 */
import { FIELD_BOUNDS, VIC_POSTCODE } from '../constants/validation'
import {
  batteryModels,
  energyProviders,
  NOT_SURE_VALUE,
  OTHER_VALUE,
} from '../data/profileOptions'
import type { ProfileData, SetupStepId } from '../types/profile'

export type FieldErrors = Partial<Record<keyof ProfileData, string>>

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
    const people = required(profile.people, 'Please select how many people live in your house.')
    if (people) errors.people = people
    const rooms = required(profile.rooms, 'Please select how many rooms you have.')
    if (rooms) errors.rooms = rooms
    const gas = required(profile.gas, 'Please tell us whether you have gas.')
    if (gas) errors.gas = gas
    const fridges = required(
      profile.refrigerators,
      'Please select how many refrigerators you own.',
    )
    if (fridges) errors.refrigerators = fridges
    const dryer = required(profile.dryer, 'Please tell us whether you have a clothes dryer.')
    if (dryer) errors.dryer = dryer
    if (profile.dryer === 'yes') {
      const week = required(profile.dryerWeek, 'Please enter weekday dryer use.')
      if (week) errors.dryerWeek = week
      const weekend = required(profile.dryerWeekend, 'Please enter weekend dryer use.')
      if (weekend) errors.dryerWeekend = weekend
    }
    const heating = required(profile.heating, 'Please select how you heat your home.')
    if (heating) errors.heating = heating
    const cooling = required(profile.cooling, 'Please select how you cool your home.')
    if (cooling) errors.cooling = cooling
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
    if (!profile.monthlyKwh.trim()) {
      errors.monthlyKwh = 'Please enter your average monthly electricity use.'
    } else if (
      !isPositiveNumber(
        profile.monthlyKwh,
        FIELD_BOUNDS.monthlyKwh.min,
        FIELD_BOUNDS.monthlyKwh.max,
      )
    ) {
      errors.monthlyKwh = `Enter a value in kWh, for example ${FIELD_BOUNDS.monthlyKwh.example}.`
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
    } else if (
      profile.batteryModel !== NOT_SURE_VALUE &&
      !batteryModels.includes(profile.batteryModel)
    ) {
      errors.batteryModel =
        'Battery model not found. Please select a model from the list. If you can’t find your model, choose “Not sure”.'
    }
  }

  if (step === 'provider') {
    if (!profile.provider.trim()) {
      errors.provider = 'Please select your electricity provider, or choose Not sure.'
    } else if (
      profile.provider !== NOT_SURE_VALUE &&
      profile.provider !== OTHER_VALUE &&
      !energyProviders.includes(profile.provider)
    ) {
      errors.provider = 'Please select a provider from the list, or choose Not sure.'
    }
  }

  return errors
}

function isPositiveNumber(raw: string, min: number, max: number): boolean {
  const n = Number(raw)
  return Number.isFinite(n) && n >= min && n <= max
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
