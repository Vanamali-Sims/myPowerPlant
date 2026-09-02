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

const postcodeSuburbs: Record<string, string> = {
  '3000': 'Melbourne, VIC',
  '3002': 'East Melbourne, VIC',
  '3053': 'Carlton, VIC',
  '3065': 'Fitzroy, VIC',
  '3101': 'Kew, VIC',
  '3121': 'Richmond, VIC',
  '3124': 'Camberwell, VIC',
  '3141': 'South Yarra, VIC',
  '3182': 'St Kilda, VIC',
  '3186': 'Brighton, VIC',
}

/**
 * locationFromPostcode
 * @param postcode - Four-digit Australian postcode
 * @returns “Suburb, VIC” when known, “VIC” for other Victorian codes, else empty
 *
 * Named inner-Melbourne suburbs are listed so the rail and dashboard can
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

/** Approximate coordinates for the named inner-Melbourne suburbs above. */
const postcodeCoords: Record<string, LatLon> = {
  '3000': { lat: -37.8136, lon: 144.9631 },
  '3002': { lat: -37.8159, lon: 144.9873 },
  '3053': { lat: -37.8, lon: 144.967 },
  '3065': { lat: -37.8, lon: 144.978 },
  '3101': { lat: -37.806, lon: 145.031 },
  '3121': { lat: -37.819, lon: 144.999 },
  '3124': { lat: -37.842, lon: 145.058 },
  '3141': { lat: -37.838, lon: 144.993 },
  '3182': { lat: -37.867, lon: 144.981 },
  '3186': { lat: -37.906, lon: 144.998 },
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
