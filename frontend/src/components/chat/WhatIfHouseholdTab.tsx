/**
 * Household tab inside What if: edit people and appliance cycles together,
 * then run one combined comparison against the saved profile.
 */
import { FIELD_BOUNDS, clampNumber } from '../../constants/validation'
import { parseCount } from '../../lib/kpis'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'

type RowProps = {
  label: string
  saved: string
  draft: string
  min: number
  max: number
  onDraft: (value: string) => void
}

function stepperValue(draft: string, saved: string, min: number, max: number): number {
  if (draft.trim()) return clampNumber(parseCount(draft), min, max)
  if (saved.trim()) return clampNumber(parseCount(saved), min, max)
  return min
}

function HouseholdStepperRow({ label, saved, draft, min, max, onDraft }: RowProps) {
  const savedLabel = saved.trim() ? saved.trim() : 'not set'
  const shown = stepperValue(draft, saved, min, max)

  return (
    <div className="chat-whatif-household__row">
      <div className="chat-whatif-household__head">
        <span className="chat-actions__label">{label}</span>
        <span className="chat-whatif-household__current">Currently {savedLabel}</span>
      </div>
      <div className="ui-stepper chat-whatif-household__stepper">
        <button
          type="button"
          className="ui-stepper__btn"
          aria-label={`Decrease ${label}`}
          onClick={() => onDraft(String(Math.max(min, shown - 1)))}
        >
          −
        </button>
        <span className="ui-stepper__value" aria-live="polite">{shown}</span>
        <button
          type="button"
          className="ui-stepper__btn"
          aria-label={`Increase ${label}`}
          onClick={() => onDraft(String(Math.min(max, shown + 1)))}
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
  const hasChanges =
    peopleDraft.trim() !== profile.people.trim() ||
    dishwasherDraft.trim() !== profile.dishwasherCyclesPerWeek.trim() ||
    washerDraft.trim() !== profile.washerCyclesPerWeek.trim()

  return (
    <div className="chat-whatif-household">
      <HouseholdStepperRow
        label="People in the home"
        saved={profile.people}
        draft={peopleDraft}
        min={FIELD_BOUNDS.people.min}
        max={FIELD_BOUNDS.people.max}
        onDraft={onPeopleDraft}
      />
      <HouseholdStepperRow
        label="Dishwasher cycles per week"
        saved={profile.dishwasherCyclesPerWeek}
        draft={dishwasherDraft}
        min={FIELD_BOUNDS.dishwasherCyclesPerWeek.min}
        max={FIELD_BOUNDS.dishwasherCyclesPerWeek.max}
        onDraft={onDishwasherDraft}
      />
      <HouseholdStepperRow
        label="Washing machine cycles per week"
        saved={profile.washerCyclesPerWeek}
        draft={washerDraft}
        min={FIELD_BOUNDS.washerCyclesPerWeek.min}
        max={FIELD_BOUNDS.washerCyclesPerWeek.max}
        onDraft={onWasherDraft}
      />
      <Button
        type="button"
        variant="primary"
        className="chat-actions__all"
        disabled={!hasChanges}
        onClick={onCompare}
      >
        Compare household change
      </Button>
    </div>
  )
}
