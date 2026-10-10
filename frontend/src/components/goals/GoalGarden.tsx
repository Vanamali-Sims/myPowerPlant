/**
 * Goals hero: savings and carbon cards either side of the tree, and the
 * stage timeline underneath. Everything is derived from the stored months.
 */
import type { Ref } from 'react'
import { GOALS_PAGE, GOAL_LABELS, TREE_STAGE_LABELS } from '../../constants/goals'
import {
  formatDayLabel,
  formatGoalAud,
  formatGoalKgAmount,
  progressPercent,
  progressText,
} from '../../lib/goals/goalFormat'
import {
  estimateFinish,
  fruitCount,
  progressRate,
  ripeningFruit,
  stageForStep,
  stageNumber,
  stageStarts,
  treeStep,
} from '../../lib/goals/progress'
import type { CompletedGoal, GoalEntry, GoalKind, MonthRecord } from '../../types/goals'
import { Button } from '../ui/Button'
import { PencilIcon } from '../ui/icons'
import { GoalTree } from './GoalTree'

type Props = {
  goals: Record<GoalKind, GoalEntry>
  totals: Record<GoalKind, number>
  months: MonthRecord[]
  reached: Record<GoalKind, CompletedGoal | null>
  onSetNewGoal: (kind: GoalKind) => void
  onViewAchievement: (kind: GoalKind) => void
  /** Opens the goal form; the button is hidden when goals cannot be edited yet. */
  onEdit?: () => void
  headingRef?: Ref<HTMLHeadingElement>
}

function shortMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-AU', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** Ring with the percent in the middle; also the accessible progress bar for the goal. */
function GoalRing({ kind, total, target }: { kind: GoalKind; total: number; target: number }) {
  const percent = progressPercent(total, target)
  const shown = Math.min(100, Math.max(0, percent))
  const radius = 30
  const circumference = 2 * Math.PI * radius
  return (
    <div
      className={`goal-ring goal-ring--${kind}`}
      role="progressbar"
      aria-label={GOAL_LABELS[kind].title}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={progressText(kind, total, target)}
    >
      <svg viewBox="0 0 76 76" aria-hidden="true">
        <circle className="goal-ring__track" cx="38" cy="38" r={radius} />
        <circle
          className="goal-ring__fill"
          cx="38"
          cy="38"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          transform="rotate(-90 38 38)"
        />
      </svg>
      <span className="goal-ring__label" aria-hidden="true">
        <strong>{Math.round(percent)}%</strong>
        <small>of goal</small>
      </span>
    </div>
  )
}

type CardProps = {
  kind: GoalKind
  goal: GoalEntry
  total: number
  months: MonthRecord[]
  reached: CompletedGoal | null
  onSetNewGoal: () => void
  onViewAchievement: () => void
}

function GoalCard({ kind, goal, total, months, reached, onSetNewGoal, onViewAchievement }: CardProps) {
  const percent = progressPercent(total, goal.target)
  const rate = progressRate(months, kind, goal.target)
  const finish = estimateFinish(months, kind, goal.target)
  const step = treeStep(percent)
  const detail =
    kind === 'savings'
      ? [plural(fruitCount(percent), 'orange'), ripeningFruit(percent) ? '1 ripening' : '']
          .filter(Boolean)
          .join(' · ')
      : `Stage ${stageNumber(step)} of ${TREE_STAGE_LABELS.length} · ${capitalise(stageForStep(step))}`
  const onTrack =
    finish.kind === 'estimate'
      ? shortMonth(finish.month)
      : finish.reason === 'too_little_history'
        ? 'After 2 full months'
        : 'Not yet'

  return (
    <article className={`goal-card goal-card--${kind}`} aria-labelledby={`goal-card-${kind}`}>
      <div className="goal-card__head">
        <p id={`goal-card-${kind}`} className="goal-card__eyebrow">
          <span className="goal-card__dot" aria-hidden="true" />
          {GOAL_LABELS[kind].title}
        </p>
        <span className="goal-card__badge">Estimate</span>
      </div>
      <div className="goal-card__body">
        <GoalRing kind={kind} total={total} target={goal.target} />
        <div className="goal-card__figures">
          <p className="goal-card__total">
            {kind === 'savings' ? formatGoalAud(total) : formatGoalKgAmount(total)}
          </p>
          <p className="goal-card__target">
            of {kind === 'savings' ? formatGoalAud(goal.target) : `${formatGoalKgAmount(goal.target)} CO₂e`}
          </p>
          <p className="goal-card__detail">{detail}</p>
        </div>
      </div>
      {reached ? (
        <div className="goal-card__reached">
          <p className="goal-card__reached-label">Reached on {formatDayLabel(reached.reachedOn)}</p>
          <div className="goal-card__reached-actions">
            <Button variant="primary" onClick={onSetNewGoal}>
              Set a new goal
            </Button>
            <Button variant="secondary" onClick={onViewAchievement}>
              View my achievement
            </Button>
          </div>
        </div>
      ) : (
        <dl className="goal-card__stats">
          <div>
            <dt>Average pace</dt>
            <dd>{rate === null ? 'After 1 full month' : `~${Math.round(rate)}% / month`}</dd>
          </div>
          <div>
            <dt>On track for</dt>
            <dd>{onTrack}</dd>
          </div>
        </dl>
      )}
    </article>
  )
}

