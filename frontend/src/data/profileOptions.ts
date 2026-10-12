/**
 * Form option lists, retailer/battery catalogues, and postcode → suburb labels.
 */
import { DEFAULT_LOCATION_LABEL, VIC_POSTCODE } from '../constants/validation'
import type {
  PeakPeriod,
  SolarDirection,
  UsageLevel,
  YesNo,
  YesNoNotSure,
} from '../types/profile'

export const heatingOptions = [
  { value: 'electric', label: 'Electric (Reverse cycle / Heat pump)' },
  { value: 'gas', label: 'Gas (Ducted / Gas heater)' },
  { value: 'wood', label: 'Wood (Fireplace / Wood heater)' },
  { value: 'none', label: 'No heating system' },
  { value: 'other', label: 'Other' },
  { value: 'not_sure', label: 'Not sure' },
]

export const coolingOptions = [
  { value: 'air_conditioning', label: 'Air conditioning' },
  { value: 'evaporative', label: 'Evaporative cooling' },
  { value: 'fans', label: 'Fans only' },
  { value: 'none', label: 'No cooling system' },
  { value: 'other', label: 'Other' },
  { value: 'not_sure', label: 'Not sure' },
]

export const yesNo: { value: YesNo; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
]

export const yesNoNotSure: { value: YesNoNotSure; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'not_sure', label: 'Not sure' },
]

export const peakPeriodOptions: {
  value: PeakPeriod
  label: string
  hint: string
}[] = [
  { value: 'morning', label: 'Morning', hint: '6am – 12pm' },
  { value: 'afternoon', label: 'Afternoon', hint: '12pm – 6pm' },
  { value: 'evening', label: 'Evening', hint: '6pm – 10pm' },
  { value: 'night', label: 'Night', hint: '10pm – 6am' },
]

export const usageLevelOptions: {
  value: UsageLevel
  label: string
  description: string
}[] = [
  {
    value: 'low',
    label: 'Low',
    description: 'We’re careful with energy',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'We use a typical amount of energy',
  },
  {
    value: 'high',
    label: 'High',
    description: 'We use a lot of energy',
  },
  {
    value: 'very_high',
    label: 'Very high',
    description: 'We use very high amounts of energy',
  },
]

export const solarDirections: { value: SolarDirection; label: string }[] = [
  { value: 'N', label: 'N' },
  { value: 'NE', label: 'NE' },
  { value: 'E', label: 'E' },
  { value: 'SE', label: 'SE' },
  { value: 'S', label: 'S' },
  { value: 'SW', label: 'SW' },
  { value: 'W', label: 'W' },
  { value: 'NW', label: 'NW' },
]

export const batteryModels = [
  'Tesla Powerwall 2',
  'Sungrow SBR HV',
  'BYD Battery-Box Premium LVL',
  'AlphaESS SMILE5',
  'Goodwe Lynx Home F',
  'SonnenBatterie',
]

export const energyProviders = [
  'AGL Energy',
  'Powershop',
  'Origin Energy',
  'EnergyAustralia',
  'Red Energy',
  'Diamond Energy',
  'Simply Energy',
  'Alinta Energy',
  'GloBird Energy',
]

export const OTHER_VALUE = 'Other'
export const NOT_SURE_VALUE = 'Not sure'

const ALLOWED_BATTERY_MODELS: readonly string[] = [...batteryModels, NOT_SURE_VALUE]
const ALLOWED_PROVIDERS: readonly string[] = [
  ...energyProviders,
  OTHER_VALUE,
  NOT_SURE_VALUE,
]

/**
 * isAllowedBatteryModel
 * @param value - Stored or typed battery model
 * @returns True when the value is in the catalogue or Not sure
 *
 * SearchSelect and localStorage sanitise to this list so a script payload
 * cannot persist as batteryModel.
 */
export function isAllowedBatteryModel(value: string): boolean {
  return ALLOWED_BATTERY_MODELS.includes(value)
}

/**
 * isAllowedProvider
 * @param value - Stored or typed electricity retailer
 * @returns True when the value is a listed retailer, Other, or Not sure
 */
export function isAllowedProvider(value: string): boolean {
  return ALLOWED_PROVIDERS.includes(value)
}

