/**
 * Shared field bounds and Victorian postcode rules.
 *
 * Used by validateProfile, the battery stepper, the postcode input, and
 * locationFromPostcode so UI limits match the validator.
 */

export const VIC_POSTCODE = /^[38]\d{3}$/

export const DEFAULT_LOCATION_LABEL = 'VIC'

export const FIELD_BOUNDS = {
  monthlyBill: { min: 1, max: 5000, example: 180 },
  monthlyKwh: { min: 1, max: 5000, example: 540 },
  panelCount: { min: 1, max: 80, example: 12 },
  panelWatts: { min: 50, max: 500, example: 300 },
  reservePercent: { min: 0, max: 80, example: 20 },
  batteryAge: { min: 0, max: 40, example: 2 },
  batteryUnits: { min: 1, max: 8 },
  postcodeLength: 4,
} as const

export const DEFAULT_BATTERY_UNITS = FIELD_BOUNDS.batteryUnits.min
export const DEFAULT_RESERVE_PERCENT = String(FIELD_BOUNDS.reservePercent.example)
