/**
 * Shared field bounds and Victorian postcode rules.
 *
 * Used by validateProfile, the battery stepper, the postcode input, and
 * locationFromPostcode so UI limits match the validator.
 */

export const VIC_POSTCODE = /^[38]\d{3}$/

export const DEFAULT_LOCATION_LABEL = 'VIC'

/** Approximate mainland Victoria box used to reject GPS outside the state. */
export const VIC_BOUNDS = {
  latMin: -39.2,
  latMax: -33.98,
  lonMin: 140.96,
  lonMax: 149.98,
} as const

/** Snap “use my location” to a mapped suburb only when GPS is this close. */
export const GEO_MAX_MATCH_KM = 25

/**
 * isInVictoria
 * @param lat - WGS84 latitude
 * @param lon - WGS84 longitude
 * @returns True when the point sits inside the mainland Victoria box
 */
export function isInVictoria(lat: number, lon: number): boolean {
  return (
    lat >= VIC_BOUNDS.latMin &&
    lat <= VIC_BOUNDS.latMax &&
    lon >= VIC_BOUNDS.lonMin &&
    lon <= VIC_BOUNDS.lonMax
  )
}

export const FIELD_BOUNDS = {
  monthlyBill: { min: 1, max: 5000, example: 180 },
  monthlyKwh: { min: 1, max: 5000, example: 540 },
  panelCount: { min: 1, max: 80, example: 12 },
  panelWatts: { min: 50, max: 500, example: 300 },
  reservePercent: { min: 0, max: 80, example: 20 },
  batteryAge: { min: 0, max: 40, example: 2 },
  batteryUnits: { min: 1, max: 8 },
  postcodeLength: 4,
  people: { min: 1, max: 15, example: 3 },
  rooms: { min: 1, max: 20, example: 6 },
  refrigerators: { min: 0, max: 10, example: 2 },
  dryerWeek: { min: 0, max: 10, example: 2 },
  dryerWeekend: { min: 0, max: 6, example: 1 },
  tvHoursPerWeek: { min: 0, max: 168, example: 17 },
  washerCyclesPerWeek: { min: 0, max: 21, example: 4 },
  dishwasherCyclesPerWeek: { min: 0, max: 21, example: 6 },
  airconHoursPerWeek: { min: 0, max: 168, example: 42 },
} as const

export const DEFAULT_BATTERY_UNITS = FIELD_BOUNDS.batteryUnits.min
export const DEFAULT_RESERVE_PERCENT = String(FIELD_BOUNDS.reservePercent.example)

/**
 * clampNumber
 * @param value - Candidate number, possibly NaN or infinite
 * @param min - Inclusive lower bound
 * @param max - Inclusive upper bound
 * @returns value pinned into [min, max], or min when the input is not finite
 */
export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}