const postcodeSuburbs: Record<string, string> = {
  '3000': 'Melbourne, VIC',
  '3002': 'East Melbourne, VIC',
  '3030': 'Werribee, VIC',
  '3053': 'Carlton, VIC',
  '3065': 'Fitzroy, VIC',
  '3101': 'Kew, VIC',
  '3121': 'Richmond, VIC',
  '3124': 'Camberwell, VIC',
  '3141': 'South Yarra, VIC',
  '3175': 'Dandenong, VIC',
  '3182': 'St Kilda, VIC',
  '3186': 'Brighton, VIC',
  '3199': 'Frankston, VIC',
  '3220': 'Geelong, VIC',
  '3280': 'Warrnambool, VIC',
  '3350': 'Ballarat, VIC',
  '3500': 'Mildura, VIC',
  '3550': 'Bendigo, VIC',
  '3630': 'Shepparton, VIC',
  '3844': 'Traralgon, VIC',
}

/**
 * locationFromPostcode
 * @param postcode - Four-digit Australian postcode
 * @returns “Suburb, VIC” when known, “VIC” for other Victorian codes, else empty
 *
 * Named Victorian suburbs are listed so the rail and dashboard can
 * show a place. Other 3xxx/8xxx codes still resolve to the state label.
 */
export function locationFromPostcode(postcode: string): string {
  if (postcodeSuburbs[postcode]) return postcodeSuburbs[postcode]
  if (VIC_POSTCODE.test(postcode)) return DEFAULT_LOCATION_LABEL
  return ''
}

export type LatLon = { lat: number; lon: number }

/** Melbourne CBD — the fallback point for the solar forecast lookup. */
const MELBOURNE: LatLon = { lat: -37.8136, lon: 144.9631 }

/** Approximate coordinates for the named Victorian suburbs above. */
const postcodeCoords: Record<string, LatLon> = {
  '3000': { lat: -37.8136, lon: 144.9631 },
  '3002': { lat: -37.8159, lon: 144.9873 },
  '3030': { lat: -37.9, lon: 144.661 },
  '3053': { lat: -37.8, lon: 144.967 },
  '3065': { lat: -37.8, lon: 144.978 },
  '3101': { lat: -37.806, lon: 145.031 },
  '3121': { lat: -37.819, lon: 144.999 },
  '3124': { lat: -37.842, lon: 145.058 },
  '3141': { lat: -37.838, lon: 144.993 },
  '3175': { lat: -37.987, lon: 145.215 },
  '3182': { lat: -37.867, lon: 144.981 },
  '3186': { lat: -37.906, lon: 144.998 },
  '3199': { lat: -38.141, lon: 145.123 },
  '3220': { lat: -38.1499, lon: 144.3617 },
  '3280': { lat: -38.381, lon: 142.488 },
  '3350': { lat: -37.5622, lon: 143.8503 },
  '3500': { lat: -34.1854, lon: 142.1625 },
  '3550': { lat: -36.757, lon: 144.2794 },
  '3630': { lat: -36.377, lon: 145.399 },
  '3844': { lat: -38.195, lon: 146.54 },
}

const EARTH_RADIUS_KM = 6371

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function haversineKm(from: LatLon, to: LatLon): number {
  const dLat = toRad(to.lat - from.lat)
  const dLon = toRad(to.lon - from.lon)
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * nearestMappedPostcode
 * @param lat - Device latitude
 * @param lon - Device longitude
 * @param maxKm - Ignore mapped suburbs further than this
 * @returns The closest mapped Victorian postcode, or null when none are close
 *
 * Runs entirely on-device. GPS is never sent to a geocoder.
 */
export function nearestMappedPostcode(lat: number, lon: number, maxKm: number): string | null {
  const here: LatLon = { lat, lon }
  let best: { postcode: string; km: number } | null = null
  for (const [postcode, point] of Object.entries(postcodeCoords)) {
    const km = haversineKm(here, point)
    if (!best || km < best.km) best = { postcode, km }
  }
  if (!best || best.km > maxKm) return null
  return best.postcode
}

/**
 * coordsFromPostcode
 * @param postcode - Four-digit Australian postcode
 * @returns Latitude/longitude for the weather lookup, defaulting to Melbourne
 *
 * The forecast only needs a suburb-level point, so any Victorian postcode we
 * do not have mapped falls back to the Melbourne CBD coordinate.
 */
export function coordsFromPostcode(postcode: string): LatLon {
  return postcodeCoords[postcode] ?? MELBOURNE
}
