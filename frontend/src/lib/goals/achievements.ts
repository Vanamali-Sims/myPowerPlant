/**
 * Reached goals: when one is new, how it is recorded, levels, and what comes next.
 *
 * A goal is identified by its setOn timestamp, so a goal set after reaching
 * one is a new goal with its own entry. Completed entries are never removed.
 */
import { KG_CO2_PER_TREE } from '../../constants/goals'
import { GOAL_KINDS, type CompletedGoal, type GoalKind, type GoalsStore } from '../../types/goals'
import type { GoalRange } from './goalSetup'

/** The completed entry for the goal as it is now set, if it has been reached. */
export function reachedEntry(store: GoalsStore, kind: GoalKind): CompletedGoal | null {
  const goal = store.goals[kind]
  if (!goal) return null
  return store.completedGoals.find((entry) => entry.kind === kind && entry.setOn === goal.setOn) ?? null
}

/**
 * newlyReached
 * @param store - Store with goals and any earlier completed entries
 * @param totals - Totals after the change being saved
 * @returns Goals at or above 100 percent that have no completed entry yet
 */
export function newlyReached(store: GoalsStore, totals: Record<GoalKind, number>): GoalKind[] {
  return GOAL_KINDS.filter((kind) => {
    const goal = store.goals[kind]
    return goal && totals[kind] >= goal.target && !reachedEntry(store, kind)
  })
}

/**
 * recordReached
 * @param store - Store to add to
 * @param kinds - Goals that were just reached
 * @param totals - Totals at the moment they were reached
 * @param reachedOn - Melbourne date, YYYY-MM-DD
 * @param byEdit - True when reached by lowering the goal: recorded, never celebrated
 * @returns The store with one completed entry added per goal
 */
export function recordReached(
  store: GoalsStore,
  kinds: GoalKind[],
  totals: Record<GoalKind, number>,
  reachedOn: string,
  byEdit = false,
): GoalsStore {
  const added: CompletedGoal[] = []
  for (const kind of kinds) {
    const goal = store.goals[kind]
    if (!goal) continue
    const entry: CompletedGoal = {
      kind,
      target: goal.target,
      setOn: goal.setOn,
      reachedOn,
      totalAtReach: totals[kind],
    }
    if (byEdit) entry.reachedByEdit = true
    added.push(entry)
  }
  return { ...store, completedGoals: [...store.completedGoals, ...added] }
}

/**
 * level
 * @param store - Store with completed entries
 * @returns Completed goals plus one; goals reached by lowering them do not count
 */
export function level(store: GoalsStore): number {
  return store.completedGoals.filter((entry) => !entry.reachedByEdit).length + 1
}

/** Approximate number of trees that would absorb this much carbon. */
export function treeEquivalent(carbonKg: number): number {
  return carbonKg / KG_CO2_PER_TREE
}

/**
 * nextGoalRange
 * @param total - What is already counted towards this goal
 * @param range - The usual range from the battery-file baseline
 * @returns A range for the next goal that always starts above the current total
 *
 * Progress continues from the cumulative total, so the next goal adds the
 * usual suggestion on top of it. To be confirmed by the team.
 */
export function nextGoalRange(total: number, range: GoalRange): GoalRange {
  const min = Math.floor(total) + 1
  return {
    min,
    suggested: Math.max(min, Math.ceil(total + range.suggested)),
    max: Math.max(min, Math.ceil(total + range.max)),
  }
}
