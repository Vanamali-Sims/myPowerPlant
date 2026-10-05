/**
 * Household tab inside What if: edit people and appliance cycles together,
 * then run one combined comparison against the saved profile.
 */
import { FIELD_BOUNDS, clampNumber } from '../../constants/validation'
import { hasHouseholdDraftChanges } from '../../lib/chat/householdDraft'
import { parseCount } from '../../lib/kpis'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'

type RowProps = {
  label: string
  saved: string
  draft: string
  min: number
  max: number
  startAt: number
  onDraft: (value: string) => void
}

function stepperDisplay(
  draft: string,
  saved: string,
  min: number,
  max: number,
): number | null {
  if (draft.trim()) return clampNumber(parseCount(draft), min, max)
  if (saved.trim()) return clampNumber(parseCount(saved), min, max)
  return null
}

function nowLine(saved: string, startAt: number): string {
  if (saved.trim()) return `Now: ${saved.trim()}`
  return `Now: not set · start at ${startAt}`
}

function HouseholdStepperRow({ label, saved, draft, min, max, startAt, onDraft }: RowProps) {
  const shown = stepperDisplay(draft, saved, min, max)
  const decreaseDisabled = shown === null || shown <= min

  function decrease() {
    if (shown === null) return
    if (!saved.trim() && draft.trim() === String(shown) && shown === startAt) {
      onDraft('')
      return
    }
    const next = shown - 1
    if (next < min) return
    onDraft(String(next))
  }

  function increase() {
    if (shown === null) {
      onDraft(String(startAt))
      return
    }
    onDraft(String(Math.min(max, shown + 1)))
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

type Props = {
  profile: ProfileData
  peopleDraft: string
  dishwasherDraft: string
  washerDraft: string
  onPeopleDraft: (value: string) => void
  onDishwasherDraft: (value: string) => void
  onWasherDraft: (value: string) => void
  onCompare: () => void
}

/**
 * WhatIfHouseholdTab
 */
export function WhatIfHouseholdTab({
  profile,
  peopleDraft,
  dishwasherDraft,
  washerDraft,
  onPeopleDraft,
  onDishwasherDraft,
  onWasherDraft,
  onCompare,
}: Props) {
  const hasChanges = hasHouseholdDraftChanges(
    profile,
    peopleDraft,
    dishwasherDraft,
    washerDraft,
  )

  return (
    <div className="chat-whatif-household">
      <div className="chat-whatif-household__body">
        <HouseholdStepperRow
          label="People in the home"
          saved={profile.people}
          draft={peopleDraft}
          min={FIELD_BOUNDS.people.min}
          max={FIELD_BOUNDS.people.max}
          startAt={FIELD_BOUNDS.people.example}
          onDraft={onPeopleDraft}
        />
        <HouseholdStepperRow
          label="Dishwasher cycles per week"
          saved={profile.dishwasherCyclesPerWeek}
          draft={dishwasherDraft}
          min={FIELD_BOUNDS.dishwasherCyclesPerWeek.min}
          max={FIELD_BOUNDS.dishwasherCyclesPerWeek.max}
          startAt={2}
          onDraft={onDishwasherDraft}
        />
        <HouseholdStepperRow
          label="Washing machine cycles per week"
          saved={profile.washerCyclesPerWeek}
          draft={washerDraft}
          min={FIELD_BOUNDS.washerCyclesPerWeek.min}
          max={FIELD_BOUNDS.washerCyclesPerWeek.max}
          startAt={2}
          onDraft={onWasherDraft}
        />
      </div>
      <footer className="chat-whatif-household__footer">
        <Button
          type="button"
          variant="primary"
          className="chat-actions__all"
          disabled={!hasChanges}
          onClick={onCompare}
        >
          Compare household change
        </Button>
      </footer>
    </div>
  )
}
