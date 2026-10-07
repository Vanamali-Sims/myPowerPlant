/**
 * Goals tab: set a savings and a carbon goal, then track progress from
 * battery files read on this device.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { GOALS_DEVICE_NOTE } from '../../constants/goals'
import { REASON_MESSAGES } from '../../constants/goalMessages'
import { maxIntervalKwh } from '../../lib/goals/batteryLimits'
import { buildCalculationContext, calculateDay, summariseDays } from '../../lib/goals/calculate'
import { getGoalsReadiness, monthlyProfileEstimate, suggestGoals } from '../../lib/goals/goalSetup'
import { loadGoals, saveGoals } from '../../lib/goals/goalsStorage'
import { deriveTotals } from '../../lib/goals/goalTotals'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import type { GoalEntry, GoalKind, GoalsStore } from '../../types/goals'
import type { ProfileData } from '../../types/profile'
import { Callout } from '../ui/Callout'
import { AlertIcon, BoltIcon, CheckIcon, LockIcon } from '../ui/icons'
import { GoalOverview } from './GoalOverview'
import { GoalSetupForm } from './GoalSetupForm'
import { ProfileIncomplete } from './ProfileIncomplete'
import { UploadArea, type ReadDays } from './UploadArea'
import { UploadPreview } from './UploadPreview'

type Props = {
  profile: ProfileData
  bundle: MethodologyBundle | null
  methodologyError: string
  onOpenProfile: () => void
  onStartSetup: () => void
  onLogoClick: () => void
}

function bothGoals(store: GoalsStore): Record<GoalKind, GoalEntry> | null {
  const { savings, carbon } = store.goals
  return savings && carbon ? { savings, carbon } : null
}

/**
 * GoalsView
 * @param props.profile - Household answers held by App
 * @param props.bundle - Methodology data App already loaded; Goals makes no request of its own
 * @returns JSX.Element
 *
 * Goals and history are read from and written to this device only. Suggested
 * goals come from the profile estimate, and nothing is suggested until the
 * profile is complete.
 */
