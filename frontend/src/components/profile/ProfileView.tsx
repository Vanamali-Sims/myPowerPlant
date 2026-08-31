import { useState } from 'react'
import type { ProfileData, SetupStepId } from '../../types/profile'
import { displayValue, formatUpdatedAt, isBaseline } from '../../lib/formatProfile'
import { hasErrors, validateStep, type FieldErrors } from '../../lib/validateProfile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import {
  BarsIcon,
  BatteryIcon,
  BoltIcon,
  CheckIcon,
  LockIcon,
  PencilIcon,
  PeopleIcon,
  ResetIcon,
  SunIcon,
} from '../ui/icons'
import { LocationControl } from '../ui/LocationControl'
import { BatteryProfileStep } from '../setup/BatteryProfileStep'
import { EnergyProviderStep } from '../setup/EnergyProviderStep'
import { HouseholdProfileStep } from '../setup/HouseholdProfileStep'
import { HouseholdUsageStep } from '../setup/HouseholdUsageStep'
import { SolarDetailsStep } from '../setup/SolarDetailsStep'
import './ProfileView.css'

type Section = {
  id: SetupStepId
  title: string
  icon: typeof PeopleIcon
  fields: { field: keyof ProfileData; label: string }[]
}

const SECTIONS: Section[] = [
  {
    id: 'household',
    title: 'Household Profile',
    icon: PeopleIcon,
    fields: [
      { field: 'postcode', label: 'Postcode' },
      { field: 'people', label: 'People in household' },
      { field: 'rooms', label: 'Total rooms' },
      { field: 'gas', label: 'Gas' },
      { field: 'refrigerators', label: 'Refrigerators' },
      { field: 'dryer', label: 'Clothes dryer' },
      { field: 'heating', label: 'Home heating' },
      { field: 'cooling', label: 'Home cooling' },
      { field: 'hotWater', label: 'Hot water system' },
    ],
  },
  {
    id: 'usage',
    title: 'Household Usage',
    icon: BarsIcon,
    fields: [
      { field: 'monthlyBill', label: 'Average monthly electricity bill' },
      { field: 'monthlyKwh', label: 'Average monthly electricity usage' },
      { field: 'peakPeriod', label: 'Highest energy-use period' },
      { field: 'usageLevel', label: 'Energy usage level' },
      { field: 'wfh', label: 'Work/study from home' },
    ],
  },
  {
    id: 'solar',
    title: 'Solar Details',
    icon: SunIcon,
    fields: [
      { field: 'hasSolar', label: 'Solar' },
      { field: 'solarDirection', label: 'Solar panel direction' },
      { field: 'panelCount', label: 'Number of panels' },
      { field: 'panelWatts', label: 'Average power rating' },
    ],
  },
  {
    id: 'battery',
    title: 'Battery Profile',
    icon: BatteryIcon,
    fields: [
      { field: 'batteryUnits', label: 'Number of battery units' },
      { field: 'reservePercent', label: 'Usable capacity preference' },
      { field: 'batteryAge', label: 'Battery age' },
      { field: 'batteryModel', label: 'Battery model' },
    ],
  },
  {
    id: 'provider',
    title: 'Energy Provider',
    icon: BoltIcon,
    fields: [{ field: 'provider', label: 'Current electricity provider' }],
  },
]

type Props = {
  profile: ProfileData
  onSave: (profile: ProfileData) => void
  onReset: () => void
  onLiveChange?: (profile: ProfileData) => void
  onLogoClick: () => void
}

export function ProfileView({ profile, onSave, onReset, onLiveChange, onLogoClick }: Props) {
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
      const first = SECTIONS.find((section) =>
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

        <Callout tone="accent" icon={<CheckIcon />}>
          Profile last updated: {formatUpdatedAt(profile.lastUpdated)}. Your profile is saved on
          this device.
        </Callout>

        <div className="profile__sections">
          {SECTIONS.map((section) => {
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
            <p>This will clear all your answers and return to the start.</p>
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
          </Callout>
        ) : null}

        <p className="setup-secure">
          <LockIcon width={14} height={14} />
          Your information is secure and used only to generate your personalised energy insights.
        </p>
    </div>
  )
}
