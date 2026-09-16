/**
 * Fetch KPI lookup data from Postgres via GET /api/methodology.
 */
import { API_BASE_URL, API_PATHS } from '../constants/api'
import type { Season } from './season'
import type { PeakPeriod } from '../types/profile'

export type ApplianceCategory =
  | 'Entertainment'
  | 'Kitchen & Household'
  | 'Laundry'
  | 'Heating / Cooling'

/** How the published weekly hours were derived, and whether they can scale. */
export type UsageBasis = 'daily_average' | 'per_cycle' | 'per_person' | 'always_on'

export type SeasonBasis = 'year_round' | 'summer_peak' | 'winter_peak'

export type ApplianceSpec = {
  id: string
  category: ApplianceCategory
  name: string
  /** Average draw while in use, not a nameplate rating. */
  powerKw: number
  powerBasis: string
  hoursPerWeek: number
  usageBasis: UsageBasis
  seasonBasis: SeasonBasis
  hoursPerCycle: number | null
  cyclesPerWeek: number | null
  reportedMetric: string
  sourceLabel: string
}

export type SeasonalFactorRow = {
  basis: SeasonBasis
} & Record<Season, number>

export type VppPlan = {
  id: string
  brand: string
  name: string
  exportRate: number
  lockInMonths: number
  dispatchNote: string
  signupBonus: number
  compatibleBatteries: string[]
  href: string
  sourceLabel: string
}

export type VppSuggestionTermKey = 'reserve_min' | 'event_cap' | 'opt_out' | 'payment'

export type VppSuggestionTerm = {
  key: VppSuggestionTermKey
  valueText: string | null
  numericValue: number | null
  sourceLabel: string
  lastVerified: string
}

export type VppSuggestionPlan = {
  id: string
  brand: string
  name: string
  href: string
  illustrativeRatePerKwh: number | null
  approvedBatteries: string[]
  eligibleRegions: string[]
  terms: VppSuggestionTerm[]
}

export type MethodologyScalars = {
  melbournePeakSunHours: number
  solarPerformanceRatio: number
  typicalPotentialKw: number
  vicGridKgCo2PerKwh: number
  defaultRetailRate: number
  defaultFeedInRate: number
  batteryShiftFactor: number
  consumptionShareBase: number
  consumptionSharePeak: number
  dishwasherMinPeople: number
}

export type PeakPeriodRow = {
  id: PeakPeriod
  label: string
  hint: string
  sortOrder: number
  solarShare: number
}

export type BatteryModelRow = {
  name: string
  usableKwh: number
  isDefault: boolean
}

export type MethodologyBundle = {
  methodology: MethodologyScalars
  appliances: Record<string, ApplianceSpec>
  seasonalFactors: Record<SeasonBasis, Record<Season, number>>
  batteryModels: BatteryModelRow[]
  orientationFactors: Record<string, number>
  peakPeriods: PeakPeriodRow[]
  vppPlans: VppPlan[]
  vppSuggestionPlans: VppSuggestionPlan[]
}

export type MethodologyResult =
  | { ok: true; data: MethodologyBundle }
  | { ok: false; error: string }

type ApiMethodology = {
  melbourne_peak_sun_hours: number
  solar_performance_ratio: number
  typical_potential_kw: number
  vic_grid_kg_co2_per_kwh: number
  default_retail_rate: number
  default_feed_in_rate: number
  battery_shift_factor: number
  consumption_share_base: number
  consumption_share_peak: number
  dishwasher_min_people: number
}

type ApiPayload = {
  methodology: ApiMethodology
  appliances: {
    id: string
    category: ApplianceCategory
    name: string
    power_kw: number
    power_basis: string
    hours_per_week: number
    usage_basis: UsageBasis
    season_basis: SeasonBasis
    hours_per_cycle: number | null
    cycles_per_week: number | null
    reported_metric: string
    source_label: string
  }[]
  seasonal_factors: ({ basis: SeasonBasis } & Record<Season, number>)[]
  battery_models: { name: string; usable_kwh: number; is_default: boolean }[]
  orientation_factors: { direction: string; factor: number }[]
  peak_periods: {
    id: PeakPeriod
    label: string
    hint: string
    sort_order: number
    solar_share: number
  }[]
  vpp_plans: {
    id: string
    brand: string
    name: string
    export_rate: number
    lock_in_months: number
    dispatch_note: string
    signup_bonus: number
    href: string
    source_label: string
    compatible_batteries: string[]
  }[]
  vpp_suggestion_plans?: {
    id: string
    brand: string
    name: string
    href: string
    illustrative_rate_per_kwh: number | null
    approved_batteries: string[]
    eligible_regions: string[]
    terms: {
      key: VppSuggestionTermKey
      value_text: string | null
      numeric_value: number | null
      source_label: string
      last_verified: string
    }[]
  }[]
}

