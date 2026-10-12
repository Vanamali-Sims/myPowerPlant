/**
 * Goal setup rules: the battery-file baseline, suggestions, allowed ranges, and checks.
 *
 * Suggestions come from one recent month of the household's own battery file,
 * scaled to an average-length month. They are still estimates, because the
 * rate and emissions factor are the same estimated values the dashboard uses.
 */
import { BASELINE_RULES, CARBON_EXAMPLE_KWH, GOAL_SUGGESTION_MONTHS } from '../../constants/goals'
import type { GoalKind } from '../../types/goals'
import type { DayFigures } from './calculate'
import { addMonths, monthOf } from './calendar'

export type GoalRange = { suggested: number; min: number; max: number }

export type GoalSuggestions = Record<GoalKind, GoalRange | null>

export type CarbonExample = { kwh: number; kg: number; nearSuggestion: boolean }

export type BaselinePick =
  | {
      ok: true
      month: string
      /** The complete days of that month, which are added to progress on save. */
      days: DayFigures[]
      monthly: Record<GoalKind, number>
    }
  | { ok: false; reason: 'baseline_not_recent' | 'baseline_too_few_days' }

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
 * pickBaseline
 * @param days - Calculated complete days from the file, in date order
 * @param today - Melbourne date, YYYY-MM-DD
 * @returns The latest recent month with enough complete days, scaled to a month
 *
 * Recent means the current month or one of the BASELINE_RULES.recentMonths
 * full months before it. Monthly = the month's total ÷ its complete days ×
 * BASELINE_RULES.daysPerMonth, so a part-month still gives a full-month figure.
 */
export function pickBaseline(days: DayFigures[], today: string): BaselinePick {
  const current = monthOf(today)
  const earliest = addMonths(current, -BASELINE_RULES.recentMonths)
  const byMonth = new Map<string, DayFigures[]>()
  for (const day of days) {
    const month = monthOf(day.date)
    if (month < earliest || month > current) continue
    byMonth.set(month, [...(byMonth.get(month) ?? []), day])
  }
  if (!byMonth.size) return { ok: false, reason: 'baseline_not_recent' }
  const month = [...byMonth.keys()]
    .sort()
    .reverse()
    .find((key) => (byMonth.get(key) ?? []).length >= BASELINE_RULES.minCompleteDays)
  if (!month) return { ok: false, reason: 'baseline_too_few_days' }
  const monthDays = byMonth.get(month) ?? []
  const scale = BASELINE_RULES.daysPerMonth / monthDays.length
  return {
    ok: true,
    month,
    days: monthDays,
    monthly: {
      savings: monthDays.reduce((sum, day) => sum + day.savingsAud, 0) * scale,
      carbon: monthDays.reduce((sum, day) => sum + day.carbonKg, 0) * scale,
    },
  }
}

/**
 * suggestGoals
 * @param monthly - Baseline savings (AUD) and carbon (kg) for one month
 * @returns Suggested value and allowed range per goal, or null when the figure is zero
 *
 * The range runs from GOAL_SUGGESTION_MONTHS.min to .max months of the
 * baseline, rounded up to whole dollars and whole kilograms.
 */
export function suggestGoals(monthly: Record<GoalKind, number>): GoalSuggestions {
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
 * @param range - Allowed range from the baseline
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
 * @param suggestedKg - The carbon goal suggested from the baseline, if any
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
