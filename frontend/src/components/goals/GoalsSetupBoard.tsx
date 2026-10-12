import type { Ref } from 'react'
import type { CalculationContext } from '../../lib/goals/calculate'
import type { GoalSuggestions } from '../../lib/goals/goalSetup'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import type { GoalBaseline, GoalBattery } from '../../types/goals'
import type { MessageCode } from '../../constants/goalMessages'
import type { BaselineDraft } from './BaselineStep'
import { GoalsBatteryFileCard } from './GoalsBatteryFileCard'
import { GoalsTargetsCard } from './GoalsTargetsCard'

type Props = {
  headingRef?: Ref<HTMLHeadingElement>
  unlocked: boolean
  initialBattery: GoalBattery
  profileBattery: GoalBattery | null
  profileRatePerKwh: number | null
  initialRatePerKwh: number | null
  bundle: MethodologyBundle
  /** Placeholder baseline for locked goal fields. */
  previewBaseline: Pick<GoalBaseline, 'month' | 'days' | 'monthly'>
  previewSuggestions: GoalSuggestions
  context: CalculationContext
  activeBaseline: Pick<GoalBaseline, 'month' | 'days' | 'monthly'> | null
  formSuggestions: GoalSuggestions | null
  saveError: MessageCode | null
  onBaselineReady: (draft: BaselineDraft) => void
  onSave: (targets: Partial<Record<'savings' | 'carbon', number>>) => void
  onChooseAnotherFile?: () => void
}

export function GoalsSetupBoard({
  headingRef,
  unlocked,
  initialBattery,
  profileBattery,
  profileRatePerKwh,
  initialRatePerKwh,
  bundle,
  previewBaseline,
  previewSuggestions,
  context,
  activeBaseline,
  formSuggestions,
  saveError,
  onBaselineReady,
  onSave,
  onChooseAnotherFile,
}: Props) {
  const battery = profileBattery ?? initialBattery
  const displayRate = profileRatePerKwh ?? initialRatePerKwh

  return (
    <div className="goals-setup-board">
      <div className="goals-setup-board__file">
        <GoalsBatteryFileCard
          initialBattery={initialBattery}
          profileBattery={profileBattery}
          profileRatePerKwh={profileRatePerKwh}
          initialRatePerKwh={initialRatePerKwh}
          bundle={bundle}
          onReady={onBaselineReady}
        />
        {unlocked && onChooseAnotherFile ? (
          <button type="button" className="goals-setup-board__change" onClick={onChooseAnotherFile}>
            Use a different file
          </button>
        ) : null}
      </div>
      <GoalsTargetsCard
        headingRef={headingRef}
        unlocked={unlocked}
        battery={battery}
        fromProfile={Boolean(profileBattery)}
        ratePerKwh={displayRate}
        suggestions={unlocked && formSuggestions ? formSuggestions : previewSuggestions}
        baseline={unlocked && activeBaseline ? activeBaseline : previewBaseline}
        context={context}
        saveError={saveError}
        onSave={onSave}
      />
    </div>
  )
}
