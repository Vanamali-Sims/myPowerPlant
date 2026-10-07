/**
 * Goal setup rules: profile readiness, suggestions, allowed ranges, and checks.
 *
 * Suggestions come from the same buildKpiReport estimate the dashboard shows,
 * so they are a profile estimate, not a forecast of what uploads will show.
 */
import { CARBON_EXAMPLE_KWH, GOAL_SUGGESTION_MONTHS } from '../../constants/goals'
import { WEEKS_PER_MONTH } from '../../constants/kpiMethodology'
import { PROFILE_SECTIONS, SETUP_STEPS } from '../../constants/setup'
import type { GoalKind } from '../../types/goals'
import type { ProfileData } from '../../types/profile'
import { buildKpiReport } from '../kpis'
import type { MethodologyBundle } from '../methodologyApi'
import { validateStep } from '../validateProfile'

export type GoalsReadiness =
  | { ready: true }
  | { ready: false; hasSavedProfile: boolean; missing: string[] }

export type GoalRange = { suggested: number; min: number; max: number }

export type GoalSuggestions = Record<GoalKind, GoalRange | null>

export type CarbonExample = { kwh: number; kg: number; nearSuggestion: boolean }

const FIELD_LABELS = new Map<keyof ProfileData, string>(
  PROFILE_SECTIONS.flatMap((section) =>
    section.fields.map((item) => [item.field, item.label] as const),
  ),
)

/**
 * getGoalsReadiness
 * @param profile - Household answers held by App
 * @returns ready, or the labels of everything still missing
 *
 * Uses the setup wizard's own step checks, so a profile that the wizard
 * would accept is enough. Nothing is filled in on the user's behalf.
 */
export function getGoalsReadiness(profile: ProfileData): GoalsReadiness {
  if (!profile.lastUpdated) {
    return {
      ready: false,
      hasSavedProfile: false,
      missing: SETUP_STEPS.map((step) => step.title),
    }
  }
  const missing: string[] = []
  for (const step of SETUP_STEPS) {
    const errors = validateStep(step.id, profile)
    for (const field of Object.keys(errors) as (keyof ProfileData)[]) {
      missing.push(FIELD_LABELS.get(field) ?? step.title)
    }
  }
  return missing.length ? { ready: false, hasSavedProfile: true, missing } : { ready: true }
}

function roundUpTo(value: number, step: number): number {
  return Math.ceil(value / step) * step
}

function rangeFromMonthly(monthly: number, step: number): GoalRange | null {
  if (!Number.isFinite(monthly) || monthly <= 0) return null
  const min = Math.max(step, roundUpTo(monthly * GOAL_SUGGESTION_MONTHS.min, step))
  const max = Math.max(min, roundUpTo(monthly * GOAL_SUGGESTION_MONTHS.max, step))
  const suggested = Math.min(
    max,
    Math.max(min, roundUpTo(monthly * GOAL_SUGGESTION_MONTHS.suggested, step)),
  )
  return { suggested, min, max }
}

/**
 * monthlyProfileEstimate
 * @param profile - Saved household answers
 * @param bundle - Methodology data App already loaded
 * @returns Estimated monthly savings (AUD) and carbon avoided (kg) from the profile
 *
 * Monthly = the dashboard's modelled week × WEEKS_PER_MONTH, the same rule the
 * methodology uses everywhere else.
 */
export function monthlyProfileEstimate(
  profile: ProfileData,
  bundle: MethodologyBundle,
): Record<GoalKind, number> {
  const report = buildKpiReport(profile, bundle)
  return {
    savings: report.weekly.savingsAud * WEEKS_PER_MONTH,
    carbon: report.weekly.carbonAvoidedKg * WEEKS_PER_MONTH,
  }
}

/**
 * suggestGoals
 * @param profile - Saved household answers
 * @param bundle - Methodology data App already loaded
 * @returns Suggested value and allowed range per goal, or null when the estimate is zero
 *
 * The range runs from GOAL_SUGGESTION_MONTHS.min to .max months of the
 * profile estimate, rounded up to whole dollars and whole kilograms.
 */
export function suggestGoals(profile: ProfileData, bundle: MethodologyBundle): GoalSuggestions {
  const monthly = monthlyProfileEstimate(profile, bundle)
  return {
    savings: rangeFromMonthly(monthly.savings, 1),
    carbon: rangeFromMonthly(monthly.carbon, 1),
  }
}

/**
 * parseGoalInput
 * @param raw - Text from a goal field
 * @returns The number typed, or null when it is not a plain number
 *
 * Accepts "$1,200", "1200" and "1200.50". Rejects letters, a second decimal
 * point, and anything else that would need a guess to read.
 */
export function parseGoalInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/^\$/, '').replace(/,/g, '').trim()
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/**
 * validateGoal
 * @param kind - Savings or carbon
 * @param raw - Text from the field
 * @param range - Allowed range from the profile
 * @returns An error that names the problem, or undefined
 *
 * The allowed range itself is shown under the field and linked to it, so the
 * message only says what is wrong.
 */
export function validateGoal(kind: GoalKind, raw: string, range: GoalRange): string | undefined {
  const name = kind === 'savings' ? 'savings goal' : 'carbon goal'
  if (!raw.trim()) return `Enter a ${name}.`
  const value = parseGoalInput(raw)
  if (value === null) return `Enter a number only, for example ${range.suggested}.`
  if (value <= 0) return 'Enter an amount above zero.'
  if (value < range.min) return 'This is below the allowed range.'
  if (value > range.max) return 'This is above the allowed range.'
  return undefined
}

/** Goals are kept to cents and to tenths of a kilogram. */
export function normaliseGoal(kind: GoalKind, value: number): number {
  const factor = kind === 'savings' ? 100 : 10
  return Math.round(value * factor) / factor
}

/**
 * buildCarbonExamples
 * @param factor - kg CO2e per kWh, read from the methodology data
 * @param suggestedKg - The carbon goal suggested from the profile, if any
 * @returns Round worked examples plus one near the suggested goal
 */
export function buildCarbonExamples(factor: number, suggestedKg: number | null): CarbonExample[] {
  const examples: CarbonExample[] = CARBON_EXAMPLE_KWH.map((kwh) => ({
    kwh,
    kg: kwh * factor,
    nearSuggestion: false,
  }))
  if (suggestedKg && factor > 0) {
    const kwh = Math.max(1, Math.round(suggestedKg / factor))
    examples.push({ kwh, kg: kwh * factor, nearSuggestion: true })
  }
  return examples
}
