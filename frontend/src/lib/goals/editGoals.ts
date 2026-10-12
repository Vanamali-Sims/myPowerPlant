/**
 * Applying new goal targets, shared by the Goals tab and the improve-flow profile.
 */
import { GOAL_KINDS, type GoalEntry, type GoalKind, type GoalsStore } from '../../types/goals'
import { newlyReached, reachedEntry, recordReached } from './achievements'
import { deriveTotals } from './goalTotals'

/**
 * withGoalTargets
 * @param store - Store before the change
 * @param targets - New targets; kinds left out keep their goal
 * @param replacing - Kinds being replaced after they were reached
 * @param setOn - ISO timestamp for goals that count as new
 * @returns The goals with the targets applied
 *
 * A reached goal that changes becomes a new goal (new setOn), so its
 * completed entry stays as it was. Otherwise an edit keeps the original setOn.
 */
export function withGoalTargets(
  store: GoalsStore,
  targets: Partial<Record<GoalKind, number>>,
  replacing: GoalKind[],
  setOn: string,
): Record<GoalKind, GoalEntry | null> {
  const next = { ...store.goals }
  for (const kind of GOAL_KINDS) {
    const target = targets[kind]
    if (target === undefined) continue
    const existing = store.goals[kind]
    const isNew =
      !existing || replacing.includes(kind) || (reachedEntry(store, kind) && existing.target !== target)
    next[kind] = { target, setOn: isNew || !existing ? setOn : existing.setOn }
  }
  return next
}

/**
 * editGoals
 * @param store - Store with saved goals
 * @param targets - New targets
 * @param setOn - ISO timestamp for goals that count as new
 * @param today - Melbourne date, YYYY-MM-DD
 * @returns The store with the edit applied; lowering a goal to or below the
 *   total records it as reached by edit, never celebrated
 */
export function editGoals(
  store: GoalsStore,
  targets: Partial<Record<GoalKind, number>>,
  setOn: string,
  today: string,
): GoalsStore {
  const next: GoalsStore = { ...store, goals: withGoalTargets(store, targets, [], setOn) }
  const totals = deriveTotals(next.months)
  const byEdit = newlyReached(next, totals)
  return byEdit.length ? recordReached(next, byEdit, totals, today, true) : next
}
