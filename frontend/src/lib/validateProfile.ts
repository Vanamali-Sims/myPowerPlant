import { batteryModels, energyProviders } from '../data/profileOptions'
import type { ProfileData, SetupStepId } from '../types/profile'

export type FieldErrors = Partial<Record<keyof ProfileData, string>>

const VIC_POSTCODE = /^[38]\d{3}$/

function required(value: string, message: string): string | undefined {
  if (!value.trim()) return message
  return undefined
}

export function isVictorianPostcode(postcode: string): boolean {
  return VIC_POSTCODE.test(postcode.trim())
}

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
    } else if (!isPositiveNumber(profile.monthlyBill, 1, 5000)) {
      errors.monthlyBill = 'Enter a typical monthly amount, for example 180.'
    }
    if (!profile.monthlyKwh.trim()) {
      errors.monthlyKwh = 'Please enter your average monthly electricity use.'
    } else if (!isPositiveNumber(profile.monthlyKwh, 1, 5000)) {
      errors.monthlyKwh = 'Enter a value in kWh, for example 540.'
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
      } else if (!isPositiveNumber(profile.panelCount, 1, 80)) {
        errors.panelCount = 'Enter a number of panels between 1 and 80. Example: 12'
      }
      if (!profile.panelWatts.trim()) {
        errors.panelWatts = 'Please enter a valid average power rating.'
      } else if (!isPositiveNumber(profile.panelWatts, 50, 500)) {
        errors.panelWatts = 'Enter a value between 50 W and 500 W. Example: 300'
      }
    }
  }

  if (step === 'battery') {
    if (profile.batteryUnits < 1 || profile.batteryUnits > 8) {
      errors.batteryUnits = 'Enter the number of battery units at your property.'
    }
    if (!profile.reservePercent.trim()) {
      errors.reservePercent = 'Please enter the minimum battery level you want to keep.'
    } else if (!isPositiveNumber(profile.reservePercent, 0, 80)) {
      errors.reservePercent = 'Enter a percentage between 0 and 80. Example: 20'
    }
    const age = required(profile.batteryAge, 'Please enter the approximate age of your battery.')
    if (age) {
      errors.batteryAge = age
    } else if (!isPositiveNumber(profile.batteryAge, 0, 40)) {
      errors.batteryAge = 'Enter the age in years, for example 2.'
    }
    if (!profile.batteryModel.trim()) {
      errors.batteryModel = 'Please select a model from the list, or choose Not sure.'
    } else if (
      profile.batteryModel !== 'Not sure' &&
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
      profile.provider !== 'Not sure' &&
      profile.provider !== 'Other' &&
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

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}
