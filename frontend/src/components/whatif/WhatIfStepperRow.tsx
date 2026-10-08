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
  /** Yearly payment change from this control alone, when it differs from saved. */
  deltaAud?: number | null
  onDraft: (value: string) => void
}

function stepperDisplay(draft: string, saved: string, min: number, max: number): number | null {
  if (draft.trim()) return clampNumber(parseCount(draft), min, max)
  if (saved.trim()) return clampNumber(parseCount(saved), min, max)
  return null
}

function savedNumber(saved: string, min: number, max: number): number | null {
  if (!saved.trim()) return null
  return clampNumber(parseCount(saved), min, max)
}

function moneyDelta(value: number): string {
  const rounded = Math.round(Math.abs(value))
  return `${value > 0 ? '+' : '−'}$${rounded.toLocaleString('en-AU')}`
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
  deltaAud = null,
  onDraft,
}: WhatIfStepperRowProps) {
  const shown = stepperDisplay(draft, saved, min, max)
  const savedShown = savedNumber(saved, min, max)
  const changed = shown !== null && shown !== savedShown
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

  const chip =
    changed && deltaAud != null && Math.abs(deltaAud) >= 1 ? (
      <b className={`whatif-dchip ${deltaAud > 0 ? 'is-up' : 'is-down'}`} title="This change on its own">
        {moneyDelta(deltaAud)}
      </b>
    ) : null

  return (
    <div className={`whatif-row${changed ? ' is-changed' : ''}`}>
      <div className="whatif-lab">
        <span>{label}</span>
        <small className="whatif-meta">
          {changed ? `was ${saved.trim() || startAt}` : ''}
          {chip}
        </small>
      </div>
      <div className="whatif-stepper">
        <button type="button" aria-label={`Decrease ${label}`} disabled={decreaseDisabled} onClick={decrease}>
          −
        </button>
        <output>{shown === null ? '–' : shown}</output>
        <button
          type="button"
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
