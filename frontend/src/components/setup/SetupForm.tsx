/**
 * Five-step household setup wizard.
 */
import { useEffect, useState } from 'react'
import { SETUP_STEPS, STEP_FIELDS } from '../../constants'
import { applyBaseline, fillAllWithBaseline, markUserFields } from '../../data/baselines'
import { formProgress } from '../../lib/formProgress'
import { hasErrors, validateStep, type FieldErrors } from '../../lib/validateProfile'
import { useVoiceInput } from '../../lib/voice/useVoiceInput'
import type { ProfileData, SetupStepId } from '../../types/profile'
import { VoiceDock } from '../voice/VoiceDock'
import { FormActions } from '../ui/FormActions'
import { FormHeader } from '../ui/FormHeader'
import { StepProgress } from '../ui/StepProgress'
import { BatteryProfileStep } from './BatteryProfileStep'
import { SetupIntroDialog } from './SetupIntroDialog'
import { EnergyProviderStep } from './EnergyProviderStep'
import { HouseholdProfileStep } from './HouseholdProfileStep'
import { HouseholdUsageStep } from './HouseholdUsageStep'
import { SolarDetailsStep } from './SolarDetailsStep'

type Props = {
  profile: ProfileData
  onChange: (profile: ProfileData) => void
  onComplete: (profile: ProfileData) => void
  onExit?: () => void
  onLogoClick: () => void
  onStepChange?: (stepId: SetupStepId) => void
}

/**
 * SetupForm
 * @param props.profile - Current answers
 * @param props.onComplete - Persist the finished profile and leave the wizard
 * @returns JSX.Element
 *
 * Continue validates the current step; skip fills Kew baselines for that step.
 * Clearing solar fields when the user says they have no panels avoids stale data.
 */
export function SetupForm({ profile, onChange, onComplete, onExit, onLogoClick, onStepChange }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [introOpen, setIntroOpen] = useState(true)
  const step = SETUP_STEPS[stepIndex]
  const total = SETUP_STEPS.length
  // Measured from answers, not from which step is open.
  const progress = formProgress(profile)

  useEffect(() => {
    onStepChange?.(step.id)
  }, [step.id, onStepChange])

  function patch<K extends keyof ProfileData>(field: K, value: ProfileData[K]) {
    const next: ProfileData = { ...profile, [field]: value }
    if (field === 'hasSolar' && value === 'no') {
      // Hide-and-clear: leftover panel answers must not survive a “no solar” choice.
      next.solarDirection = ''
      next.panelCount = ''
      next.panelWatts = ''
    }
    onChange(next)
    if (errors[field]) {
      setErrors((current) => {
        const copy = { ...current }
        delete copy[field]
        return copy
      })
    }
  }

  /**
   * Apply several answers in ONE write.
   *
   * `patch` closes over `profile`, so calling it once per field in the same
   * tick makes every call spread the same stale object and only the last one
   * survives. Voice routinely fills three or four fields from one sentence,
   * which is exactly that case.
   */
  function patchMany(updates: Partial<ProfileData>) {
    const next: ProfileData = { ...profile, ...updates }
    if (updates.hasSolar === 'no') {
      next.solarDirection = ''
      next.panelCount = ''
      next.panelWatts = ''
    }
    onChange(next)
    setErrors((current) => {
      const copy = { ...current }
      for (const field of Object.keys(updates)) delete copy[field as keyof ProfileData]
      return copy
    })
  }

  const voice = useVoiceInput({ stepId: step.id, onFill: patchMany })

  /**
   * Typing over a spoken answer replaces it, and drops the "we heard" note with
   * it — the user's own input is never second-guessed by an earlier transcript.
   */
  function changeField<K extends keyof ProfileData>(field: K, value: ProfileData[K]) {
    patch(field, value)
    voice.clearHeard(field)
  }

  function continueStep() {
    const stepErrors = validateStep(step.id, profile)
    if (hasErrors(stepErrors)) {
      setErrors(stepErrors)
      return
    }
    const saved = markUserFields(profile, STEP_FIELDS[step.id])
    onChange(saved)
    setErrors({})
    if (stepIndex === total - 1) {
      onComplete(saved)
      return
    }
    setStepIndex((index) => index + 1)
  }

  function skipStep() {
    const skipped = applyBaseline(profile, step.id)
    onChange(skipped)
    setErrors({})
    if (stepIndex === total - 1) {
      onComplete(skipped)
      return
    }
    setStepIndex((index) => index + 1)
  }

  function skipAll() {
    setIntroOpen(false)
    setErrors({})
    onComplete(fillAllWithBaseline(profile))
  }

  function goBack() {
    setErrors({})
    if (stepIndex === 0) {
      onExit?.()
      return
    }
    setStepIndex((index) => index - 1)
  }

  return (
    <div className="setup">
      <SetupIntroDialog open={introOpen} onContinue={() => setIntroOpen(false)} onSkipAll={skipAll} />
      <FormHeader
        postcode={profile.postcode}
        onPostcodeChange={(postcode) => changeField('postcode', postcode)}
        onLogoClick={onLogoClick}
      />
      <StepProgress
        step={stepIndex + 1}
        total={total}
        answered={progress.answered}
        fields={progress.total}
        percent={progress.percent}
        minutesLeft={progress.minutesLeft}
      />
      <VoiceDock
        state={voice.state}
        supported={voice.supported}
        consented={voice.consented}
        partial={voice.partial}
        failure={voice.failure}
        heard={voice.heard}
        flagged={voice.flagged}
        pending={voice.pending}
        onStart={voice.start}
        onConsentAndStart={voice.grantConsentAndStart}
        onPause={voice.pause}
        onStop={voice.stop}
        onTurnOff={voice.turnOff}
        onConfirmPending={voice.confirmPending}
        onRejectPending={voice.rejectPending}
        onChooseInstead={voice.chooseInstead}
        onDismissFailure={voice.dismissFailure}
      />
      <div key={step.id} className="view-enter flex flex-col gap-5">
        <div className="setup__intro">
          <h1>{step.title}</h1>
          <p>{step.lede}</p>
        </div>
        <div className="setup__fields">
          {step.id === 'household' ? (
            <HouseholdProfileStep profile={profile} errors={errors} onChange={changeField} />
          ) : null}
          {step.id === 'usage' ? (
            <HouseholdUsageStep profile={profile} errors={errors} onChange={changeField} />
          ) : null}
          {step.id === 'solar' ? (
            <SolarDetailsStep profile={profile} errors={errors} onChange={changeField} />
          ) : null}
          {step.id === 'battery' ? (
            <BatteryProfileStep profile={profile} errors={errors} onChange={changeField} />
          ) : null}
          {step.id === 'provider' ? (
            <EnergyProviderStep profile={profile} errors={errors} onChange={changeField} />
          ) : null}
        </div>
      </div>
      <FormActions
        continueLabel={step.id === 'provider' ? 'Complete Profile' : 'Continue'}
        onBack={onExit || stepIndex > 0 ? goBack : undefined}
        onContinue={continueStep}
        onSkip={skipStep}
        showSkip
      />
    </div>
  )
}
