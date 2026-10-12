/**
 * Improve-flow profile: the answers What if, Goals, and Reminders use, the
 * What if baseline, goals with their progress, and downloaded reminders.
 * Everything can be changed here and each feature picks up the change.
 */
import { useState } from 'react'
import { DEVICE_STORAGE_NOTE, EVENT_TYPE_OPTIONS } from '../../constants'
import { GOAL_LABELS } from '../../constants/goals'
import { IMPROVE_PROFILE, IMPROVE_SETUP_CARD } from '../../constants/improve'
import type { MessageCode } from '../../constants/goalMessages'
import { displayValue } from '../../lib/formatProfile'
import { buildCalculationContext, profileRate } from '../../lib/goals/calculate'
import { editGoals } from '../../lib/goals/editGoals'
import { formatDayLabel } from '../../lib/goals/goalFormat'
import { suggestGoals } from '../../lib/goals/goalSetup'
import { loadGoals, saveGoals } from '../../lib/goals/goalsStorage'
import { deriveTotals } from '../../lib/goals/goalTotals'
import { melbourneDate } from '../../lib/goals/melbourneTime'
import { IMPROVE_BILL_DISPLAY_FIELDS } from '../../lib/bills/billProfile'
import {
  IMPROVE_STEP_FIELDS,
  finishImproveProfile,
  validateImproveStep,
  type ImproveStepId,
} from '../../lib/improveProfile'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import { loadReminders, removeReminder, type SavedReminder } from '../../lib/reminderStorage'
import { hasErrors, type FieldErrors } from '../../lib/validateProfile'
import { GOAL_KINDS, type GoalKind, type GoalsStore } from '../../types/goals'
import type { ProfileData } from '../../types/profile'
import { GoalProgress } from '../goals/GoalProgress'
import { GoalSetupForm } from '../goals/GoalSetupForm'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import {
  BatteryIcon,
  BellIcon,
  BoltIcon,
  CheckIcon,
  LockIcon,
  PencilIcon,
  PeopleIcon,
  ResetIcon,
  TargetIcon,
} from '../ui/icons'
import { ImproveFields } from './ImproveFields'

type Props = {
  profile: ProfileData
  bundle: MethodologyBundle | null
  onSave: (profile: ProfileData) => void
  /** Undo the improve flow: answers it owns, goals, and downloaded reminders. */
  onReset: () => void
  onLogoClick: () => void
}

type Section = 'household' | 'baseline'

const SECTION_STEPS: Record<Section, ImproveStepId[]> = {
  household: ['home'],
  baseline: ['battery', 'solar'],
}

const HOUSEHOLD_FIELDS = IMPROVE_BILL_DISPLAY_FIELDS

const FIELD_LABELS: Partial<Record<keyof ProfileData, string>> = {
  provider: 'Electricity retailer',
  postcode: 'Postcode',
  monthlyKwh: 'Monthly electricity usage',
  monthlyBill: 'Monthly bill',
  batteryModel: 'Battery model',
  batteryUnits: 'Battery units',
  reservePercent: 'Battery reserve',
  panelCount: 'Solar panels',
  panelWatts: 'Panel power rating',
  solarDirection: 'Panel direction',
}

function shownValue(profile: ProfileData, field: keyof ProfileData): string {
  const raw = profile[field]
  if (typeof raw === 'string' && !raw.trim()) return IMPROVE_SETUP_CARD.missing
  return displayValue(profile, field)
}

/**
 * ImproveProfileView
 * @param props.profile - Shared answers
 * @param props.bundle - Methodology data, used to work out goal ranges
 * @param props.onSave - Persist edited answers
 * @returns JSX.Element
 *
 * One answers section is edited at a time, with the same questions as the
 * access-features form. Goals are read from and saved to the same device
 * store as the Goals tab, so an edit here shows there straight away.
 */
