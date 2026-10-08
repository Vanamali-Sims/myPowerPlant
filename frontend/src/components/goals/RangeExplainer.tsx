/**
 * "How is the allowed range calculated?" disclosure for the goal fields.
 */
import { useId, useState } from 'react'
import { GOAL_LABELS, GOAL_SUGGESTION_MONTHS } from '../../constants/goals'
import { WEEKS_PER_MONTH } from '../../constants/kpiMethodology'
import { formatGoalValue } from '../../lib/goals/goalFormat'
import type { GoalSuggestions } from '../../lib/goals/goalSetup'
import { GOAL_KINDS, type GoalKind } from '../../types/goals'
import { Button } from '../ui/Button'

type Props = {
  suggestions: GoalSuggestions
  /** Monthly profile estimate per goal, the basis for every figure shown. */
  monthly: Record<GoalKind, number>
}

const BASIS: Record<GoalKind, string> = {
  savings: 'the estimated VPP saving the dashboard shows for your household',
  carbon:
    'the estimated energy your household sends to the grid × the Victorian grid emissions factor',
}

function monthWord(count: number): string {
  return count === 1 ? '1 month' : `${count} months`
}

/**
 * RangeExplainer
 * @param props.suggestions - Allowed range and pre-filled suggestion per goal
 * @param props.monthly - Monthly profile estimate per goal
 * @returns Toggle button plus a panel showing exactly how each range is worked out
 *
 * Same mechanism as the carbon examples: a button with aria-expanded that
 * shows or hides one panel.
 */
export function RangeExplainer({ suggestions, monthly }: Props) {
  const panelId = useId()
  const [open, setOpen] = useState(false)

  return (
    <div className="vpp-example goals-examples">
      <Button
        variant="outline-accent"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((state) => !state)}
      >
        How is the allowed range calculated?
      </Button>
      {open ? (
        <div id={panelId} className="vpp-example__panel goals-examples__panel">
          <p className="vpp-example__label">
            Based on your profile estimate{' '}
            <span className="kpi-badge kpi-badge--estimate">Estimate</span>
          </p>
          <p>
            Each goal starts from a monthly estimate for your household: the dashboard’s weekly
            estimate × {WEEKS_PER_MONTH} weeks. The allowed range runs from{' '}
            {monthWord(GOAL_SUGGESTION_MONTHS.min)} to {monthWord(GOAL_SUGGESTION_MONTHS.max)} of
            that estimate, and the value filled in for you is{' '}
            {monthWord(GOAL_SUGGESTION_MONTHS.suggested)}. Figures are rounded up to whole
            dollars or kilograms.
          </p>
          {GOAL_KINDS.map((kind) => {
            const range = suggestions[kind]
            return (
              <div key={kind} className="goals-range__goal">
                <p className="goals-range__title">{GOAL_LABELS[kind].title}</p>
                {range ? (
                  <ul className="goals-examples__list">
                    <li>
                      Monthly estimate: about {formatGoalValue(kind, monthly[kind])}, from{' '}
                      {BASIS[kind]}
                    </li>
                    <li>
                      Lowest: {monthWord(GOAL_SUGGESTION_MONTHS.min)} ={' '}
                      {formatGoalValue(kind, range.min)}
                    </li>
                    <li>
                      Filled in for you: {monthWord(GOAL_SUGGESTION_MONTHS.suggested)} ={' '}
                      {formatGoalValue(kind, range.suggested)}
                    </li>
                    <li>
                      Highest: {monthWord(GOAL_SUGGESTION_MONTHS.max)} ={' '}
                      {formatGoalValue(kind, range.max)}
                    </li>
                  </ul>
                ) : (
                  <p>Your profile estimate for this goal is zero, so there is no range yet.</p>
                )}
              </div>
            )
          })}
          <p className="goals-range__note">
            This comes from your profile, not from your battery files, so your real progress may
            be higher or lower.
          </p>
        </div>
      ) : null}
    </div>
  )
}
