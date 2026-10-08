/**
 * One goal's progress: figure, percentage, and an accessible bar.
 */
import { useId } from 'react'
import { progressPercent, progressText } from '../../lib/goals/goalFormat'
import type { GoalKind } from '../../types/goals'

type Props = {
  kind: GoalKind
  total: number
  target: number
}

/**
 * GoalProgress
 * @param props.total - Counted so far for this goal
 * @param props.target - The goal itself
 * @returns Text figure plus a progressbar capped at 100 percent
 *
 * The bar never draws past full, but the text keeps the real figure, so a goal
 * that is beaten still reads as, for example, "130 percent".
 */
export function GoalProgress({ kind, total, target }: Props) {
  const labelId = useId()
  const percent = progressPercent(total, target)
  const shown = Math.min(100, Math.max(0, percent))
  const text = progressText(kind, total, target)
  return (
    <div className={`goal-progress goal-progress--${kind}`}>
      <p className="goal-progress__text" id={labelId}>
        <span>{text}</span>
        <span className="kpi-badge kpi-badge--estimate">Estimate</span>
      </p>
      <div
        className="goal-progress__track"
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(shown)}
        aria-valuetext={text}
      >
        <span className="goal-progress__fill" style={{ width: `${shown}%` }} />
      </div>
    </div>
  )
}
