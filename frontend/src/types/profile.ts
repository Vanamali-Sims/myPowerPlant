/**
 * Shared household-profile types and the empty-form factory.
 */
import { DEFAULT_BATTERY_UNITS, DEFAULT_RESERVE_PERCENT } from '../constants/validation'

export type YesNo = 'yes' | 'no'

export type YesNoNotSure = YesNo | 'not_sure'

export type FieldSource = 'user' | 'baseline' | 'bill'

export type PeakPeriod = 'morning' | 'afternoon' | 'evening' | 'night'

export type UsageLevel = 'low' | 'moderate' | 'high' | 'very_high'

export type SolarDirection =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW'
  | 'not_sure'

export type SetupStepId =
  | 'household'
  | 'usage'
  | 'solar'
  | 'battery'
  | 'provider'

export type ProfileData = {
  postcode: string
  people: string
  rooms: string
  gas: YesNoNotSure | ''
  refrigerators: string
  tvHoursPerWeek: string
  washerCyclesPerWeek: string
  dishwasherCyclesPerWeek: string
  dryer: YesNoNotSure | ''
  dryerWeek: string
  dryerWeekend: string
  heating: string
  cooling: string
  airconHoursPerWeek: string
  hotWater: YesNoNotSure | ''

  monthlyBill: string
  monthlyKwh: string
  peakPeriod: PeakPeriod | ''
  usageLevel: UsageLevel | ''
  wfh: YesNoNotSure | ''

  hasSolar: YesNo | ''
  solarDirection: SolarDirection | ''
  panelCount: string
  panelWatts: string

  batteryUnits: number
  reservePercent: string
  batteryAge: string
  batteryModel: string

  provider: string
  /** VPP the household has joined; asked by the improve-setup flow only. */
  vppProvider: string

  fieldSources: Partial<Record<keyof ProfileData, FieldSource>>
  /** When the explore setup form last saved these answers. */
  lastUpdated: string | null
  /** When the improve-setup form last saved these answers. */
  improveUpdated: string | null
}

/**
 * emptyProfile
 * @returns A blank profile with battery defaults only
 *
 * Battery units and reserve start at the shared defaults because those fields
 * are steppers, not empty strings. Everything else waits for the wizard.
 */
export const emptyProfile = (): ProfileData => ({
  postcode: '',
  people: '',
  rooms: '',
  gas: '',
  refrigerators: '',
  tvHoursPerWeek: '',
  washerCyclesPerWeek: '',
  dishwasherCyclesPerWeek: '',
  dryer: '',
  dryerWeek: '',
  dryerWeekend: '',
  heating: '',
  cooling: '',
  airconHoursPerWeek: '',
  hotWater: '',
  monthlyBill: '',
  monthlyKwh: '',
  peakPeriod: '',
  usageLevel: '',
  wfh: '',
  hasSolar: '',
  solarDirection: '',
  panelCount: '',
  panelWatts: '',
  batteryUnits: DEFAULT_BATTERY_UNITS,
  reservePercent: DEFAULT_RESERVE_PERCENT,
  batteryAge: '',
  batteryModel: '',
  provider: '',
  vppProvider: '',
  fieldSources: {},
  lastUpdated: null,
  improveUpdated: null,
})
