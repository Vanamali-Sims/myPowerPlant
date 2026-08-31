import { useState } from 'react'
import { applyBaseline, markUserFields } from '../../data/baselines'
import { hasErrors, validateStep, type FieldErrors } from '../../lib/validateProfile'
import type { ProfileData, SetupStepId } from '../../types/profile'
import { FormActions } from '../ui/FormActions'
import { FormHeader } from '../ui/FormHeader'
import { StepProgress } from '../ui/StepProgress'
import { BatteryProfileStep } from './BatteryProfileStep'
import { EnergyProviderStep } from './EnergyProviderStep'
import { HouseholdProfileStep } from './HouseholdProfileStep'
import { HouseholdUsageStep } from './HouseholdUsageStep'
import { SolarDetailsStep } from './SolarDetailsStep'
import './SetupForm.css'

const STEPS: { id: SetupStepId; title: string; lede: string }[] = [
  {
    id: 'household',
    title: 'Household Profile',
    lede: 'A set of questions designed to discover personalised energy usage.',
  },
  {
    id: 'usage',
    title: 'Household Usage',
    lede: 'Tell us how your household uses electricity so we can personalise your estimate.',
  },
  {
    id: 'solar',
    title: 'Solar Details',
    lede: 'Tell us about your solar panel setup so we can estimate your household’s solar generation and personalise your energy insights.',
  },
  {
    id: 'battery',
    title: 'Battery Profile',
    lede: 'Tell us about your home battery so we can better estimate how much stored energy may be available for household use and potential VPP participation.',
  },
  {
    id: 'provider',
    title: 'Energy Provider',
    lede: 'Tell us about your current electricity provider so we can better understand your existing energy arrangement and provide more relevant VPP insights.',
  },
]

const STEP_FIELDS: Record<SetupStepId, (keyof ProfileData)[]> = {
  household: [
    'postcode',
    'people',
    'rooms',
    'gas',
    'refrigerators',
    'dryer',
    'dryerWeek',
    'dryerWeekend',
    'heating',
    'cooling',
    'hotWater',
  ],
  usage: ['monthlyBill', 'monthlyKwh', 'peakPeriod', 'usageLevel', 'wfh'],
  solar: ['hasSolar', 'solarDirection', 'panelCount', 'panelWatts'],
  battery: ['batteryUnits', 'reservePercent', 'batteryAge', 'batteryModel'],
  provider: ['provider'],
}

type Props = {
  profile: ProfileData
  onChange: (profile: ProfileData) => void
  onComplete: (profile: ProfileData) => void
  onExit?: () => void
  onLogoClick: () => void
}

export function SetupForm({ profile, onChange, onComplete, onExit, onLogoClick }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const step = STEPS[stepIndex]
  const total = STEPS.length

  function patch<K extends keyof ProfileData>(field: K, value: ProfileData[K]) {
    const next: ProfileData = { ...profile, [field]: value }
    if (field === 'hasSolar' && value === 'no') {
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
      <FormHeader
        postcode={profile.postcode}
        onPostcodeChange={(postcode) => patch('postcode', postcode)}
        onLogoClick={onLogoClick}
      />
      <StepProgress step={stepIndex + 1} total={total} />
      <div className="setup__intro">
        <h1>{step.title}</h1>
        <p>{step.lede}</p>
      </div>
      <div className="setup__fields">
        {step.id === 'household' ? (
          <HouseholdProfileStep profile={profile} errors={errors} onChange={patch} />
        ) : null}
        {step.id === 'usage' ? (
          <HouseholdUsageStep profile={profile} errors={errors} onChange={patch} />
        ) : null}
        {step.id === 'solar' ? (
          <SolarDetailsStep profile={profile} errors={errors} onChange={patch} />
        ) : null}
        {step.id === 'battery' ? (
          <BatteryProfileStep profile={profile} errors={errors} onChange={patch} />
        ) : null}
        {step.id === 'provider' ? (
          <EnergyProviderStep profile={profile} errors={errors} onChange={patch} />
        ) : null}
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
