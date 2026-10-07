/**
 * Household tab on the What if page: edit people and appliance cycles.
 *
 * Pure editor — the page around it recomputes the live comparison on every
 * change, so this component only owns the stepper rows.
 */
import { FIELD_BOUNDS } from '../../constants/validation'
import type { ProfileData } from '../../types/profile'
import { WhatIfStepperRow } from './WhatIfStepperRow'

type Props = {
  profile: ProfileData
  peopleDraft: string
  dishwasherDraft: string
  washerDraft: string
  peopleDelta?: number | null
  dishwasherDelta?: number | null
  washerDelta?: number | null
  onPeopleDraft: (value: string) => void
  onDishwasherDraft: (value: string) => void
  onWasherDraft: (value: string) => void
}

/**
 * WhatIfHouseholdTab
 */
export function WhatIfHouseholdTab({
  profile,
  peopleDraft,
  dishwasherDraft,
  washerDraft,
  peopleDelta = null,
  dishwasherDelta = null,
  washerDelta = null,
  onPeopleDraft,
  onDishwasherDraft,
  onWasherDraft,
}: Props) {
  return (
    <>
      <WhatIfStepperRow
        label="People"
        saved={profile.people}
        draft={peopleDraft}
        min={FIELD_BOUNDS.people.min}
        max={FIELD_BOUNDS.people.max}
        startAt={FIELD_BOUNDS.people.example}
        deltaAud={peopleDelta}
        onDraft={onPeopleDraft}
      />
      <WhatIfStepperRow
        label="Dishwasher cycles"
        saved={profile.dishwasherCyclesPerWeek}
        draft={dishwasherDraft}
        min={FIELD_BOUNDS.dishwasherCyclesPerWeek.min}
        max={FIELD_BOUNDS.dishwasherCyclesPerWeek.max}
        startAt={2}
        deltaAud={dishwasherDelta}
        onDraft={onDishwasherDraft}
      />
      <WhatIfStepperRow
        label="Washing cycles"
        saved={profile.washerCyclesPerWeek}
        draft={washerDraft}
        min={FIELD_BOUNDS.washerCyclesPerWeek.min}
        max={FIELD_BOUNDS.washerCyclesPerWeek.max}
        startAt={2}
        deltaAud={washerDelta}
        onDraft={onWasherDraft}
      />
    </>
  )
}
