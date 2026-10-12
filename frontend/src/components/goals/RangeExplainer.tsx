/**
 * "How is the allowed range calculated?" disclosure for the goal fields.
 */
import { useId, useState } from 'react'
import { BASELINE_RULES, GOAL_LABELS, GOAL_SUGGESTION_MONTHS } from '../../constants/goals'
import type { CalculationContext } from '../../lib/goals/calculate'
import { formatGoalValue, formatMonthLabel, formatRate } from '../../lib/goals/goalFormat'
import type { GoalSuggestions } from '../../lib/goals/goalSetup'
import { GOAL_KINDS, type GoalBaseline, type GoalKind } from '../../types/goals'
import { Button } from '../ui/Button'

type Props = {
  suggestions: GoalSuggestions
  /** Battery-file month, the basis for every figure shown. */
  baseline: Pick<GoalBaseline, 'month' | 'days' | 'monthly'>
  context: CalculationContext
}

function basis(kind: GoalKind, context: CalculationContext): string {
  if (kind === 'carbon') {
    return `the energy your battery gave out × the Victorian grid emissions factor (${context.factor} kg CO2e per kWh)`
  }
  const rate =
    context.rateKind === 'from_you'
      ? `your usage rate of ${formatRate(context.rate)}`
      : `the typical Victorian rate of ${formatRate(context.rate)}, because no rate was entered`
  return `the energy your battery gave out × ${rate}`
}

function monthWord(count: number): string {
  return count === 1 ? '1 month' : `${count} months`
}

/**
 * RangeExplainer
 * @param props.suggestions - Allowed range and pre-filled suggestion per goal
 * @param props.baseline - The battery-file month and its scaled monthly figures
 * @param props.context - Rate and emissions factor the month was valued with
 * @returns Toggle button plus a panel showing exactly how each range is worked out
 *
 * Same mechanism as the carbon examples: a button with aria-expanded that
 * shows or hides one panel.
 */
export function RangeExplainer({ suggestions, baseline, context }: Props) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const month = formatMonthLabel(baseline.month)

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
            Based on your battery file for {month}{' '}
            <span className="kpi-badge kpi-badge--estimate">Estimate</span>
          </p>
          <p>
            Each goal starts from one month of your battery. Only energy it gave out (discharge)
            counts; energy it took in does not. The total from the {baseline.days}{' '}
            complete days in {month} ÷ {baseline.days} × {BASELINE_RULES.daysPerMonth} days, so a
            part-month still gives a full-month figure. The allowed range runs from{' '}
            {monthWord(GOAL_SUGGESTION_MONTHS.min)} to {monthWord(GOAL_SUGGESTION_MONTHS.max)} of
            that figure, and the value filled in for you is{' '}
            {monthWord(GOAL_SUGGESTION_MONTHS.suggested)}. {month} is already counted towards your
            goal, which is why the lowest goal is {monthWord(GOAL_SUGGESTION_MONTHS.min)}. Figures
            are rounded up to whole dollars or kilograms.
          </p>
          {GOAL_KINDS.map((kind) => {
            const range = suggestions[kind]
            return (
              <div key={kind} className="goals-range__goal">
                <p className="goals-range__title">{GOAL_LABELS[kind].title}</p>
                {range ? (
                  <ul className="goals-examples__list">
                    <li>
                      One month: about {formatGoalValue(kind, baseline.monthly[kind])}, from{' '}
                      {basis(kind, context)}
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
                  <p>Your battery file shows nothing counted for this goal, so there is no range yet.</p>
                )}
              </div>
            )
          })}
          <p className="goals-range__note">
            One month is a guide, not a forecast. Solar and battery use change with the seasons,
            so your real progress may be higher or lower.
          </p>
        </div>
      ) : null}
    </div>
  )
}
