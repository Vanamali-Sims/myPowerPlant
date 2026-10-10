/**
 * Household tab on the What if page: people, and changes in appliance cycles.
 *
 * Pure editor — the page around it recomputes the live comparison on every
 * change, so this component only owns the stepper rows. Appliance cycles are
 * a change from today's use (which is already inside the monthly usage), so
 * they start at 0 and can go below it.
 */
import { FIELD_BOUNDS } from '../../constants/validation'
import { CYCLE_CHANGE_LIMIT } from '../../lib/whatif/usageChange'
import type { ProfileData } from '../../types/profile'
import { WhatIfStepperRow } from './WhatIfStepperRow'

type Props = {
  profile: ProfileData
  peopleDraft: string
  dishwasherChange: number
  washerChange: number
  peopleDelta?: number | null
  dishwasherDelta?: number | null
  washerDelta?: number | null
  onPeopleDraft: (value: string) => void
  onDishwasherChange: (value: number) => void
  onWasherChange: (value: number) => void
}

/**
 * WhatIfHouseholdTab
 */
export function WhatIfHouseholdTab({
  profile,
  peopleDraft,
  dishwasherChange,
  washerChange,
  peopleDelta = null,
  dishwasherDelta = null,
  washerDelta = null,
  onPeopleDraft,
  onDishwasherChange,
  onWasherChange,
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
        label="Dishwasher cycles a week, more or fewer"
        saved="0"
        draft={String(dishwasherChange)}
        min={-CYCLE_CHANGE_LIMIT}
        max={CYCLE_CHANGE_LIMIT}
        startAt={0}
        deltaAud={dishwasherDelta}
        onDraft={(value) => onDishwasherChange(Number.parseInt(value, 10) || 0)}
      />
      <WhatIfStepperRow
        label="Washing cycles a week, more or fewer"
        saved="0"
        draft={String(washerChange)}
        min={-CYCLE_CHANGE_LIMIT}
        max={CYCLE_CHANGE_LIMIT}
        startAt={0}
        deltaAud={washerDelta}
        onDraft={(value) => onWasherChange(Number.parseInt(value, 10) || 0)}
      />
    </>
  )
}
