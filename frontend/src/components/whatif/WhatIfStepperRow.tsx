/**
 * Shared +/- stepper row for What if editors (household figures, panel count).
 *
 * Pure editor — follows the draft/saved split used across What if: an empty
 * draft falls back to the saved value, which falls back to a sensible start.
 */
import { clampNumber } from '../../constants/validation'
import { parseCount } from '../../lib/kpis'

export type WhatIfStepperRowProps = {
  label: string
  saved: string
  draft: string
  min: number
  max: number
  startAt: number
  /** Amount added or removed by each button. Defaults to 1. */
  step?: number
  onDraft: (value: string) => void
}

function stepperDisplay(draft: string, saved: string, min: number, max: number): number | null {
  if (draft.trim()) return clampNumber(parseCount(draft), min, max)
  if (saved.trim()) return clampNumber(parseCount(saved), min, max)
  return null
}

function nowLine(saved: string, startAt: number): string {
  if (saved.trim()) return `Now: ${saved.trim()}`
  return `Now: not set · start at ${startAt}`
}

/**
 * WhatIfStepperRow
 */
export function WhatIfStepperRow({
  label,
  saved,
  draft,
  min,
  max,
  startAt,
  step = 1,
  onDraft,
}: WhatIfStepperRowProps) {
  const shown = stepperDisplay(draft, saved, min, max)
  const decreaseDisabled = shown === null || shown <= min

  function decrease() {
    if (shown === null) return
    if (!saved.trim() && draft.trim() === String(shown) && shown === startAt) {
      onDraft('')
      return
    }
    const next = shown - step
    onDraft(String(next < min ? min : next))
  }

  function increase() {
    if (shown === null) {
      onDraft(String(startAt))
      return
    }
    onDraft(String(Math.min(max, shown + step)))
  }

  return (
    <div className="chat-whatif-household__row">
      <div className="chat-whatif-household__label-block">
        <p className="chat-whatif-household__label">{label}</p>
        <p className="chat-whatif-household__current">{nowLine(saved, startAt)}</p>
      </div>
      <div className="ui-stepper chat-whatif-household__stepper">
        <button
          type="button"
          className="ui-stepper__btn"
          aria-label={`Decrease ${label}`}
          disabled={decreaseDisabled}
          onClick={decrease}
        >
          −
        </button>
        <span className="ui-stepper__value" aria-live="polite">
          {shown === null ? '–' : shown}
        </span>
        <button
          type="button"
          className="ui-stepper__btn"
          aria-label={`Increase ${label}`}
          disabled={shown !== null && shown >= max}
          onClick={increase}
        >
          +
        </button>
      </div>
    </div>
  )
}
