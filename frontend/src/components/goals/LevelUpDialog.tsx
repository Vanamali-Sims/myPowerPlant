/**
 * Level-up message for a reached goal, with a comparison of what was achieved.
 */
import { useEffect, useRef } from 'react'
import { GOAL_LABELS, TREE_FIGURE_SOURCE } from '../../constants/goals'
import { treeEquivalent } from '../../lib/goals/achievements'
import { formatGoalAud, formatGoalKg } from '../../lib/goals/goalFormat'
import { useReducedMotion } from '../../lib/useReducedMotion'
import type { GoalKind } from '../../types/goals'
import { Button } from '../ui/Button'
import { Confetti } from './Confetti'

export type Achievement = {
  kinds: GoalKind[]
  level: number
  totals: Record<GoalKind, number>
  /** True only straight after Confirm and save; never when viewed again. */
  celebrate: boolean
}

type Props = {
  achievement: Achievement | null
  onNextStep: (kinds: GoalKind[]) => void
  onClose: () => void
}

const TREES = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 })

function title(kinds: GoalKind[]): string {
  if (kinds.length > 1) return 'You reached both goals'
  return `You reached your ${GOAL_LABELS[kinds[0]].title.toLowerCase()}`
}

/**
 * LevelUpDialog
 * @param props.achievement - What was reached, or null when closed
 * @returns A native modal dialog, same pattern as the clear dialog
 *
 * Confetti shows only for a new achievement and never under reduced motion.
 * It sits behind the content, ignores the pointer, and is hidden from screen
 * readers, so the buttons and focus trap work as normal.
 */
export function LevelUpDialog({ achievement, onNextStep, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const reduced = useReducedMotion()
  const open = achievement !== null

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return
    if (open) {
      if (!node.open) node.showModal()
      nextRef.current?.focus()
    } else if (node.open) {
      node.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="vpp-dialog goals-levelup"
      aria-labelledby="goals-levelup-title"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      {achievement && achievement.celebrate && !reduced ? <Confetti /> : null}
      {achievement ? (
        <div className="vpp-dialog__panel goals-levelup__panel">
          <header className="vpp-dialog__header">
            <div>
              <p className="eyebrow">Level {achievement.level}</p>
              <h3 id="goals-levelup-title">{title(achievement.kinds)}</h3>
            </div>
          </header>
          <div className="vpp-dialog__body">
            <p className="vpp-dialog__lede">
              Well done. You are now at level {achievement.level}. Here is what your battery has
              achieved so far.
            </p>
            <dl className="goals-levelup__facts">
              <div>
                <dt>Total estimated savings</dt>
                <dd>
                  {formatGoalAud(achievement.totals.savings)}{' '}
                  <span className="kpi-badge kpi-badge--estimate">Estimate</span>
                </dd>
              </div>
              <div>
                <dt>Total estimated carbon avoided</dt>
                <dd>
                  {formatGoalKg(achievement.totals.carbon)}{' '}
                  <span className="kpi-badge kpi-badge--estimate">Estimate</span>
                </dd>
              </div>
              <div>
                <dt>About the same as</dt>
                <dd>
                  {TREES.format(treeEquivalent(achievement.totals.carbon))} trees{' '}
                  <span className="kpi-badge kpi-badge--estimate">Estimate</span>
                </dd>
              </div>
            </dl>
            <p className="vpp-term__meta">
              <span>{TREE_FIGURE_SOURCE}</span>
            </p>
          </div>
          <footer className="vpp-dialog__footer goals-clear-dialog__footer">
            <button
              ref={nextRef}
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={() => onNextStep(achievement.kinds)}
            >
              Let's take the next step
            </button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </footer>
        </div>
      ) : null}
    </dialog>
  )
}
