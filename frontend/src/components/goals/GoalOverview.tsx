/**
 * Saved goals with the growing tree, progress, rate, and finish estimate.
 */
import type { Ref } from 'react'
import { GOAL_LABELS } from '../../constants/goals'
import { formatGoalValue, formatMonthLabel, formatPercent, progressPercent } from '../../lib/goals/goalFormat'
import {
  compareWithPreviousMonth,
  estimateFinish,
  progressRate,
  type MonthComparison,
} from '../../lib/goals/progress'
import { GOAL_KINDS, type GoalEntry, type GoalKind, type MonthRecord } from '../../types/goals'
import { Button } from '../ui/Button'
import { PencilIcon } from '../ui/icons'
import { GoalProgress } from './GoalProgress'
import { GoalTree } from './GoalTree'

type Props = {
  goals: Record<GoalKind, GoalEntry>
  totals: Record<GoalKind, number>
  months: MonthRecord[]
  canEdit: boolean
  onEdit: () => void
  headingRef?: Ref<HTMLHeadingElement>
}

function comparisonText(comparison: MonthComparison): string {
  if (comparison.kind === 'not_enough') {
    return 'A comparison with last month appears once you have two months of history.'
  }
  const month = formatMonthLabel(comparison.month)
  const previous = formatMonthLabel(comparison.previousMonth)
  const amount = formatPercent(Math.abs(comparison.change) * 100)
  if (comparison.direction === 'similar') {
    return `${month} was similar to ${previous}, per day (${amount} difference).`
  }
  return `${month} was ${amount} ${comparison.direction} than ${previous}, per day.`
}

function Insights({ kind, target, months }: { kind: GoalKind; target: number; months: MonthRecord[] }) {
  const rate = progressRate(months, kind, target)
  const finish = estimateFinish(months, kind, target)
  return (
    <ul className="goals-card__insights">
      <li>
        {rate === null
          ? 'Your rate appears after your first complete month.'
          : `On average you gain ${formatPercent(rate)} of this goal per complete month.`}
      </li>
      <li>{comparisonText(compareWithPreviousMonth(months, kind))}</li>
      {finish.kind === 'estimate' ? (
        <li>
          <span>
            Estimated finish: {formatMonthLabel(finish.month)}, based on your last{' '}
            {finish.monthsUsed} complete months.
          </span>
          <span className="kpi-badge kpi-badge--estimate">Estimate</span>
        </li>
      ) : null}
    </ul>
  )
}

/**
 * GoalOverview
 * @param props.goals - Both saved goals
 * @param props.totals - Running totals derived from monthly history
 * @param props.months - Stored monthly records, for rate and finish estimate
 * @returns The tree beside one card per goal
 *
 * The heading takes focus after a save so the confirmation and new state are
 * read out together.
 */
export function GoalOverview({ goals, totals, months, canEdit, onEdit, headingRef }: Props) {
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
      <div className="goals-overview__layout">
        <GoalTree
          carbonPercent={progressPercent(totals.carbon, goals.carbon.target)}
          savingsPercent={progressPercent(totals.savings, goals.savings.target)}
        />
        <div className="goals-overview__cards">
          {GOAL_KINDS.map((kind) => (
            <article key={kind} className="dashboard-card goals-card">
              <p className="eyebrow">{GOAL_LABELS[kind].title}</p>
              <p className="goals-card__target">{formatGoalValue(kind, goals[kind].target)}</p>
              <GoalProgress kind={kind} total={totals[kind]} target={goals[kind].target} />
              <Insights kind={kind} target={goals[kind].target} months={months} />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
