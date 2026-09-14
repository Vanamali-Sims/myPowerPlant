/**
 * Client-side VPP suggestion matching and plain-language term helpers.
 *
 * Filters compiled GET /api/methodology suggestion plans against the
 * localStorage profile. Does not rank by dollar savings.
 */
import { VIC_POSTCODE } from '../constants/validation'
import { isAllowedBatteryModel, NOT_SURE_VALUE } from '../data/profileOptions'
import type {
  BatteryModelRow,
  VppSuggestionPlan,
  VppSuggestionTerm,
  VppSuggestionTermKey,
} from './methodologyApi'
import type { ProfileData } from '../types/profile'

export const EXAMPLE_KWH = 10

export const TERM_ORDER: VppSuggestionTermKey[] = [
  'reserve_min',
  'event_cap',
  'opt_out',
  'payment',
]

export const TERM_LABELS: Record<VppSuggestionTermKey, string> = {
  reserve_min: 'Reserve minimum',
  event_cap: 'Event cap',
  opt_out: 'Opt-out rights',
  payment: 'How you would be paid',
}

export const UNAVAILABLE_TERM = 'Not yet available for this provider'

export type MatchReasonCode = 'battery' | 'region' | 'none'

export type SuggestionMatch = {
  plan: VppSuggestionPlan
  reserveHeadroomKwh: number | null
}

export type SuggestionResult = {
  matches: SuggestionMatch[]
  emptyReason: MatchReasonCode | null
}

/**
 * regionFromPostcode
 * @param postcode - Four-digit Australian postcode
 * @returns VIC when the code is Victorian, otherwise null
 *
 * Suggestion plans are seeded for Victoria only in this slice.
 */
export function regionFromPostcode(postcode: string): string | null {
  if (VIC_POSTCODE.test(postcode.trim())) return 'VIC'
  return null
}

/**
 * termByKey
 * @param plan - Compiled suggestion plan
 * @param key - reserve_min, event_cap, opt_out, or payment
 * @returns The term row, or null when the seed omitted it
 */
export function termByKey(
  plan: VppSuggestionPlan,
  key: VppSuggestionTermKey,
): VppSuggestionTerm | null {
  return plan.terms.find((term) => term.key === key) ?? null
}

/**
 * formatVerifiedDate
 * @param isoDate - YYYY-MM-DD from the methodology payload
 * @returns en-AU date such as 14 Sep 2026
 */
export function formatVerifiedDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function batteryCapacityKwh(
  profile: ProfileData,
  models: BatteryModelRow[],
): number | null {
  if (!isAllowedBatteryModel(profile.batteryModel) || profile.batteryModel === NOT_SURE_VALUE) {
    return null
  }
  const match = models.find((row) => row.name === profile.batteryModel)
  return match ? match.usableKwh : null
}

/**
 * reserveHeadroomKwh
 * @param profile - Saved household answers
 * @param plan - Suggestion plan with an optional reserve_min numeric_value
 * @param models - Battery catalogue from methodology
 * @returns kWh the VPP may use above the plan reserve, or null if unknown
 *
 * Uses the plan's published reserve %, not the household preference stepper.
 */
export function reserveHeadroomKwh(
  profile: ProfileData,
  plan: VppSuggestionPlan,
  models: BatteryModelRow[],
): number | null {
  const reserve = termByKey(plan, 'reserve_min')
  if (reserve?.numericValue == null || reserve.numericValue < 0 || reserve.numericValue > 1) {
    return null
  }
  const capacity = batteryCapacityKwh(profile, models)
  if (capacity == null || capacity <= 0) return null
  const units = profile.batteryUnits > 0 ? profile.batteryUnits : 1
  return units * capacity * (1 - reserve.numericValue)
}

/**
 * matchSuggestionPlans
 * @param profile - Saved household answers
 * @param plans - Compiled suggestion list from GET /api/methodology
 * @param models - Battery capacities for reserve headroom
 * @returns Eligible plans, or an empty list with a reason code
 *
 * A plan must list both the household region and the named battery model.
 * Unknown / Not sure batteries never fall back to showing every plan.
 */
export function matchSuggestionPlans(
  profile: ProfileData,
  plans: VppSuggestionPlan[],
  models: BatteryModelRow[],
): SuggestionResult {
  const region = regionFromPostcode(profile.postcode)
  if (!region) {
    return { matches: [], emptyReason: 'region' }
  }

  const model =
    isAllowedBatteryModel(profile.batteryModel) && profile.batteryModel !== NOT_SURE_VALUE
      ? profile.batteryModel
      : ''
  if (!model) {
    return { matches: [], emptyReason: 'battery' }
  }

  const matches = plans
    .filter(
      (plan) =>
        plan.eligibleRegions.includes(region) && plan.approvedBatteries.includes(model),
    )
    .sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name))
    .map((plan) => ({
      plan,
      reserveHeadroomKwh: reserveHeadroomKwh(profile, plan, models),
    }))

  if (!matches.length) {
    const regionOk = plans.some((plan) => plan.eligibleRegions.includes(region))
    return { matches: [], emptyReason: regionOk ? 'battery' : 'region' }
  }

  return { matches, emptyReason: null }
}

/**
 * illustrativePayment
 * @param ratePerKwh - Published event/export rate, or null
 * @param exampleKwh - Round fictional kWh, or reserve headroom
 * @returns Dollars for the expanded example, or null when no rate
 */
export function illustrativePayment(ratePerKwh: number | null, exampleKwh: number): number | null {
  if (ratePerKwh == null || ratePerKwh <= 0 || exampleKwh <= 0) return null
  return ratePerKwh * exampleKwh
}

/**
 * formatKwhShort
 * @param value - Kilowatt-hours
 * @returns One-decimal kWh string
 */
export function formatKwhShort(value: number): string {
  if (value >= 10) return `${value.toFixed(1)} kWh`
  return `${value.toFixed(2)} kWh`
}

/**
 * formatExampleAud
 * @param value - Illustrative dollar amount
 * @returns Always two-decimal currency so the worked example shows the arithmetic
 */
export function formatExampleAud(value: number): string {
  const abs = Math.abs(value)
  return `${value < 0 ? '-' : ''}$${abs.toFixed(2)}`
}
