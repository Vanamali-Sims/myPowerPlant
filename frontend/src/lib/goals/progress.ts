/**
 * Progress over time: tree growth, rate of progress, month comparison, and
 * the estimated finish date. Everything is derived from stored months.
 */
import {
  FINISH_ESTIMATE,
  SAVINGS_FRUIT_STEP_PERCENT,
  SIMILAR_MONTH_BAND,
  TREE_GROWTH_STEP_PERCENT,
  TREE_MAX_STEP,
  TREE_STAGE_LABELS,
} from '../../constants/goals'
import type { GoalKind, MonthRecord } from '../../types/goals'

export type TreeStage = (typeof TREE_STAGE_LABELS)[number]['label']

export type MonthComparison =
  | { kind: 'not_enough'; months: number }
  | {
      kind: 'compared'
      direction: 'higher' | 'lower' | 'similar'
      /** Change in per-day average, as a share of the previous month (0.12 = 12 percent). */
      change: number
      month: string
      previousMonth: string
    }

export type FinishEstimate =
  | { kind: 'hidden'; reason: 'reached' | 'too_little_history' | 'no_progress' | 'too_far' }
  | { kind: 'estimate'; month: string; monthsUsed: number }

const MONTH_VALUE: Record<GoalKind, (record: MonthRecord) => number> = {
  savings: (record) => record.savingsAud,
  carbon: (record) => record.carbonKg,
}

/**
 * treeStep
 * @param carbonPercent - Real carbon progress, which can exceed 100
 * @returns 0 (seed) to 20 (full canopy), one step per 5 percent
 *
 * The small epsilon stops a figure like 9.999999 from floating-point maths
 * falling a step short of a printed 10 percent.
 */
export function treeStep(carbonPercent: number): number {
  if (!(carbonPercent > 0)) return 0
  return Math.min(TREE_MAX_STEP, Math.floor(carbonPercent / TREE_GROWTH_STEP_PERCENT + 1e-9))
}

/** Stage name for a tree step, for text and the aria-label. */
export function stageForStep(step: number): TreeStage {
  return (TREE_STAGE_LABELS.find((stage) => step >= stage.from && step <= stage.to) ??
    TREE_STAGE_LABELS[0]).label
}

/**
 * fruitCount
 * @param savingsPercent - Real savings progress
 * @returns 0 to 20 fruit, one per 5 percent of the savings goal
 */
export function fruitCount(savingsPercent: number): number {
  if (!(savingsPercent > 0)) return 0
  return Math.min(100 / SAVINGS_FRUIT_STEP_PERCENT, Math.floor(savingsPercent / SAVINGS_FRUIT_STEP_PERCENT + 1e-9))
}

/** Stage number, 1 to TREE_STAGE_LABELS.length, for a tree step. */
export function stageNumber(step: number): number {
  return TREE_STAGE_LABELS.findIndex((stage) => step >= stage.from && step <= stage.to) + 1 || 1
}

/** Percent of the carbon goal at which each stage starts, for the stage timeline. */
export function stageStarts(): { label: TreeStage; percent: number }[] {
  return TREE_STAGE_LABELS.map((stage) => ({ label: stage.label, percent: stage.from * TREE_GROWTH_STEP_PERCENT }))
}

/** Months where every day is counted, oldest first. */
export function completeMonths(months: MonthRecord[]): MonthRecord[] {
  return months.filter((record) => record.daysCounted === record.daysInMonth)
}

/**
 * progressRate
 * @param months - Stored monthly records
 * @param kind - Savings or carbon
 * @param target - The goal
 * @returns Average percent of the goal gained per complete month, or null with none
 */
export function progressRate(months: MonthRecord[], kind: GoalKind, target: number): number | null {
  const complete = completeMonths(months)
  if (!complete.length || !(target > 0)) return null
  const total = complete.reduce((sum, record) => sum + MONTH_VALUE[kind](record), 0)
  return (total / complete.length / target) * 100
}

function perDay(record: MonthRecord, kind: GoalKind): number {
  return record.daysCounted ? MONTH_VALUE[kind](record) / record.daysCounted : 0
}

/**
 * compareWithPreviousMonth
 * @param months - Stored monthly records
 * @param kind - Savings or carbon
 * @returns The latest month against the one before it, by average per day
 *
 * Average per day lets a partial month be compared fairly with a full one.
 */
export function compareWithPreviousMonth(months: MonthRecord[], kind: GoalKind): MonthComparison {
  if (months.length < 2) return { kind: 'not_enough', months: months.length }
  const latest = months[months.length - 1]
  const previous = months[months.length - 2]
  const before = perDay(previous, kind)
  const now = perDay(latest, kind)
  const change = before > 0 ? (now - before) / before : now > 0 ? 1 : 0
  const direction =
    Math.abs(change) <= SIMILAR_MONTH_BAND ? 'similar' : change > 0 ? 'higher' : 'lower'
  return { kind: 'compared', direction, change, month: latest.month, previousMonth: previous.month }
}

function addMonths(month: string, count: number): string {
  const [year, index] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, index - 1 + count, 1))
  return date.toISOString().slice(0, 7)
}

/**
 * estimateFinish
 * @param months - Stored monthly records
 * @param kind - Savings or carbon
 * @param target - The goal
 * @returns Month the goal may be reached, or why no estimate is shown
 *
 * Uses the average of the last few complete months. Hidden when the goal is
 * reached, history is too short, there is no progress, or it is too far away.
 */
export function estimateFinish(months: MonthRecord[], kind: GoalKind, target: number): FinishEstimate {
  const total = months.reduce((sum, record) => sum + MONTH_VALUE[kind](record), 0)
  if (total >= target) return { kind: 'hidden', reason: 'reached' }
  const complete = completeMonths(months)
  if (complete.length < FINISH_ESTIMATE.minCompleteMonths) {
    return { kind: 'hidden', reason: 'too_little_history' }
  }
  const recent = complete.slice(-FINISH_ESTIMATE.lookbackMonths)
  const perMonth = recent.reduce((sum, record) => sum + MONTH_VALUE[kind](record), 0) / recent.length
  if (!(perMonth > 0)) return { kind: 'hidden', reason: 'no_progress' }
  const monthsNeeded = Math.ceil((target - total) / perMonth)
  if (monthsNeeded > FINISH_ESTIMATE.maxYears * 12) return { kind: 'hidden', reason: 'too_far' }
  const latest = months[months.length - 1].month
  return { kind: 'estimate', month: addMonths(latest, monthsNeeded), monthsUsed: recent.length }
}
