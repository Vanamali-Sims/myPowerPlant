/**
 * Saved-profile review screen with per-section edit and a reset path.
 */
import { useState } from 'react'
import { PROFILE_SECTIONS, DEVICE_STORAGE_NOTE } from '../../constants'
import type { ProfileData, SetupStepId } from '../../types/profile'
import { displayValue, formatUpdatedAt, isBaseline } from '../../lib/formatProfile'
import { hasErrors, validateStep, type FieldErrors } from '../../lib/validateProfile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { BoltIcon, CheckIcon, LockIcon, PencilIcon, ResetIcon } from '../ui/icons'
import { LocationControl } from '../ui/LocationControl'
import { BatteryProfileStep } from '../setup/BatteryProfileStep'
import { EnergyProviderStep } from '../setup/EnergyProviderStep'
import { HouseholdProfileStep } from '../setup/HouseholdProfileStep'
import { HouseholdUsageStep } from '../setup/HouseholdUsageStep'
import { SolarDetailsStep } from '../setup/SolarDetailsStep'

type Props = {
  profile: ProfileData
  onSave: (profile: ProfileData) => void
  onReset: () => void
  onLiveChange?: (profile: ProfileData) => void
  onLogoClick: () => void
  onViewDashboard: () => void
}

/**
 * ProfileView
 * @param props.profile - Last saved household answers
 * @param props.onSave - Persist edits to localStorage
 * @returns JSX.Element
 *
 * One section can be edited at a time using the same step components as setup.
 * Baseline-filled fields get an Estimate badge so they are not treated as facts.
 */
export function ProfileView({
  profile,
  onSave,
  onReset,
  onLiveChange,
  onLogoClick,
  onViewDashboard,
}: Props) {
  const [draft, setDraft] = useState(profile)
  const [editing, setEditing] = useState<SetupStepId | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [confirmReset, setConfirmReset] = useState(false)

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
    onLiveChange?.(next)
    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  function save() {
    const stepErrors = editing
      ? validateStep(editing, draft)
      : {
          ...validateStep('household', draft),
          ...validateStep('usage', draft),
          ...validateStep('solar', draft),
          ...validateStep('battery', draft),
          ...validateStep('provider', draft),
        }
    if (hasErrors(stepErrors)) {
      setErrors(stepErrors)
      const first = PROFILE_SECTIONS.find((section) =>
        section.fields.some((item) => stepErrors[item.field]),
      )
      if (first) setEditing(first.id)
      return
    }
    onSave(draft)
    setEditing(null)
    setConfirmReset(false)
    setErrors({})
  }

  function cancel() {
    setDraft(profile)
    setEditing(null)
    setConfirmReset(false)
    setErrors({})
  }

  return (
    <div className="profile">
      <header className="profile__top">
        <button
          type="button"
          className="brand brand--button brand--desktop-hidden"
          onClick={onLogoClick}
          aria-label="MyPowerPlant home"
        >
          <span className="brand__mark">
            <BoltIcon width={14} height={14} />
          </span>
          MyPowerPlant
        </button>
        <LocationControl postcode={draft.postcode} onPostcodeChange={(value) => patch('postcode', value)} />
      </header>

        <div className="profile__intro">
          <h1>Your Profile</h1>
          <p>
            View and manage the details you provided. This helps us generate more personalised
            energy insights for you.
          </p>
        </div>

        <Callout
          tone="accent"
          icon={<CheckIcon />}
          title={`Profile last updated: ${formatUpdatedAt(profile.lastUpdated)}`}
          action={
            <Button variant="edit" onClick={onViewDashboard}>
              View dashboard
            </Button>
          }
        >
          Your profile is saved on this device. The dashboard uses these answers — no need to
          enter them again.
        </Callout>

        <div className="profile__sections">
          {PROFILE_SECTIONS.map((section) => {
            const Icon = section.icon
            const isEditing = editing === section.id
            return (
              <section key={section.id} className="profile-card">
                <div className="profile-card__head">
                  <span className="profile-card__icon">
                    <Icon />
                  </span>
                  <h2>{section.title}</h2>
                  <Button variant="edit" onClick={() => setEditing(isEditing ? null : section.id)}>
                    <PencilIcon width={14} height={14} />
                    {isEditing ? 'Done' : 'Edit'}
                  </Button>
                </div>
                {isEditing ? (
                  <div className="profile-card__edit">
                    {section.id === 'household' ? (
                      <HouseholdProfileStep
                        profile={draft}
                        errors={errors}
                        onChange={patch}
                      />
                    ) : null}
                    {section.id === 'usage' ? (
                      <HouseholdUsageStep profile={draft} errors={errors} onChange={patch} />
                    ) : null}
                    {section.id === 'solar' ? (
                      <SolarDetailsStep profile={draft} errors={errors} onChange={patch} />
                    ) : null}
                    {section.id === 'battery' ? (
                      <BatteryProfileStep profile={draft} errors={errors} onChange={patch} />
                    ) : null}
                    {section.id === 'provider' ? (
                      <EnergyProviderStep profile={draft} errors={errors} onChange={patch} />
                    ) : null}
                  </div>
                ) : (
                  <dl className="profile-grid">
                    {section.fields
                      .filter((item) => {
                        if (
                          section.id === 'solar' &&
                          item.field !== 'hasSolar' &&
                          draft.hasSolar !== 'yes'
                        ) {
                          return false
                        }
                        return true
                      })
                      .map((item) => (
                      <div key={item.field} className="profile-grid__item">
                        <dt>{item.label}</dt>
                        <dd>
                          {displayValue(draft, item.field)}
                          {isBaseline(draft, item.field) ? (
                            <span className="profile-estimate">Estimate</span>
                          ) : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            )
          })}
        </div>

        <div className="profile__actions">
          <div className="profile__action">
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              <ResetIcon width={15} height={15} />
              Reset Profile
            </Button>
            <p>This clears every answer on this device. There is no server copy to delete.</p>
          </div>
          <div className="profile__action">
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
            <p>Discard any unsaved changes.</p>
          </div>
          <div className="profile__action">
            <Button variant="primary" onClick={save}>
              Save Changes
            </Button>
            <p>Save any updates to your profile.</p>
          </div>
        </div>

        {confirmReset ? (
          <Callout
            tone="action"
            title="Reset this profile?"
            action={
              <Button variant="danger" onClick={onReset}>
                Reset
              </Button>
            }
          >
            This clears every answer on this device. You can fill the form again afterwards.
            We do not keep a server copy.
          </Callout>
        ) : null}

        <p className="setup-secure">
          <LockIcon width={14} height={14} />
          {DEVICE_STORAGE_NOTE}
        </p>
    </div>
  )
}
