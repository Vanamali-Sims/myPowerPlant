/**
 * Fetch KPI lookup data from Postgres via GET /api/methodology.
 */
import { API_BASE_URL, API_PATHS } from '../constants/api'
import type { PeakPeriod } from '../types/profile'

export type ApplianceCategory =
  | 'Entertainment'
  | 'Kitchen & Household'
  | 'Laundry'
  | 'Heating / Cooling'

export type ApplianceSpec = {
  id: string
  category: ApplianceCategory
  name: string
  powerKw: number
  typicalHoursPerWeek: number
}

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
  wfhMonitorHours: number
  washerMinHours: number
  airconBaseHours: number
  airconHoursPerRoom: number
  airconMaxHours: number
  evaporativeHours: number
  heaterBaseHours: number
  heaterMaxHours: number
  waterHeaterHours: number
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
  batteryModels: BatteryModelRow[]
  orientationFactors: Record<string, number>
  peakPeriods: PeakPeriodRow[]
  vppPlans: VppPlan[]
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
  wfh_monitor_hours: number
  washer_min_hours: number
  aircon_base_hours: number
  aircon_hours_per_room: number
  aircon_max_hours: number
  evaporative_hours: number
  heater_base_hours: number
  heater_max_hours: number
  water_heater_hours: number
}

type ApiPayload = {
  methodology: ApiMethodology
  appliances: {
    id: string
    category: ApplianceCategory
    name: string
    power_kw: number
    typical_hours_per_week: number
  }[]
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
      typicalHoursPerWeek: row.typical_hours_per_week,
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
      wfhMonitorHours: raw.methodology.wfh_monitor_hours,
      washerMinHours: raw.methodology.washer_min_hours,
      airconBaseHours: raw.methodology.aircon_base_hours,
      airconHoursPerRoom: raw.methodology.aircon_hours_per_room,
      airconMaxHours: raw.methodology.aircon_max_hours,
      evaporativeHours: raw.methodology.evaporative_hours,
      heaterBaseHours: raw.methodology.heater_base_hours,
      heaterMaxHours: raw.methodology.heater_max_hours,
      waterHeaterHours: raw.methodology.water_heater_hours,
    },
    appliances,
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
