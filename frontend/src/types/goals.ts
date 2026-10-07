/**
 * Goal tracking types and the empty-store factory.
 *
 * Only monthly figures are stored. Daily figures from an upload live in memory
 * until Confirm or Cancel and are never written to the device.
 */

export type GoalKind = 'savings' | 'carbon'

export const GOAL_KINDS: readonly GoalKind[] = ['savings', 'carbon']

export type GoalEntry = {
  /** AUD for savings, kg CO2e for carbon. */
  target: number
  /** ISO timestamp of when this goal was first set. Edits keep it. */
  setOn: string
}

/** Inclusive Melbourne calendar dates, YYYY-MM-DD. */
export type DateRange = [start: string, end: string]

export type MonthRecord = {
  /** YYYY-MM in Melbourne time. */
  month: string
  daysInMonth: number
  daysCounted: number
  /** Merged, sorted, non-overlapping ranges of the days counted. */
  coveredRanges: DateRange[]
  savingsAud: number
  carbonKg: number
  dischargeKwh: number
  /** null when no intake column was ever supplied for this month. */
  intakeKwh: number | null
  sourceId: string
  updatedOn: string
  revisedOn?: string
}

export type CompletedGoal = {
  kind: GoalKind
  target: number
  setOn: string
  reachedOn: string
  totalAtReach: number
  /** Reached by lowering the goal: recorded, never celebrated, not counted toward the level. */
  reachedByEdit?: true
}

export type GoalsStoreV1 = {
  version: 1
  goals: Record<GoalKind, GoalEntry | null>
  completedGoals: CompletedGoal[]
  months: MonthRecord[]
}

export type GoalsStore = GoalsStoreV1

/**
 * emptyGoalsStore
 * @returns A store with no goals, no history, and no completed goals
 */
export const emptyGoalsStore = (): GoalsStore => ({
  version: 1,
  goals: { savings: null, carbon: null },
  completedGoals: [],
  months: [],
})
