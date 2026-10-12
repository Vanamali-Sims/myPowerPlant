import { useId, useState, type Ref } from 'react'
import type { BatterySourceId } from '../../constants/batterySources'
import type { CalculationContext } from '../../lib/goals/calculate'
import type { GoalSuggestions } from '../../lib/goals/goalSetup'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import type { GoalBaseline, GoalBattery } from '../../types/goals'
import type { MessageCode } from '../../constants/goalMessages'
import { Button } from '../ui/Button'
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
  const formId = useId()
  const battery = profileBattery ?? initialBattery
  const displayRate = profileRatePerKwh ?? initialRatePerKwh
  const [lastFile, setLastFile] = useState<File | null>(null)
  const [sourceDetected, setSourceDetected] = useState(true)
  const [retryWithSource, setRetryWithSource] = useState<{ file: File; sourceId: BatterySourceId } | null>(
    null,
  )

  function handleReady(draft: BaselineDraft, meta: { file: File; sourceDetected: boolean }) {
    setLastFile(meta.file)
    setSourceDetected(meta.sourceDetected)
    setRetryWithSource(null)
    onBaselineReady(draft)
  }

  function handleChooseAnother() {
    setLastFile(null)
    setSourceDetected(true)
    setRetryWithSource(null)
    onChooseAnotherFile?.()
  }

  return (
    <div className="goals-setup-shell">
      <div className="goals-setup-board">
        <div className="goals-setup-board__file">
          <GoalsBatteryFileCard
            initialBattery={initialBattery}
            profileBattery={profileBattery}
            profileRatePerKwh={profileRatePerKwh}
            initialRatePerKwh={initialRatePerKwh}
            bundle={bundle}
            onReady={handleReady}
            retryWithSource={retryWithSource}
          />
          {unlocked && onChooseAnotherFile ? (
            <button type="button" className="goals-setup-board__change" onClick={handleChooseAnother}>
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
          formId={formId}
          showProviderSwitch={unlocked && !sourceDetected && Boolean(lastFile)}
          onProviderSwitch={(sourceId) => {
            if (!lastFile) return
            setRetryWithSource({ file: lastFile, sourceId })
          }}
        />
      </div>
      <footer className="goals-setup-footer">
        <Button
          type="submit"
          form={formId}
          variant="primary"
          className="goals-setup-footer__save"
          disabled={!unlocked}
        >
          Save goals
        </Button>
      </footer>
    </div>
  )
}
