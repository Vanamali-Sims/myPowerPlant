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

/** Terms older than this are flagged “may be outdated” (AC-3.3.2). */
export const STALE_THRESHOLD_DAYS = 90

export const STALE_PROMPT =
  'This term may be outdated. Confirm current terms with the provider before you sign up.'

export type MatchReasonCode = 'battery' | 'region' | 'none'

export type CardFact = {
  label: string
  value: string
}

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

/**
 * shortSource
 * @param label - Full compiled source sentence
 * @returns A short publisher name for the term footer
 */
export function shortSource(label: string): string {
  if (/solarquotes/i.test(label)) return 'SolarQuotes'
  const first = label.split(/[,.]/)[0]?.trim()
  return first || label
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
    .sort((a, b) => {
      const byControl = householdControlScore(b) - householdControlScore(a)
      if (byControl !== 0) return byControl
      return a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)
    })
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

/**
 * isTermStale
 * @param isoDate - YYYY-MM-DD last-verified stamp
 * @param now - Comparison day; defaults to today
 * @returns True when the term is older than STALE_THRESHOLD_DAYS
 */
export function isTermStale(isoDate: string, now: Date = new Date()): boolean {
  const verified = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(verified.getTime())) return false
  const ageMs = now.getTime() - verified.getTime()
  return ageMs > STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
}

/**
 * householdControlScore
 * @param plan - Compiled suggestion plan
 * @returns Higher when leaving is easier and dispatch limits are published
 *
 * Placeholder ranking until structured opt-out / discharge fields land.
 * Payment rates and bonuses are ignored on purpose.
 */
export function householdControlScore(plan: VppSuggestionPlan): number {
  const opt = (termByKey(plan, 'opt_out')?.valueText ?? '').toLowerCase()
  const event = (termByKey(plan, 'event_cap')?.valueText ?? '').toLowerCase()
  const reserve = termByKey(plan, 'reserve_min')
  let score = 0
  if (/any time|anytime|opt in and out|no lock-in|no fixed/.test(opt)) score += 40
  else if (/notice|business days/.test(opt)) score += 25
  else if (opt) score += 10
  if (/no cancellation|\$0 cancellation|no penalty|none/.test(opt)) score += 10
  if (event) score += 8
  if (reserve?.numericValue != null) score += 6
  return score
}

export type PlanFitCopy = {
  why: string[]
  tradeoffs: string[]
}

/**
 * planFitCopy
 * @param profile - Saved household answers used only for matching context
 * @param match - Eligible plan plus reserve headroom for this battery
 * @returns Why-it-may-suit and trade-off paragraphs, never dollar savings
 *
 * US-3.7. Eligibility, leave rights, and published dispatch limits only.
 */
export function planFitCopy(profile: ProfileData, match: SuggestionMatch): PlanFitCopy {
  const { plan, reserveHeadroomKwh: headroom } = match
  const battery = profile.batteryModel
  const region = regionFromPostcode(profile.postcode)
  const regionLabel = region === 'VIC' ? 'Victoria' : (region ?? 'your region')
  const opt = compactOptOut(termByKey(plan, 'opt_out'))
  const reserve = compactReserve(termByKey(plan, 'reserve_min'))
  const events = compactEvent(termByKey(plan, 'event_cap'))
  const reserveTerm = termByKey(plan, 'reserve_min')

  const why: string[] = [
    `${plan.brand} lists ${battery} as an approved battery in ${regionLabel}, so this plan can apply to your home.`,
  ]
  if (opt === 'Anytime') {
    why.push('Compiled terms say you can leave at any time, with no lock-in listed.')
  } else if (opt === 'No lock-in') {
    why.push('Compiled terms list no fixed VPP lock-in for this plan.')
  } else if (opt === 'Notice') {
    why.push('Your battery and region still match, though leaving needs a notice period.')
  }

  if (reserveTerm?.numericValue != null) {
    const pct = Math.round(reserveTerm.numericValue * 100)
    let line = `A published reserve keeps ${pct}% of the battery for the home.`
    if (headroom != null) {
      line += ` On your setup that leaves about ${formatKwhShort(headroom)} the VPP may use.`
    }
    why.push(line)
  }
  if (events !== 'Not listed') {
    why.push(`Event use is capped in the compiled table (${events}).`)
  }

  const tradeoffs: string[] = [
    'The provider decides when your battery charges or discharges for VPP events. You cannot pick those times yourself.',
  ]
  if (opt === 'Notice') {
    tradeoffs.push('Leaving is not instant — compiled terms list a notice period.')
  } else if (opt === 'Ongoing') {
    tradeoffs.push('The agreement is listed as ongoing, so confirm how to leave with the provider.')
  }
  if (reserve === 'Not listed' || events === 'Not listed') {
    tradeoffs.push(
      'Some dispatch limits are not yet listed for this provider. Confirm current terms before you sign up.',
    )
  }
  if (reserveTerm?.numericValue != null && reserveTerm.numericValue > 0) {
    tradeoffs.push(
      'The reserved slice is not available for VPP dispatch, and the rest may be used when the provider calls an event.',
    )
  }

  return { why, tradeoffs }
}

function compactOptOut(term: VppSuggestionTerm | null): string {
  if (!term?.valueText) return 'Not listed'
  const text = term.valueText.toLowerCase()
  if (/any time|anytime|opt in and out/.test(text)) return 'Anytime'
  if (/business days|notice/.test(text)) return 'Notice'
  if (/no lock-in|no fixed/.test(text)) return 'No lock-in'
  if (/ongoing/.test(text)) return 'Ongoing'
  return 'See terms'
}

function compactEvent(term: VppSuggestionTerm | null): string {
  if (!term?.valueText) return 'Not listed'
  const cap = term.valueText.match(/(\d+)\s*kwh/i)
  if (cap) return `${cap[1]} kWh/yr`
  return 'Provider dispatches'
}

function compactReserve(term: VppSuggestionTerm | null): string {
  if (term?.numericValue != null) return `${Math.round(term.numericValue * 100)}% kept`
  if (term?.valueText) return 'See terms'
  return 'Not listed'
}

/**
 * compactCardFacts
 * @param plan - Compiled suggestion plan
 * @param headroomKwh - Reserve headroom for this household, if known
 * @returns Short labels for the summary card — not the full terms
 */
export function compactCardFacts(
  plan: VppSuggestionPlan,
  headroomKwh: number | null,
): CardFact[] {
  const facts: CardFact[] = [
    { label: 'Reserve', value: compactReserve(termByKey(plan, 'reserve_min')) },
    { label: 'Opt Out', value: compactOptOut(termByKey(plan, 'opt_out')) },
    { label: 'Discharge Limit', value: compactEvent(termByKey(plan, 'event_cap')) },
  ]
  if (headroomKwh != null) {
    facts.push({ label: 'Headroom', value: formatKwhShort(headroomKwh) })
  }
  return facts
}