export function GoalsView({
  profile,
  bundle,
  methodologyError,
  onOpenProfile,
  onStartSetup,
  onLogoClick,
}: Props) {
  const [store, setStore] = useState<GoalsStore>(loadGoals)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const [saveError, setSaveError] = useState('')
  const [pendingRead, setPendingRead] = useState<ReadDays | null>(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const overviewHeading = useRef<HTMLHeadingElement>(null)
  const setupHeading = useRef<HTMLHeadingElement>(null)
  const focusOverviewNext = useRef(false)

  const readiness = useMemo(() => getGoalsReadiness(profile), [profile])
  const estimate = useMemo(() => {
    if (!readiness.ready || !bundle) return null
    return {
      suggestions: suggestGoals(profile, bundle),
      monthly: monthlyProfileEstimate(profile, bundle),
      factor: bundle.methodology.vicGridKgCo2PerKwh,
    }
  }, [bundle, profile, readiness.ready])

  const limits = useMemo(
    () => (readiness.ready && bundle ? { maxIntervalKwh: maxIntervalKwh(profile, bundle) } : null),
    [bundle, profile, readiness.ready],
  )

  const context = useMemo(
    () => (readiness.ready && bundle ? buildCalculationContext(profile, bundle) : null),
    [bundle, profile, readiness.ready],
  )

  const goals = bothGoals(store)
  const totals = useMemo(() => deriveTotals(store.months), [store.months])
  const preview = useMemo(
    () =>
      pendingRead && context
        ? summariseDays(pendingRead.days.map((day) => calculateDay(day, context)))
        : null,
    [context, pendingRead],
  )

  // After a save or cancel, move focus to the goals heading once it renders.
  useEffect(() => {
    if (!focusOverviewNext.current) return
    focusOverviewNext.current = false
    overviewHeading.current?.focus()
  })

  function save(targets: Record<GoalKind, number>) {
    const setOn = new Date().toISOString()
    const next: GoalsStore = {
      ...store,
      goals: {
        savings: { target: targets.savings, setOn: store.goals.savings?.setOn ?? setOn },
        carbon: { target: targets.carbon, setOn: store.goals.carbon?.setOn ?? setOn },
      },
    }
    const result = saveGoals(next)
    if (!result.ok) {
      setSaveError(REASON_MESSAGES[result.reason])
      return
    }
    setStore(result.store)
    setSaveError('')
    setNotice(goals ? 'Your goals are updated.' : 'Your goals are saved on this device.')
    setEditing(false)
    focusOverviewNext.current = true
  }

  function closePreview(message: string) {
    setPendingRead(null)
    setUploadStatus(message)
    document.getElementById('goals-upload-title')?.focus()
  }

  function startEdit() {
    setNotice('')
    setSaveError('')
    setEditing(true)
  }

  function cancelEdit() {
    setSaveError('')
    setEditing(false)
    focusOverviewNext.current = true
  }

  const estimatesMessage = !bundle ? (
    methodologyError ? (
      <div role="alert">
        <Callout tone="accent" icon={<AlertIcon />} title="Estimates are unavailable right now">
          Goal suggestions need the same estimate data as the dashboard, and it could not be
          loaded. Your saved goals are not affected. Try again later.
        </Callout>
      </div>
    ) : (
      <p className="goals__loading" role="status">
        Loading estimates…
      </p>
    )
  ) : null

  const showForm = readiness.ready && estimate && (!goals || editing)

  return (
    <div className="goals">
      <header className="goals__top">
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

      <div className="goals__intro">
        <h1>Goals</h1>
        <p>
          Set a savings goal and a carbon goal, then upload your battery activity file each month
          to see how close you are.
        </p>
        <p className="goals__device-note">
          <LockIcon width={14} height={14} />
          <span>{GOALS_DEVICE_NOTE}</span>
        </p>
      </div>

      {notice ? (
        <div role="status">
          <Callout tone="success" icon={<CheckIcon />}>
            {notice}
          </Callout>
        </div>
      ) : null}

      {!readiness.ready ? (
        <ProfileIncomplete
          hasSavedProfile={readiness.hasSavedProfile}
          missing={readiness.missing}
          onOpenProfile={onOpenProfile}
          onStartSetup={onStartSetup}
        />
      ) : (
        estimatesMessage
      )}

      {goals && !editing ? (
        <GoalOverview
          headingRef={overviewHeading}
          goals={goals}
          totals={totals}
          canEdit={Boolean(readiness.ready && estimate)}
          onEdit={startEdit}
        />
      ) : null}

      {showForm ? (
        <section className="dashboard-card goals-setup" aria-labelledby="goals-setup-title">
          <h2 id="goals-setup-title" ref={setupHeading} tabIndex={-1}>
            {goals ? 'Edit your goals' : 'Set your goals'}
          </h2>
          <p className="dashboard-card__lede">
            Choose a goal for money saved and a goal for carbon avoided. You can change them later.
          </p>
          <GoalSetupForm
            mode={goals ? 'edit' : 'create'}
            suggestions={estimate.suggestions}
            monthly={estimate.monthly}
            factor={estimate.factor}
            current={{
              savings: store.goals.savings?.target ?? null,
              carbon: store.goals.carbon?.target ?? null,
            }}
            saveError={saveError}
            onSave={save}
            onCancel={goals ? cancelEdit : undefined}
          />
        </section>
      ) : null}

      <UploadArea
        locked={!goals}
        canGoToSetup={Boolean(showForm)}
        onGoToSetup={() => setupHeading.current?.focus()}
        limits={limits}
        onContinue={(read) => {
          setUploadStatus('')
          setPendingRead(read)
        }}
      />

      <p className="goals__upload-status" role="status">
        {uploadStatus}
      </p>

      {pendingRead && goals && !preview ? (
        <p className="goals-upload__locked" role="alert">
          <AlertIcon width={16} height={16} />
          <span>{REASON_MESSAGES.estimates_unavailable} Your file was not added.</span>
        </p>
      ) : null}

      {preview && context && goals ? (
        <UploadPreview
          preview={preview}
          context={context}
          goals={goals}
          savedTotals={totals}
          onConfirm={() =>
            closePreview('Saving confirmed figures is not switched on yet. Nothing was saved.')
          }
          onCancel={() => closePreview('Nothing was saved.')}
        />
      ) : null}
    </div>
  )
}
