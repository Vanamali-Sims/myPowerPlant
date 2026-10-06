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
  onPeopleDraft,
  onDishwasherDraft,
  onWasherDraft,
}: Props) {
  return (
    <div className="chat-whatif-household">
      <div className="chat-whatif-household__body">
        <WhatIfStepperRow
          label="People in the home"
          saved={profile.people}
          draft={peopleDraft}
          min={FIELD_BOUNDS.people.min}
          max={FIELD_BOUNDS.people.max}
          startAt={FIELD_BOUNDS.people.example}
          onDraft={onPeopleDraft}
        />
        <WhatIfStepperRow
          label="Dishwasher cycles per week"
          saved={profile.dishwasherCyclesPerWeek}
          draft={dishwasherDraft}
          min={FIELD_BOUNDS.dishwasherCyclesPerWeek.min}
          max={FIELD_BOUNDS.dishwasherCyclesPerWeek.max}
          startAt={2}
          onDraft={onDishwasherDraft}
        />
        <WhatIfStepperRow
          label="Washing machine cycles per week"
          saved={profile.washerCyclesPerWeek}
          draft={washerDraft}
          min={FIELD_BOUNDS.washerCyclesPerWeek.min}
          max={FIELD_BOUNDS.washerCyclesPerWeek.max}
          startAt={2}
          onDraft={onWasherDraft}
        />
      </div>
    </div>
  )
}