export function ImproveProfileView({ profile, bundle, onSave, onReset, onLogoClick }: Props) {
  const [editing, setEditing] = useState<Section | null>(null)
  const [draft, setDraft] = useState(profile)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState('')
  const [goals, setGoals] = useState<GoalsStore>(loadGoals)
  const [editingGoals, setEditingGoals] = useState(false)
  const [goalError, setGoalError] = useState<MessageCode | null>(null)
  const [reminders, setReminders] = useState<SavedReminder[]>(loadReminders)
  const [confirmReset, setConfirmReset] = useState(false)

  function patch<K extends keyof ProfileData>(field: K, value: ProfileData[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
    if (errors[field]) {
      setErrors((current) => {
        const copy = { ...current }
        delete copy[field]
        return copy
      })
    }
  }

  function startEdit(section: Section) {
    setDraft(profile)
    setErrors({})
    setNotice('')
    setEditing(section)
  }

  function saveSection(section: Section) {
    const sectionErrors = SECTION_STEPS[section].reduce<FieldErrors>(
      (all, step) => ({ ...all, ...validateImproveStep(step, draft) }),
      {},
    )
    if (hasErrors(sectionErrors)) {
      setErrors(sectionErrors)
      return
    }
    onSave(finishImproveProfile(draft))
    setEditing(null)
    setNotice(
      section === 'baseline'
        ? 'Saved. What if now starts from this setup.'
        : 'Saved. What if, Goals, and Reminders use these answers.',
    )
  }

  function saveGoalTargets(targets: Partial<Record<GoalKind, number>>) {
    const result = saveGoals(editGoals(goals, targets, new Date().toISOString(), melbourneDate(Date.now())))
    if (!result.ok) {
      setGoalError(result.reason)
      return
    }
    setGoals(result.store)
    setGoalError(null)
    setEditingGoals(false)
    setNotice('Your goals are updated. The Goals tab shows the change.')
  }

  const savedGoals =
    goals.goals.savings && goals.goals.carbon
      ? { savings: goals.goals.savings, carbon: goals.goals.carbon }
      : null
  const totals = deriveTotals(goals.months)

  return (
    <div className="profile improve-profile">
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
      </header>

      <div className="setup__intro">
        <h1>{IMPROVE_PROFILE.title}</h1>
        <p>{IMPROVE_PROFILE.lede}</p>
      </div>

      {notice ? (
        <div role="status">
          <Callout tone="success" icon={<CheckIcon />}>
            {notice}
          </Callout>
        </div>
      ) : null}

      <div className="profile__sections">
        {(['household', 'baseline'] as Section[]).map((section) => {
          const isEditing = editing === section
          const Icon = section === 'household' ? PeopleIcon : BatteryIcon
          const title = section === 'household' ? IMPROVE_PROFILE.household : IMPROVE_PROFILE.baseline
          const fields =
            section === 'household'
              ? HOUSEHOLD_FIELDS
              : SECTION_STEPS[section].flatMap((step) => IMPROVE_STEP_FIELDS[step])
          return (
            <section key={section} className="profile-card" aria-labelledby={`improve-${section}-title`}>
              <div className="profile-card__head">
                <span className="profile-card__icon">
                  <Icon />
                </span>
                <h2 id={`improve-${section}-title`}>{title}</h2>
                {isEditing ? null : (
                  <Button variant="edit" onClick={() => startEdit(section)}>
                    <PencilIcon width={14} height={14} />
                    Edit
                  </Button>
                )}
              </div>
              {section === 'baseline' ? (
                <p className="dashboard-card__lede">{IMPROVE_PROFILE.baselineLede}</p>
              ) : (
                <p className="dashboard-card__lede">{IMPROVE_PROFILE.householdLede}</p>
              )}
              {isEditing ? (
                <div className="profile-card__edit">
                  {SECTION_STEPS[section].map((step) => (
                    <ImproveFields
                      key={step}
                      step={step}
                      profile={draft}
                      errors={errors}
                      onChange={patch}
                      onApplyProfile={setDraft}
                    />
                  ))}
                  <div className="goals-form__actions">
                    <Button variant="primary" onClick={() => saveSection(section)}>
                      Save
                    </Button>
                    <Button variant="secondary" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <dl className="profile-grid">
                  {fields.map((field) => (
                    <div key={field} className="profile-grid__item">
                      <dt>{FIELD_LABELS[field] ?? field}</dt>
                      <dd>{shownValue(profile, field)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )
        })}

        <section className="profile-card" aria-labelledby="improve-goals-title">
          <div className="profile-card__head">
            <span className="profile-card__icon">
              <TargetIcon />
            </span>
            <h2 id="improve-goals-title">{IMPROVE_PROFILE.goals}</h2>
            {savedGoals && goals.baseline && bundle && !editingGoals ? (
              <Button variant="edit" onClick={() => setEditingGoals(true)}>
                <PencilIcon width={14} height={14} />
                Edit goals
              </Button>
            ) : null}
          </div>
          {!savedGoals ? (
            <p className="dashboard-card__lede">{IMPROVE_PROFILE.goalsEmpty}</p>
          ) : editingGoals && goals.baseline && bundle ? (
            <GoalSetupForm
              mode="edit"
              suggestions={suggestGoals(goals.baseline.monthly)}
              baseline={goals.baseline}
              context={buildCalculationContext(goals.baseline.ratePerKwh ?? profileRate(profile), bundle)}
              current={{ savings: savedGoals.savings.target, carbon: savedGoals.carbon.target }}
              saveError={goalError}
              onSave={saveGoalTargets}
              onCancel={() => setEditingGoals(false)}
            />
          ) : (
            <>
              {GOAL_KINDS.map((kind) => (
                <div key={kind} className="improve-profile__goal">
                  <p className="goals-range__title">{GOAL_LABELS[kind].title}</p>
                  <GoalProgress kind={kind} total={totals[kind]} target={savedGoals[kind].target} />
                </div>
              ))}
              {!goals.baseline ? <p className="dashboard-card__lede">{IMPROVE_PROFILE.goalsNoBaseline}</p> : null}
            </>
          )}
        </section>

        <section className="profile-card" aria-labelledby="improve-reminders-title">
          <div className="profile-card__head">
            <span className="profile-card__icon">
              <BellIcon />
            </span>
            <h2 id="improve-reminders-title">{IMPROVE_PROFILE.reminders}</h2>
          </div>
          {reminders.length === 0 ? (
            <p className="dashboard-card__lede">{IMPROVE_PROFILE.remindersEmpty}</p>
          ) : (
            <ul className="improve-profile__reminders">
              {reminders.map((row) => {
                const type = EVENT_TYPE_OPTIONS.find((option) => option.value === row.eventType)?.label
                const day = formatDayLabel(row.date)
                return (
                  <li key={`${row.eventType}-${row.date}`} className="improve-profile__reminder">
                    <span>
                      <strong>{day}</strong> · {type}
                    </span>
                    <Button
                      variant="secondary"
                      className="goals-history__remove"
                      aria-label={`Remove ${type} on ${day}`}
                      onClick={() => setReminders(removeReminder(row.eventType, row.date))}
                    >
                      Remove
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="profile__actions improve-profile__actions">
        <div className="profile__action">
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            <ResetIcon width={15} height={15} />
            Reset Profile
          </Button>
          <p>{IMPROVE_PROFILE.resetHint}</p>
        </div>
      </div>

      {confirmReset ? (
        <Callout
          tone="action"
          title="Reset this profile?"
          action={
            <>
              <Button variant="danger" onClick={onReset}>
                Reset
              </Button>
              <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </>
          }
        >
          {profile.lastUpdated ? IMPROVE_PROFILE.resetKeepsExplore : IMPROVE_PROFILE.resetClearsAll}
        </Callout>
      ) : null}

      <p className="setup-secure">
        <LockIcon width={14} height={14} />
        {DEVICE_STORAGE_NOTE}
      </p>
    </div>
  )
}
