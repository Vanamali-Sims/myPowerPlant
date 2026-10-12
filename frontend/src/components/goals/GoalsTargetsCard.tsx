import type { Ref } from 'react'
import { GOALS_ONBOARDING } from '../../constants/goals'
import type { CalculationContext } from '../../lib/goals/calculate'
import type { GoalSuggestions } from '../../lib/goals/goalSetup'
import type { GoalBaseline, GoalBattery } from '../../types/goals'
import type { MessageCode } from '../../constants/goalMessages'
import type { BatterySourceId } from '../../constants/batterySources'
import { BATTERY_SOURCES } from '../../constants/batterySources'
import { BatteryIcon } from '../ui/icons'
import { GoalSetupForm } from './GoalSetupForm'
import { GoalsLockedGoalPlaceholders } from './GoalsLockedGoalPlaceholders'
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
  formId: string
  showProviderSwitch?: boolean
  onProviderSwitch?: (sourceId: BatterySourceId) => void
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
  formId,
  showProviderSwitch,
  onProviderSwitch,
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

        {showProviderSwitch && onProviderSwitch ? (
          <div className="goals-targets__provider-switch" role="radiogroup" aria-label="Battery file provider">
            <span className="goals-targets__provider-switch-label">Which provider is this file from?</span>
            <div className="goals-targets__provider-switch-options">
              {BATTERY_SOURCES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="goals-targets__provider-switch-btn"
                  onClick={() => onProviderSwitch(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {unlocked ? (
          <GoalSetupForm
            key={`goals-${baseline.month}`}
            formId={formId}
            layout="onboarding"
            mode="create"
            unlocked
            suggestions={suggestions}
            baseline={baseline}
            context={context}
            current={{ savings: null, carbon: null }}
            saveError={saveError}
            onSave={onSave}
            saveInFooter
          />
        ) : (
          <GoalsLockedGoalPlaceholders />
        )}
      </div>
    </section>
  )
}
