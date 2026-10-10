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

/** Battery the goal figures are checked against, asked the same way as the profile. */
export type GoalBattery = {
  model: string
  units: number
}

/**
 * The battery-file month the goal ranges are worked out from. Only the
 * scaled monthly figures are kept, never the file or its daily rows.
 */
export type GoalBaseline = {
  /** YYYY-MM in Melbourne time. */
  month: string
  /** Complete days in that month the figures came from. */
  days: number
  /** Savings (AUD) and carbon (kg) scaled to an average-length month. */
  monthly: Record<GoalKind, number>
  battery: GoalBattery
  /**
   * Usage rate (AUD per kWh) the person entered from their bill or contract.
   * null means none was given, so the typical Victorian rate is used.
   */
  ratePerKwh: number | null
  /** ISO timestamp of when this baseline was saved. */
  setOn: string
}

export type GoalsStoreV1 = {
  version: 1
  goals: Record<GoalKind, GoalEntry | null>
  completedGoals: CompletedGoal[]
  months: MonthRecord[]
}

export type GoalsStoreV2 = Omit<GoalsStoreV1, 'version'> & {
  version: 2
  /** null for stores moved up from v1, until a battery file is read for goals. */
  baseline: GoalBaseline | null
}

export type GoalsStore = GoalsStoreV2

/**
 * emptyGoalsStore
 * @returns A store with no goals, no history, no completed goals, and no baseline
 */
export const emptyGoalsStore = (): GoalsStore => ({
  version: 2,
  goals: { savings: null, carbon: null },
  completedGoals: [],
  months: [],
  baseline: null,
})
