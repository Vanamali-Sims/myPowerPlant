/**
 * Goals tab: set a savings and a carbon goal, then track progress from
 * battery files read on this device.
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { GOALS_DEVICE_NOTE, GOAL_SUGGESTION_MONTHS } from '../../constants/goals'
import { REASON_MESSAGES } from '../../constants/goalMessages'
import { maxIntervalKwh } from '../../lib/goals/batteryLimits'
import { buildCalculationContext, calculateDay, summariseDays } from '../../lib/goals/calculate'
import { getGoalsReadiness, monthlyProfileEstimate, suggestGoals } from '../../lib/goals/goalSetup'
import { clearGoals, loadGoals, saveGoals } from '../../lib/goals/goalsStorage'
import { formatDayLabel } from '../../lib/goals/goalFormat'
import { applyDays, planMerge } from '../../lib/goals/history'
import {
  level,
  newlyReached,
  nextGoalRange,
  reachedEntry,
  recordReached,
} from '../../lib/goals/achievements'
import { melbourneDate } from '../../lib/goals/melbourneTime'
import { formatGoalValue, progressPercent } from '../../lib/goals/goalFormat'
import { stageForStep, treeStep } from '../../lib/goals/progress'
import type { GoalSuggestions } from '../../lib/goals/goalSetup'
import { deriveTotals } from '../../lib/goals/goalTotals'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import {
  GOAL_KINDS,
  emptyGoalsStore,
  type GoalEntry,
  type GoalKind,
  type GoalsStore,
} from '../../types/goals'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { AlertIcon, BoltIcon, CheckIcon, LockIcon } from '../ui/icons'
import { ClearGoalsDialog } from './ClearGoalsDialog'
import { GoalOverview } from './GoalOverview'
import { HistoryTable } from './HistoryTable'
import { LevelUpDialog, type Achievement } from './LevelUpDialog'
import { GoalSetupForm } from './GoalSetupForm'
import { ProfileIncomplete } from './ProfileIncomplete'
import { UploadArea, type ReadDays } from './UploadArea'
import { UploadPreview } from './UploadPreview'

// The chart library is large, so the graph loads on its own after the page.
const MonthlyChart = lazy(() =>
  import('./MonthlyChart').then((module) => ({ default: module.MonthlyChart })),
)

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
  const [previewError, setPreviewError] = useState('')
  const [clearOpen, setClearOpen] = useState(false)
  const [achievement, setAchievement] = useState<Achievement | null>(null)
  /** Goals being replaced after they were reached; null when not doing that. */
  const [nextKinds, setNextKinds] = useState<GoalKind[] | null>(null)
  const overviewHeading = useRef<HTMLHeadingElement>(null)
  const setupHeading = useRef<HTMLHeadingElement>(null)
  const focusOverviewNext = useRef(false)
  const focusSetupNext = useRef(false)

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
  const reached = {
    savings: reachedEntry(store, 'savings'),
    carbon: reachedEntry(store, 'carbon'),
  }
  const plan = useMemo(
    () =>
      pendingRead && context
        ? planMerge(
            store.months,
            pendingRead.days.map((day) => calculateDay(day, context)),
          )
        : null,
    [context, pendingRead, store.months],
  )
  const preview = useMemo(
    () => (plan && plan.newDays.length ? summariseDays(plan.newDays) : null),
    [plan],
  )

  // After a save, cancel, or clear, move focus to the right heading once it renders.
  useEffect(() => {
    if (focusOverviewNext.current) {
      focusOverviewNext.current = false
      overviewHeading.current?.focus()
    }
    if (focusSetupNext.current) {
      focusSetupNext.current = false
      setupHeading.current?.focus()
    }
  })

  function today(): string {
    return melbourneDate(Date.now())
  }

  /**
   * save
   * Saves new or edited goals, or the next goal after one was reached.
   * A reached goal that changes becomes a new goal (new setOn); its completed
   * entry stays. Lowering a goal to or below the total records it as reached
   * by edit, with no celebration.
   */
  function save(targets: Partial<Record<GoalKind, number>>) {
    const setOn = new Date().toISOString()
    const replacing = nextKinds ?? []
    const nextGoals = { ...store.goals }
    for (const kind of GOAL_KINDS) {
      const target = targets[kind]
      if (target === undefined) continue
      const existing = store.goals[kind]
      const isNew =
        !existing || replacing.includes(kind) || (reachedEntry(store, kind) && existing.target !== target)
      nextGoals[kind] = { target, setOn: isNew || !existing ? setOn : existing.setOn }
    }
    let next: GoalsStore = { ...store, goals: nextGoals }
    const byEdit = newlyReached(next, totals)
    if (byEdit.length) next = recordReached(next, byEdit, totals, today(), true)
    const result = saveGoals(next)
    if (!result.ok) {
      setSaveError(REASON_MESSAGES[result.reason])
      return
    }
    let message = goals ? 'Your goals are updated.' : 'Your goals are saved on this device.'
    if (replacing.length) {
      message = 'Your next goal is saved. Progress continues from your total so far.'
      const oldGoal = store.goals.carbon
      const newGoal = nextGoals.carbon
      if (replacing.includes('carbon') && oldGoal && newGoal) {
        const before = treeStep(progressPercent(totals.carbon, oldGoal.target))
        const after = treeStep(progressPercent(totals.carbon, newGoal.target))
        if (after < before) {
          message += ` Your tree is now at the ${stageForStep(after)} stage, because your new carbon goal is bigger. It grows again as you count more.`
        }
      }
    }
    setStore(result.store)
    setSaveError('')
    setNotice(message)
    setEditing(false)
    setNextKinds(null)
    focusOverviewNext.current = true
  }

  function startNextGoal(kinds: GoalKind[]) {
    setAchievement(null)
    setNotice('')
    setSaveError('')
    setEditing(false)
    setNextKinds(kinds)
    focusSetupNext.current = true
  }

  function viewAchievement(kind: GoalKind) {
    setAchievement({ kinds: [kind], level: level(store), totals, celebrate: false })
  }

  function closeAchievement() {
    setAchievement(null)
    focusOverviewNext.current = true
  }

  function closePreview(message: string) {
    setPendingRead(null)
    setPreviewError('')
    setUploadStatus(message)
    document.getElementById('goals-upload-title')?.focus()
  }

  function confirmUpload() {
    if (!pendingRead || !plan || !plan.newDays.length) return
    let next: GoalsStore = {
      ...store,
      months: applyDays(store.months, plan.newDays, pendingRead.sourceId, new Date().toISOString()),
    }
    const totalsAfter = deriveTotals(next.months)
    const justReached = newlyReached(next, totalsAfter)
    if (justReached.length) next = recordReached(next, justReached, totalsAfter, today())
    const result = saveGoals(next)
    if (!result.ok) {
      setPreviewError(REASON_MESSAGES[result.reason])
      return
    }
    const added = plan.newDays.length
    setStore(result.store)
    setPendingRead(null)
    setPreviewError('')
    setUploadStatus('')
    setNotice(
      `Saved. ${added === 1 ? '1 day was' : `${added} days were`} added to your history.`,
    )
    if (justReached.length) {
      setAchievement({
        kinds: justReached,
        level: level(result.store),
        totals: totalsAfter,
        celebrate: true,
      })
    } else {
      focusOverviewNext.current = true
    }
  }

  function confirmClear() {
    setClearOpen(false)
    if (!clearGoals()) {
      setNotice('')
      setUploadStatus(REASON_MESSAGES.write_failed)
      return
    }
    setStore(emptyGoalsStore())
    setPendingRead(null)
    setEditing(false)
    setNextKinds(null)
    setUploadStatus('')
    setNotice('Your goals and history were cleared from this device.')
    focusSetupNext.current = true
  }

  function startEdit() {
    setNotice('')
    setSaveError('')
    setEditing(true)
  }

  function cancelEdit() {
    setSaveError('')
    setEditing(false)
    setNextKinds(null)
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

  const showForm = readiness.ready && estimate && (!goals || editing || nextKinds)

  const nextSuggestions: GoalSuggestions | null =
    estimate && nextKinds
      ? {
          savings: estimate.suggestions.savings
            ? nextGoalRange(totals.savings, estimate.suggestions.savings)
            : null,
          carbon: estimate.suggestions.carbon
            ? nextGoalRange(totals.carbon, estimate.suggestions.carbon)
            : null,
        }
      : null

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

      {goals && !editing && !nextKinds ? (
        <GoalOverview
          headingRef={overviewHeading}
          goals={goals}
          totals={totals}
          months={store.months}
          reached={reached}
          canEdit={Boolean(readiness.ready && estimate)}
          onEdit={startEdit}
          onSetNewGoal={(kind) => startNextGoal([kind])}
          onViewAchievement={viewAchievement}
        />
      ) : null}

      {showForm ? (
        <section className="dashboard-card goals-setup" aria-labelledby="goals-setup-title">
          <h2 id="goals-setup-title" ref={setupHeading} tabIndex={-1}>
            {nextKinds ? 'Set your next goal' : goals ? 'Edit your goals' : 'Set your goals'}
          </h2>
          <p className="dashboard-card__lede">
            {nextKinds
              ? 'Your reached goal stays on record. Your next goal counts on from your total so far, so it needs to be higher than that total.'
              : 'Choose a goal for money saved and a goal for carbon avoided. You can change them later.'}
          </p>
          <GoalSetupForm
            key={nextKinds ? `next-${nextKinds.join('-')}` : 'goals'}
            mode={nextKinds ? 'next' : goals ? 'edit' : 'create'}
            kinds={nextKinds ?? undefined}
            note={
              nextKinds
                ? `So far: ${nextKinds
                    .map((kind) => formatGoalValue(kind, totals[kind]))
                    .join(' and ')}. The suggested next goal adds about ${GOAL_SUGGESTION_MONTHS.suggested} more months of your profile estimate.`
                : undefined
            }
            suggestions={nextSuggestions ?? estimate.suggestions}
            monthly={estimate.monthly}
            factor={estimate.factor}
            current={
              nextKinds
                ? { savings: null, carbon: null }
                : {
                    savings: store.goals.savings?.target ?? null,
                    carbon: store.goals.carbon?.target ?? null,
                  }
            }
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

      {plan && !preview && pendingRead && goals ? (
        <section
          className="dashboard-card goals-preview"
          aria-labelledby="goals-counted-title"
          role="status"
        >
          <h2 id="goals-counted-title">This file is already counted</h2>
          <p className="dashboard-card__lede">
            Every day from {formatDayLabel(pendingRead.days[0].date)} to{' '}
            {formatDayLabel(pendingRead.days[pendingRead.days.length - 1].date)} is already in
            your history, so there is nothing new to add.
          </p>
          <div className="goals-preview__actions">
            <Button variant="secondary" onClick={() => closePreview('Nothing was saved.')}>
              Close
            </Button>
          </div>
        </section>
      ) : null}

      {preview && plan && context && goals ? (
        <UploadPreview
          preview={preview}
          context={context}
          goals={goals}
          savedTotals={totals}
          skippedCount={plan.skippedDays.length}
          saveError={previewError}
          onConfirm={confirmUpload}
          onCancel={() => closePreview('Nothing was saved.')}
        />
      ) : null}

      {goals ? (
        <Suspense
          fallback={
            <p className="goals__loading" role="status">
              Loading your monthly graph…
            </p>
          }
        >
          <MonthlyChart
            months={store.months}
            goals={goals}
            onGoToUpload={() => document.getElementById('goals-upload-title')?.focus()}
          />
        </Suspense>
      ) : null}

      {goals ? (
        <HistoryTable
          months={store.months}
          onGoToUpload={() => document.getElementById('goals-upload-title')?.focus()}
        />
      ) : null}

      {goals || store.months.length || store.completedGoals.length ? (
        <section className="goals-danger" aria-labelledby="goals-danger-title">
          <h2 id="goals-danger-title">Start over</h2>
          <p>Remove your goals and history from this device and go back to setting new goals.</p>
          <Button variant="danger" onClick={() => setClearOpen(true)}>
            Clear my goals and history
          </Button>
        </section>
      ) : null}

      <LevelUpDialog
        achievement={achievement}
        onNextStep={startNextGoal}
        onClose={closeAchievement}
      />

      <ClearGoalsDialog
        open={clearOpen}
        onConfirm={confirmClear}
        onCancel={() => setClearOpen(false)}
      />
    </div>
  )
}
