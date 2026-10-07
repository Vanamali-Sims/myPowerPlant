/**
 * Saved goals with progress so far, and the Edit goals action.
 */
import type { Ref } from 'react'
import { GOAL_LABELS } from '../../constants/goals'
import { formatGoalValue } from '../../lib/goals/goalFormat'
import { GOAL_KINDS, type GoalEntry, type GoalKind } from '../../types/goals'
import { Button } from '../ui/Button'
import { PencilIcon } from '../ui/icons'
import { GoalProgress } from './GoalProgress'

type Props = {
  goals: Record<GoalKind, GoalEntry>
  totals: Record<GoalKind, number>
  canEdit: boolean
  onEdit: () => void
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * GoalOverview
 * @param props.goals - Both saved goals
 * @param props.totals - Running totals derived from monthly history
 * @returns One card per goal with its progress
 *
 * The heading takes focus after a save so the confirmation and new state are
 * read out together.
 */
export function GoalOverview({ goals, totals, canEdit, onEdit, headingRef }: Props) {
  return (
    <section className="goals-overview" aria-labelledby="goals-overview-title">
      <div className="goals-overview__head">
        <h2 id="goals-overview-title" ref={headingRef} tabIndex={-1}>
          Your goals
        </h2>
        {canEdit ? (
          <Button variant="edit" onClick={onEdit}>
            <PencilIcon width={14} height={14} />
            Edit goals
          </Button>
        ) : null}
      </div>
      <div className="goals-overview__grid">
        {GOAL_KINDS.map((kind) => (
          <article key={kind} className="dashboard-card goals-card">
            <p className="eyebrow">{GOAL_LABELS[kind].title}</p>
            <p className="goals-card__target">{formatGoalValue(kind, goals[kind].target)}</p>
            <GoalProgress kind={kind} total={totals[kind]} target={goals[kind].target} />
          </article>
        ))}
      </div>
    </section>
  )
}
