import type { Ref } from 'react'
import { GOALS_ONBOARDING } from '../../constants/goals'
import type { CalculationContext } from '../../lib/goals/calculate'
import type { GoalSuggestions } from '../../lib/goals/goalSetup'
import type { GoalBaseline, GoalBattery } from '../../types/goals'
import type { MessageCode } from '../../constants/goalMessages'
import { BatteryIcon } from '../ui/icons'
import { GoalSetupForm } from './GoalSetupForm'
import { GoalsTreeBadge } from './GoalsTreeBadge'

type Props = {
  headingRef?: Ref<HTMLHeadingElement>
  unlocked: boolean
  battery: GoalBattery
  fromProfile: boolean
  ratePerKwh: number | null
  suggestions: GoalSuggestions
  baseline: Pick<GoalBaseline, 'month' | 'days' | 'monthly'>
  context: CalculationContext
  saveError: MessageCode | null
  onSave: (targets: Partial<Record<'savings' | 'carbon', number>>) => void
}

export function GoalsTargetsCard({
  headingRef,
  unlocked,
  battery,
  fromProfile,
  ratePerKwh,
  suggestions,
  baseline,
  context,
  saveError,
  onSave,
}: Props) {
  const rateCents =
    ratePerKwh !== null ? String(Math.round(ratePerKwh * 1000) / 10) : null

  return (
    <section className="goals-targets" aria-labelledby="goals-targets-title">
      <header className="goals-targets__band">
        <div className="goals-targets__band-copy">
          <h2 id="goals-targets-title" className="goals-targets__title" ref={headingRef} tabIndex={-1}>
            {GOALS_ONBOARDING.goalsTitle}
          </h2>
          <p className="goals-targets__helper">{GOALS_ONBOARDING.goalsHelper}</p>
        </div>
        <GoalsTreeBadge variant={unlocked ? 'tree' : 'seedling'} />
      </header>

      <div className="goals-targets__body">
        <p className="goals-targets__profile">
          <BatteryIcon width={20} height={20} aria-hidden />
          <span>
            {fromProfile ? 'Battery from your profile:' : 'Battery:'}{' '}
            <strong>{battery.model}</strong>
            {rateCents ? (
              <>
                {' '}
                · about {rateCents} c/kWh
              </>
            ) : null}
          </span>
        </p>

        <GoalSetupForm
          key={unlocked ? `goals-${baseline.month}` : 'goals-preview'}
          layout="onboarding"
          mode="create"
          unlocked={unlocked}
          suggestions={suggestions}
          baseline={baseline}
          context={context}
          current={{ savings: null, carbon: null }}
          saveError={saveError}
          onSave={onSave}
        />
      </div>
    </section>
  )
}
