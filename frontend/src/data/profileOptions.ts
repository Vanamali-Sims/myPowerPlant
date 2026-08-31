import type {
  PeakPeriod,
  SolarDirection,
  UsageLevel,
  YesNo,
  YesNoNotSure,
} from '../types/profile'

export const peopleOptions = ['1', '2', '3', '4', '5', '6+']

export const roomOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10+']

export const fridgeOptions = ['0', '1', '2', '3', '4+']

export const dryerUseOptions = ['0', '1', '2', '3', '4', '5', '6', '7']

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

export function locationFromPostcode(postcode: string): string {
  if (postcodeSuburbs[postcode]) return postcodeSuburbs[postcode]
  if (/^[38]\d{3}$/.test(postcode)) return 'VIC'
  return ''
}
