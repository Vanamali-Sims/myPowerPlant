/**
 * Setup wizard and profile-section metadata.
 *
 * One source for step ids, titles, ledes, field lists, and profile display
 * labels so SetupForm, ProfileView, and baselines stay in sync.
 */
import type { ProfileData, SetupStepId } from '../types/profile'
import {
  BarsIcon,
  BatteryIcon,
  BoltIcon,
  PeopleIcon,
  SunIcon,
} from '../components/ui/icons'

export type SetupStep = {
  id: SetupStepId
  title: string
  lede: string
}

export type ProfileSectionField = {
  field: keyof ProfileData
  label: string
}

export type ProfileSection = {
  id: SetupStepId
  title: string
  icon: typeof PeopleIcon
  fields: ProfileSectionField[]
}

/** Shown once when the wizard opens, before household step 1. */
export const SETUP_INTRO = {
  eyebrow: 'Before you start',
  title: 'Your details stay with you',
  privacy:
    'We do not store your information on our servers — it stays on this device only.',
  accuracy: 'The more you fill in, the more accurate your prediction.',
  action: 'Continue',
  skipAll: 'Skip all',
  skipAllNote:
    'Skip all fills any question you have not answered with a typical Kew household, so you can see your dashboard now. You can change the answers later in Profile.',
} as const

export const SETUP_STEPS: SetupStep[] = [
  {
    id: 'household',
    title: 'Household Profile',
    lede: 'A set of questions designed to discover personalised energy usage.',
  },
  {
    id: 'usage',
    title: 'Household Usage',
    lede: 'Tell us how your household uses electricity so we can personalise your estimate.',
  },
  {
    id: 'solar',
    title: 'Solar Details',
    lede: 'Tell us about your solar panel setup so we can estimate your household’s solar generation and personalise your energy insights.',
  },
  {
    id: 'battery',
    title: 'Battery Profile',
    lede: 'Tell us about your home battery so we can better estimate how much stored energy may be available for household use and potential VPP participation.',
  },
  {
    id: 'provider',
    title: 'Energy Provider',
    lede: 'Tell us about your current electricity provider so we can better understand your existing energy arrangement and provide more relevant VPP insights.',
  },
]

export const STEP_FIELDS: Record<SetupStepId, (keyof ProfileData)[]> = {
  household: [
    'postcode',
    'people',
    'rooms',
    'gas',
    'refrigerators',
    'tvHoursPerWeek',
    'washerCyclesPerWeek',
    'dishwasherCyclesPerWeek',
    'dryer',
    'dryerWeek',
    'dryerWeekend',
    'heating',
    'cooling',
    'airconHoursPerWeek',
    'hotWater',
  ],
  usage: ['monthlyBill', 'peakPeriod', 'usageLevel', 'wfh'],
  solar: ['hasSolar', 'solarDirection', 'panelCount', 'panelWatts'],
  battery: ['batteryUnits', 'reservePercent', 'batteryAge', 'batteryModel'],
  provider: ['provider'],
}

export const PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: 'household',
    title: 'Household Profile',
    icon: PeopleIcon,
    fields: [
      { field: 'postcode', label: 'Postcode' },
      { field: 'people', label: 'People in household' },
      { field: 'rooms', label: 'Total rooms' },
      { field: 'gas', label: 'Gas' },
      { field: 'refrigerators', label: 'Refrigerators' },
      { field: 'tvHoursPerWeek', label: 'TV use' },
      { field: 'washerCyclesPerWeek', label: 'Washing machine use' },
      { field: 'dishwasherCyclesPerWeek', label: 'Dishwasher use' },
      { field: 'dryer', label: 'Clothes dryer' },
      { field: 'heating', label: 'Home heating' },
      { field: 'cooling', label: 'Home cooling' },
      { field: 'airconHoursPerWeek', label: 'Air conditioner use' },
      { field: 'hotWater', label: 'Hot water system' },
    ],
  },
  {
    id: 'usage',
    title: 'Household Usage',
    icon: BarsIcon,
    fields: [
      { field: 'monthlyBill', label: 'Average monthly electricity bill' },
      { field: 'peakPeriod', label: 'Highest energy-use period' },
      { field: 'usageLevel', label: 'Energy usage level' },
      { field: 'wfh', label: 'Work/study from home' },
    ],
  },
  {
    id: 'solar',
    title: 'Solar Details',
    icon: SunIcon,
    fields: [
      { field: 'hasSolar', label: 'Solar' },
      { field: 'solarDirection', label: 'Solar panel direction' },
      { field: 'panelCount', label: 'Number of panels' },
      { field: 'panelWatts', label: 'Average power rating' },
    ],
  },
  {
    id: 'battery',
    title: 'Battery Profile',
    icon: BatteryIcon,
    fields: [
      { field: 'batteryUnits', label: 'Number of battery units' },
      { field: 'reservePercent', label: 'Usable capacity preference' },
      { field: 'batteryAge', label: 'Battery age' },
      { field: 'batteryModel', label: 'Battery model' },
    ],
  },
  {
    id: 'provider',
    title: 'Energy Provider',
    icon: BoltIcon,
    fields: [{ field: 'provider', label: 'Current electricity provider' }],
  },
]
