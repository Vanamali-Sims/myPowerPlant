import {
  coolingOptions,
  heatingOptions,
  peakPeriodOptions,
  usageLevelOptions,
} from '../data/profileOptions'
import type { FieldSource, ProfileData, YesNoNotSure } from '../types/profile'

function yesNoLabel(value: YesNoNotSure | ''): string {
  if (value === 'yes') return 'Yes'
  if (value === 'no') return 'No'
  if (value === 'not_sure') return 'Not sure'
  return '—'
}

function optionLabel(
  options: { value: string; label: string }[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? (value || '—')
}

export function displayValue(
  profile: ProfileData,
  field: keyof ProfileData,
): string {
  const value = profile[field]
  switch (field) {
    case 'gas':
    case 'dryer':
    case 'hotWater':
    case 'wfh':
    case 'hasSolar':
      return yesNoLabel(value as YesNoNotSure | '')
    case 'heating':
      return optionLabel(heatingOptions, String(value))
    case 'cooling':
      return optionLabel(coolingOptions, String(value))
    case 'peakPeriod': {
      const option = peakPeriodOptions.find((item) => item.value === value)
      return option ? `${option.label} (${option.hint})` : '—'
    }
    case 'usageLevel': {
      const level = usageLevelOptions.find((item) => item.value === value)
      return level?.label ?? '—'
    }
    case 'solarDirection':
      if (value === 'not_sure') return 'Not sure'
      if (value === 'S') return 'South'
      if (value === 'N') return 'North'
      if (value === 'E') return 'East'
      if (value === 'W') return 'West'
      if (value === 'NE') return 'North-east'
      if (value === 'NW') return 'North-west'
      if (value === 'SE') return 'South-east'
      if (value === 'SW') return 'South-west'
      return String(value || '—')
    case 'monthlyBill':
      return value ? `$${value}` : '—'
    case 'monthlyKwh':
      return value ? `${value} kWh` : '—'
    case 'panelWatts':
      return value ? `${value} W (watts)` : '—'
    case 'reservePercent':
      return value ? `${value}%` : '—'
    case 'batteryAge':
      return value ? `${value} years` : '—'
    case 'fieldSources':
    case 'lastUpdated':
      return '—'
    default:
      return value === '' || value === null || value === undefined
        ? '—'
        : String(value)
  }
}

export function isBaseline(
  profile: ProfileData,
  field: keyof ProfileData,
): boolean {
  return profile.fieldSources[field] === ('baseline' satisfies FieldSource)
}

export function formatUpdatedAt(iso: string | null): string {
  if (!iso) return 'Not saved yet'
  const date = new Date(iso)
  return date.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
