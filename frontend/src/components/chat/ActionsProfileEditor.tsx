/**
 * Questionnaire editor for the Actions panel.
 *
 * Reuses the same setup step components as Profile and Setup so validation
 * and field labels stay in one place. Each section saves independently.
 */
import { useEffect, useState } from 'react'
import { PROFILE_SECTIONS, SETUP_STEPS } from '../../constants/setup'
import type { ProfileData, SetupStepId } from '../../types/profile'
import { hasErrors, validateStep, type FieldErrors } from '../../lib/validateProfile'
import { BatteryProfileStep } from '../setup/BatteryProfileStep'
import { EnergyProviderStep } from '../setup/EnergyProviderStep'
import { HouseholdProfileStep } from '../setup/HouseholdProfileStep'
import { HouseholdUsageStep } from '../setup/HouseholdUsageStep'
import { SolarDetailsStep } from '../setup/SolarDetailsStep'
import { Button } from '../ui/Button'

type Props = {
  profile: ProfileData
  onSave: (profile: ProfileData) => void
  onStatus: (message: string) => void
}

/** Short labels for the section option bar inside a narrow panel. */
const SECTION_TAB_LABEL: Record<SetupStepId, string> = {
  household: 'Household',
  usage: 'Usage',
  solar: 'Solar',
  battery: 'Battery',
  provider: 'Provider',
}

/**
 * ActionsProfileEditor
 * @param props.profile - Last saved answers from localStorage
 * @param props.onSave - Persist after a section passes validateStep
 * @param props.onStatus - Status line in the parent Actions panel
 */
export function ActionsProfileEditor({ profile, onSave, onStatus }: Props) {
  const [section, setSection] = useState<SetupStepId>('household')
  const [draft, setDraft] = useState(profile)
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    setDraft(profile)
    setErrors({})
  }, [profile])

  function patch<K extends keyof ProfileData>(field: K, value: ProfileData[K]) {
    const next = {
      ...draft,
      [field]: value,
      fieldSources: { ...draft.fieldSources, [field]: 'user' as const },
    }
    if (field === 'hasSolar' && value === 'no') {
      next.solarDirection = ''
      next.panelCount = ''
      next.panelWatts = ''
    }
    setDraft(next)
    if (errors[field]) {
      setErrors((current) => {
        const nextErrors = { ...current }
        delete nextErrors[field]
        return nextErrors
      })
    }
  }

  function saveSection() {
    const stepErrors = validateStep(section, draft)
    if (hasErrors(stepErrors)) {
      setErrors(stepErrors)
      onStatus('Fix the highlighted answers before saving.')
      return
    }
    onSave(draft)
    const title = SETUP_STEPS.find((step) => step.id === section)?.title ?? 'Section'
    onStatus(`Saved on this device. ${title} updated.`)
    setErrors({})
  }

  const sectionMeta = PROFILE_SECTIONS.find((item) => item.id === section)

  return (
    <div className="chat-profile-editor">
      <div className="chat-actions__tabs" role="tablist" aria-label="Profile sections">
        {SETUP_STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={section === step.id}
            className={`chat-actions__tab${section === step.id ? ' is-active' : ''}`}
            onClick={() => {
              setSection(step.id)
              setErrors({})
            }}
          >
            {SECTION_TAB_LABEL[step.id]}
          </button>
        ))}
      </div>
      {sectionMeta ? (
        <p className="chat-panel__hint chat-profile-editor__lede">{sectionMeta.title}</p>
      ) : null}
      <div className="chat-profile-editor__form">
        {section === 'household' ? (
          <HouseholdProfileStep profile={draft} errors={errors} onChange={patch} />
        ) : null}
        {section === 'usage' ? (
          <HouseholdUsageStep profile={draft} errors={errors} onChange={patch} />
        ) : null}
        {section === 'solar' ? (
          <SolarDetailsStep profile={draft} errors={errors} onChange={patch} />
        ) : null}
        {section === 'battery' ? (
          <BatteryProfileStep profile={draft} errors={errors} onChange={patch} />
        ) : null}
        {section === 'provider' ? (
          <EnergyProviderStep profile={draft} errors={errors} onChange={patch} />
        ) : null}
      </div>
      <Button type="button" variant="primary" className="chat-actions__all" onClick={saveSection}>
        Save {sectionMeta?.title ?? 'section'}
      </Button>
    </div>
  )
}