/**
 * mapMethodologyPayload
 * @param raw - Snake_case JSON from GET /api/methodology
 * @returns MethodologyBundle used by buildKpiReport
 *
 * Keeps SQL column names on the wire and camelCase in the KPI engine.
 * Appliance rows become an id-keyed record so lookups stay O(1).
 */
export function mapMethodologyPayload(raw: ApiPayload): MethodologyBundle {
  const appliances: Record<string, ApplianceSpec> = {}
  for (const row of raw.appliances) {
    appliances[row.id] = {
      id: row.id,
      category: row.category,
      name: row.name,
      powerKw: row.power_kw,
      powerBasis: row.power_basis,
      hoursPerWeek: row.hours_per_week,
      usageBasis: row.usage_basis,
      seasonBasis: row.season_basis,
      hoursPerCycle: row.hours_per_cycle,
      cyclesPerWeek: row.cycles_per_week,
      reportedMetric: row.reported_metric,
      sourceLabel: row.source_label,
    }
  }
  const seasonalFactors = {} as Record<SeasonBasis, Record<Season, number>>
  for (const row of raw.seasonal_factors) {
    seasonalFactors[row.basis] = {
      summer: row.summer,
      autumn: row.autumn,
      winter: row.winter,
      spring: row.spring,
    }
  }
  const orientationFactors: Record<string, number> = {}
  for (const row of raw.orientation_factors) {
    orientationFactors[row.direction] = row.factor
  }
  return {
    methodology: {
      melbournePeakSunHours: raw.methodology.melbourne_peak_sun_hours,
      solarPerformanceRatio: raw.methodology.solar_performance_ratio,
      typicalPotentialKw: raw.methodology.typical_potential_kw,
      vicGridKgCo2PerKwh: raw.methodology.vic_grid_kg_co2_per_kwh,
      defaultRetailRate: raw.methodology.default_retail_rate,
      defaultFeedInRate: raw.methodology.default_feed_in_rate,
      batteryShiftFactor: raw.methodology.battery_shift_factor,
      consumptionShareBase: raw.methodology.consumption_share_base,
      consumptionSharePeak: raw.methodology.consumption_share_peak,
      dishwasherMinPeople: raw.methodology.dishwasher_min_people,
    },
    appliances,
    seasonalFactors,
    batteryModels: raw.battery_models.map((row) => ({
      name: row.name,
      usableKwh: row.usable_kwh,
      isDefault: row.is_default,
    })),
    orientationFactors,
    peakPeriods: raw.peak_periods.map((row) => ({
      id: row.id,
      label: row.label,
      hint: row.hint,
      sortOrder: row.sort_order,
      solarShare: row.solar_share,
    })),
    vppPlans: raw.vpp_plans.map((row) => ({
      id: row.id,
      brand: row.brand,
      name: row.name,
      exportRate: row.export_rate,
      lockInMonths: row.lock_in_months,
      dispatchNote: row.dispatch_note,
      signupBonus: row.signup_bonus,
      compatibleBatteries: row.compatible_batteries,
      href: row.href,
      sourceLabel: row.source_label,
    })),
    vppSuggestionPlans: (raw.vpp_suggestion_plans ?? []).map((row) => ({
      id: row.id,
      brand: row.brand,
      name: row.name,
      href: row.href,
      illustrativeRatePerKwh: row.illustrative_rate_per_kwh,
      approvedBatteries: row.approved_batteries,
      eligibleRegions: row.eligible_regions,
      terms: row.terms.map((term) => ({
        key: term.key,
        valueText: term.value_text,
        numericValue: term.numeric_value,
        sourceLabel: term.source_label,
        lastVerified: term.last_verified,
      })),
    })),
  }
}

/**
 * fetchMethodology
 * @returns ok with the methodology bundle, or a short error
 *
 * Dashboard estimates depend on this payload. Failures are shown as a
 * banner; the household profile on this device is not affected.
 */
export async function fetchMethodology(): Promise<MethodologyResult> {
  if (!API_BASE_URL) {
    return { ok: false, error: 'VITE_API_BASE_URL is not set.' }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${API_PATHS.methodology}`)
    if (!response.ok) {
      return { ok: false, error: `Request failed (${response.status})` }
    }
    const body = (await response.json()) as ApiPayload
    return { ok: true, data: mapMethodologyPayload(body) }
  } catch {
    return { ok: false, error: 'Could not reach the API. Is the backend running?' }
  }
}
