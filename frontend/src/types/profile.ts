export type YesNo = 'yes' | 'no'

export type YesNoNotSure = YesNo | 'not_sure'

export type FieldSource = 'user' | 'baseline'

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
  dryer: YesNoNotSure | ''
  dryerWeek: string
  dryerWeekend: string
  heating: string
  cooling: string
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

  fieldSources: Partial<Record<keyof ProfileData, FieldSource>>
  lastUpdated: string | null
}

export const emptyProfile = (): ProfileData => ({
  postcode: '',
  people: '',
  rooms: '',
  gas: '',
  refrigerators: '',
  dryer: '',
  dryerWeek: '',
  dryerWeekend: '',
  heating: '',
  cooling: '',
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
  batteryUnits: 1,
  reservePercent: '20',
  batteryAge: '',
  batteryModel: '',
  provider: '',
  fieldSources: {},
  lastUpdated: null,
})