const STAGE_GLYPHS: Record<string, string> = {
  seed: 'M12 15c-2.2 0-3.5-1.6-3.5-3.4C8.5 9.3 12 6 12 6s3.5 3.3 3.5 5.6c0 1.8-1.3 3.4-3.5 3.4z',
  sprout: 'M12 18v-6m0 0c0-2.5-2-4-4.5-4 0 2.5 2 4 4.5 4zm0 0c0-2.5 2-4 4.5-4 0 2.5-2 4-4.5 4z',
  sapling: 'M12 19v-7m0 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  'young tree': 'M12 19v-5m-4.5 0h9L12 5z',
  harvest: 'M12 19v-5m0 0a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm-1.5-5.5h.01m3 1.5h.01',
}

/** Where a carbon percent sits on the evenly spaced stage track, 0 to 100. */
function trackPosition(percent: number, starts: number[]): number {
  const last = starts.length - 1
  if (percent >= starts[last]) return 100
  for (let i = 0; i < last; i += 1) {
    if (percent < starts[i + 1]) {
      const within = (percent - starts[i]) / (starts[i + 1] - starts[i])
      return ((i + Math.max(0, within)) / last) * 100
    }
  }
  return 100
}

function StageTimeline({ total, target }: { total: number; target: number }) {
  const percent = progressPercent(total, target)
  const stages = stageStarts()
  const current = stageNumber(treeStep(percent)) - 1
  const position = trackPosition(percent, stages.map((stage) => stage.percent))
  return (
    <div className="goal-stages">
      <div className="goal-stages__track" aria-hidden="true">
        <span className="goal-stages__done" style={{ width: `${position}%` }} />
        <span className="goal-stages__today" style={{ left: `${position}%` }}>
          <span className="goal-stages__today-label">Today · {formatGoalKgAmount(total)}</span>
        </span>
      </div>
      <ol className="goal-stages__list" aria-label="Tree stages">
        {stages.map((stage, index) => (
          <li
            key={stage.label}
            className={`goal-stages__stage${index <= current ? ' is-reached' : ''}${
              index === current ? ' is-current' : ''
            }`}
            aria-current={index === current ? 'step' : undefined}
          >
            <span className="goal-stages__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d={STAGE_GLYPHS[stage.label]} />
              </svg>
            </span>
            <span className="goal-stages__name">{capitalise(stage.label)}</span>
            <span className="goal-stages__kg">{formatGoalKgAmount((target * stage.percent) / 100)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * GoalGarden
 * @param props.goals - Both saved goals
 * @param props.totals - Running totals derived from monthly history
 * @returns The dark goals hero with cards, tree, and stage timeline
 *
 * The visually hidden heading takes focus after a save so the confirmation
 * and new state are read out together.
 */
export function GoalGarden({
  goals,
  totals,
  months,
  reached,
  onSetNewGoal,
  onViewAchievement,
  onEdit,
  headingRef,
}: Props) {
  return (
    <section className="goals-garden" aria-labelledby="goals-overview-title">
      <h2 id="goals-overview-title" className="visually-hidden" ref={headingRef} tabIndex={-1}>
        Your goals
      </h2>
      <div className="goals-garden__layout">
        <div className="goals-garden__side">
          <p className="goals-garden__legend">
            {GOALS_PAGE.legend[0]}
            <br />
            {GOALS_PAGE.legend[1]}
          </p>
          <GoalCard
            kind="savings"
            goal={goals.savings}
            total={totals.savings}
            months={months}
            reached={reached.savings}
            onSetNewGoal={() => onSetNewGoal('savings')}
            onViewAchievement={() => onViewAchievement('savings')}
          />
        </div>
        <div className="goals-garden__tree">
          <GoalTree
            carbonPercent={progressPercent(totals.carbon, goals.carbon.target)}
            savingsPercent={progressPercent(totals.savings, goals.savings.target)}
            showCaption={false}
          />
        </div>
        <div className="goals-garden__side">
          <div className="goals-garden__actions">
            {onEdit ? (
              <Button variant="secondary" className="goals-garden__edit" onClick={onEdit}>
                <PencilIcon width={14} height={14} />
                {GOALS_PAGE.edit}
              </Button>
            ) : null}
          </div>
          <GoalCard
            kind="carbon"
            goal={goals.carbon}
            total={totals.carbon}
            months={months}
            reached={reached.carbon}
            onSetNewGoal={() => onSetNewGoal('carbon')}
            onViewAchievement={() => onViewAchievement('carbon')}
          />
        </div>
      </div>
      <StageTimeline total={totals.carbon} target={goals.carbon.target} />
    </section>
  )
}
