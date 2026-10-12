/**
 * Goals tab: read one recent month of a battery file, set a savings and a
 * carbon goal from it, then track progress from battery files read on this device.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { GOALS_FORM, GOALS_PAGE, GOAL_SUGGESTION_MONTHS } from '../../constants/goals'
import type { MessageCode } from '../../constants/goalMessages'
import { batteryFromProfile, maxIntervalKwh, savedProfileBattery } from '../../lib/goals/batteryLimits'
import { buildCalculationContext, calculateDay, profileRate, summariseDays } from '../../lib/goals/calculate'
import { suggestGoals } from '../../lib/goals/goalSetup'
import { clearGoals, loadGoals, saveGoals } from '../../lib/goals/goalsStorage'
import { withGoalTargets } from '../../lib/goals/editGoals'
import { applyDays, planMerge, removeMonth } from '../../lib/goals/history'
import { applyReplacement, checkRevisions, missingDays } from '../../lib/goals/revisions'
import {
  level,
  newlyReached,
  nextGoalRange,
  reachedEntry,
  recordReached,
} from '../../lib/goals/achievements'
import { melbourneDate } from '../../lib/goals/melbourneTime'
import { monthOf } from '../../lib/goals/calendar'
import {
  formatGoalValue,
  formatMonthLabel,
  formatRangeLabel,
  progressPercent,
} from '../../lib/goals/goalFormat'
import { stageForStep, treeStep } from '../../lib/goals/progress'
import type { GoalSuggestions } from '../../lib/goals/goalSetup'
import { deriveTotals } from '../../lib/goals/goalTotals'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import {
  emptyGoalsStore,
  type GoalEntry,
  type GoalKind,
  type GoalsStore,
} from '../../types/goals'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { CheckIcon } from '../ui/icons'
import { MyPowerPlantMark } from '../ui/MyPowerPlantMark'
import type { BaselineDraft } from './baselineDraft'
import { BaselineStep } from './BaselineStep'
import { GoalsSetupBoard } from './GoalsSetupBoard'
import { ClearGoalsDialog } from './ClearGoalsDialog'
import { GoalMessage } from './GoalMessage'
import { GoalGarden } from './GoalGarden'
import { LevelUpDialog, type Achievement } from './LevelUpDialog'
import { GoalsFormBoard } from './GoalsFormBoard'
import { RemoveMonthDialog } from './RemoveMonthDialog'
import { ProgressHistory } from './ProgressHistory'
import { RevisionPanel } from './RevisionPanel'
import type { ReadDays } from './UploadArea'
import { UploadDialog } from './UploadDialog'
import { UploadSummary } from './UploadSummary'

/** Melbourne calendar day, read when the person saves rather than during render. */
function today(): string {
  return melbourneDate(Date.now())
}

/** Stable month label for the sample goals card. Frozen when this module loads. */
const PREVIEW_BASELINE_MONTH = monthOf(today())

type Props = {
  profile: ProfileData
  bundle: MethodologyBundle | null
  methodologyError: string
  onLogoClick: () => void
}

/** Which part of goal setup is on screen, or null when setup is closed. */
type SetupStage = 'choice' | 'upload' | 'form' | null

/**
 * baselineDaysSentence
 * @param draft - Baseline read during setup
 * @param newDays - How many of its days are not counted yet
 * @param verb - 'will be' before saving, 'were' after
 * @returns One sentence saying what the baseline adds to progress
 */
function baselineDaysSentence(draft: BaselineDraft, newDays: number, verb: 'will be' | 'were'): string {
  const month = formatMonthLabel(draft.baseline.month)
  if (!newDays) return `${month} is already in your history, so nothing new is added.`
  const days = newDays === 1 ? '1 day' : `${newDays} days`
  const when = verb === 'will be' ? ' when you save your goals' : ''
  return `${days} from ${month} ${verb} added to your goal progress${when}.`
}

function bothGoals(store: GoalsStore): Record<GoalKind, GoalEntry> | null {
  const { savings, carbon } = store.goals
  return savings && carbon ? { savings, carbon } : null
}

/**
 * GoalsView
 * @param props.profile - Household answers held by App; may be empty
 * @param props.bundle - Methodology data App already loaded; Goals makes no request of its own
 * @returns JSX.Element
 *
 * Goals and history are read from and written to this device only. Suggested
 * goals come from one recent month of the household's battery file, so no
 * profile is needed. When the profile has the battery or bill and usage, those
 * are used and not asked again.
 */
export function GoalsView({ profile, bundle, methodologyError, onLogoClick }: Props) {
  const [store, setStore] = useState<GoalsStore>(loadGoals)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const [saveError, setSaveError] = useState<MessageCode | null>(null)
  const [pendingRead, setPendingRead] = useState<ReadDays | null>(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [previewError, setPreviewError] = useState<MessageCode | null>(null)
  const [clearError, setClearError] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [achievement, setAchievement] = useState<Achievement | null>(null)
  /** Goals being replaced after they were reached; null when not doing that. */
  const [nextKinds, setNextKinds] = useState<GoalKind[] | null>(null)
  /** Baseline read from a file during setup, saved only with the goals. */
  const [draft, setDraft] = useState<BaselineDraft | null>(null)
  /** For a next goal: keep the saved baseline or read a newer file. */
  const [baselineChoice, setBaselineChoice] = useState<'current' | 'upload' | null>(null)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<MessageCode | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const overviewHeading = useRef<HTMLHeadingElement>(null)
  const setupHeading = useRef<HTMLHeadingElement>(null)
  const focusOverviewNext = useRef(false)
  const focusSetupNext = useRef(false)

  // The profile is the source of the battery and rate; goals only keep what it lacks.
  const profileBattery = savedProfileBattery(profile)
  const battery = profileBattery ?? store.baseline?.battery ?? batteryFromProfile(profile)
  const rateFromProfile = profileRate(profile)

  const limits = useMemo(
    () => (bundle ? { maxIntervalKwh: maxIntervalKwh(battery, bundle) } : null),
    [battery, bundle],
  )

  // Uploads use a rate typed in Goals, else bill ÷ usage from the profile, else the typical Victorian rate.
  const savedRate = store.baseline?.ratePerKwh ?? rateFromProfile
  const context = useMemo(
    () => (bundle ? buildCalculationContext(savedRate, bundle) : null),
    [bundle, savedRate],
  )

  const goals = bothGoals(store)
  const totals = useMemo(() => deriveTotals(store.months), [store.months])
  const reached = {
    savings: reachedEntry(store, 'savings'),
    carbon: reachedEntry(store, 'carbon'),
  }
  const fileDays = useMemo(
    () => (pendingRead && context ? pendingRead.days.map((day) => calculateDay(day, context)) : null),
    [context, pendingRead],
  )
  const plan = useMemo(
    () => (fileDays ? planMerge(store.months, fileDays) : null),
    [fileDays, store.months],
  )
  const revisionCheck = useMemo(
    () => (fileDays ? checkRevisions(store.months, fileDays) : null),
    [fileDays, store.months],
  )
  const gaps = useMemo(
    () => (fileDays ? missingDays(store.months, fileDays) : []),
    [fileDays, store.months],
  )
  const preview = useMemo(
    () => (plan && plan.newDays.length ? summariseDays(plan.newDays) : null),
    [plan],
  )
  /** Months as they would be after this file, for the "will add" summary. */
  const monthsAfter = useMemo(
    () => (plan && pendingRead ? applyDays(store.months, plan.newDays, pendingRead.sourceId, 'preview') : store.months),
    [plan, pendingRead, store.months],
  )
  /** Baseline days not counted yet; these are added when the goals are saved. */
  const draftNewDays = useMemo(
    () => (draft ? planMerge(store.months, draft.days).newDays : []),
    [draft, store.months],
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

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(''), 8000)
    return () => window.clearTimeout(id)
  }, [notice])

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
    const nextGoals = withGoalTargets(store, targets, replacing, setOn)
    // The baseline month counts towards progress, so its new days go in with the goals.
    const months = draft ? applyDays(store.months, draftNewDays, draft.sourceId, setOn) : store.months
    const totalsAfter = deriveTotals(months)
    let next: GoalsStore = {
      ...store,
      months,
      baseline: draft ? { ...draft.baseline, setOn } : store.baseline,
    }
    // Goals the baseline days reach before any goal changes are celebrated like an upload.
    const byUpload = newlyReached(next, totalsAfter)
    if (byUpload.length) next = recordReached(next, byUpload, totalsAfter, today())
    next = { ...next, goals: nextGoals }
    const byEdit = newlyReached(next, totalsAfter)
    if (byEdit.length) next = recordReached(next, byEdit, totalsAfter, today(), true)
    const result = saveGoals(next)
    if (!result.ok) {
      setSaveError(result.reason)
      return
    }
    let message = goals ? 'Your goals are updated.' : 'Your goals are saved on this device.'
    if (replacing.length) {
      message = 'Your next goal is saved. Progress continues from your total so far.'
      const oldGoal = store.goals.carbon
      const newGoal = nextGoals.carbon
      if (replacing.includes('carbon') && oldGoal && newGoal) {
        const before = treeStep(progressPercent(totals.carbon, oldGoal.target))
        const after = treeStep(progressPercent(totalsAfter.carbon, newGoal.target))
        if (after < before) {
          message += ` Your tree is now at the ${stageForStep(after)} stage, because your new carbon goal is bigger. It grows again as you count more.`
        }
      }
    }
    if (draft) message += ` ${baselineDaysSentence(draft, draftNewDays.length, 'were')}`
    setStore(result.store)
    setSaveError(null)
    setNotice(message)
    closeSetup()
    if (byUpload.length) {
      setAchievement({
        kinds: byUpload,
        level: level(result.store),
        totals: totalsAfter,
        celebrate: true,
      })
    } else {
      focusOverviewNext.current = true
    }
  }

  function closeSetup() {
    setEditing(false)
    setNextKinds(null)
    setDraft(null)
    setBaselineChoice(null)
  }

  function acceptBaselineDraft(next: BaselineDraft) {
    setDraft(next)
    focusSetupNext.current = true
  }

  function chooseBaseline(choice: 'current' | 'upload') {
    setBaselineChoice(choice)
    focusSetupNext.current = true
  }

  function chooseAnotherFile() {
    setDraft(null)
    setSaveError(null)
    focusSetupNext.current = true
  }

  function startNextGoal(kinds: GoalKind[]) {
    setAchievement(null)
    setNotice('')
    setSaveError(null)
    closeSetup()
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

  function openUpload() {
    setNotice('')
    setUploadStatus('')
    setPreviewError(null)
    setUploadOpen(true)
  }

  function closePreview(message: string) {
    setPendingRead(null)
    setPreviewError(null)
    setUploadOpen(false)
    setUploadStatus(message)
    document.getElementById('goals-upload-button')?.focus()
  }

  /**
   * saveUpload
   * Writes new monthly records and any newly reached goals in one save. If
   * the write fails the preview stays open and nothing changes.
   */
  function saveUpload(months: GoalsStore['months'], message: string) {
    let next: GoalsStore = { ...store, months }
    const totalsAfter = deriveTotals(next.months)
    const justReached = newlyReached(next, totalsAfter)
    if (justReached.length) next = recordReached(next, justReached, totalsAfter, today())
    const result = saveGoals(next)
    if (!result.ok) {
      setPreviewError(result.reason)
      return
    }
    setStore(result.store)
    setPendingRead(null)
    setPreviewError(null)
    setUploadOpen(false)
    setUploadStatus('')
    setNotice(message)
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

  function confirmUpload() {
    if (!pendingRead || !plan || !plan.newDays.length) return
    const added = plan.newDays.length
    saveUpload(
      applyDays(store.months, plan.newDays, pendingRead.sourceId, new Date().toISOString()),
      `Saved. ${added === 1 ? '1 day was' : `${added} days were`} added to your history.`,
    )
  }

  function replaceUpload() {
    if (!pendingRead || !plan || !revisionCheck?.revised.length) return
    const months = revisionCheck.revised.map((revision) => formatMonthLabel(revision.month))
    saveUpload(
      applyReplacement(
        store.months,
        revisionCheck.revised,
        plan.newDays,
        pendingRead.sourceId,
        new Date().toISOString(),
        today(),
      ),
      `Saved. The figures for ${months.join(', ')} were replaced with the new figures.`,
    )
  }

  function confirmClear() {
    setClearOpen(false)
    if (!clearGoals()) {
      setNotice('')
      setClearError(true)
      return
    }
    setClearError(false)
    setStore(emptyGoalsStore())
    setPendingRead(null)
    closeSetup()
    setUploadStatus('')
    setNotice('Your goals and history were cleared from this device.')
    focusSetupNext.current = true
  }

  function confirmRemove() {
    const month = removeTarget
    setRemoveTarget(null)
    if (!month) return
    const result = saveGoals({ ...store, months: removeMonth(store.months, month) })
    if (!result.ok) {
      setNotice('')
      setRemoveError(result.reason)
      return
    }
    setStore(result.store)
    setRemoveError(null)
    setNotice(
      `${formatMonthLabel(month)} was removed from your history. Goals you already reached stay on record.`,
    )
    focusOverviewNext.current = true
  }

  function startEdit() {
    setNotice('')
    setSaveError(null)
    closeSetup()
    setEditing(true)
  }

  function cancelEdit() {
    setSaveError(null)
    closeSetup()
    focusOverviewNext.current = true
  }

  const estimatesMessage = !bundle ? (
    methodologyError ? (
      <GoalMessage
        code="estimates_unavailable"
        details={
          <p>
            Goal ranges and upload estimates need the same estimate data as the dashboard, and it
            could not be loaded.
          </p>
        }
      />
    ) : (
      <p className="goals__loading" role="status">
        Loading estimates…
      </p>
    )
  ) : null

  const settingUp = Boolean(bundle && context) && (!goals || editing || Boolean(nextKinds))
  let stage: SetupStage = null
  if (settingUp) {
    if (draft) stage = 'form'
    else if (!goals || !store.baseline) stage = 'upload'
    else if (!nextKinds) stage = 'form'
    else if (baselineChoice === 'current') stage = 'form'
    else stage = baselineChoice === 'upload' ? 'upload' : 'choice'
  }

  const activeBaseline = draft?.baseline ?? store.baseline
  // Totals as they will be once the baseline days are saved, so a next goal starts above them.
  const formTotals = {
    savings: totals.savings + draftNewDays.reduce((sum, day) => sum + day.savingsAud, 0),
    carbon: totals.carbon + draftNewDays.reduce((sum, day) => sum + day.carbonKg, 0),
  }
  const baseSuggestions = activeBaseline ? suggestGoals(activeBaseline.monthly) : null
  const formSuggestions: GoalSuggestions | null =
    baseSuggestions && nextKinds
      ? {
          savings: baseSuggestions.savings
            ? nextGoalRange(formTotals.savings, baseSuggestions.savings)
            : null,
          carbon: baseSuggestions.carbon
            ? nextGoalRange(formTotals.carbon, baseSuggestions.carbon)
            : null,
        }
      : baseSuggestions
  const setupTitle = nextKinds ? 'Set your next goal' : goals ? 'Edit your goals' : 'Set your goals'

  const showOverview = Boolean(goals) && !editing && !nextKinds
  const firstTimeSetup = !goals && !editing && !nextKinds
  const showOnboardingBoard =
    firstTimeSetup &&
    Boolean(bundle) &&
    (stage === 'upload' || (stage === 'form' && Boolean(draft)))
  const showFormBoard =
    stage === 'form' && Boolean(activeBaseline) && Boolean(formSuggestions) && Boolean(bundle) && !showOnboardingBoard
  const previewMonthly = { savings: 50, carbon: 30 }
  const previewSuggestions = suggestGoals(previewMonthly)
  const previewBaseline = {
    month: PREVIEW_BASELINE_MONTH,
    days: 30,
    monthly: previewMonthly,
  }
  const onboardingContext = bundle ? buildCalculationContext(rateFromProfile, bundle) : null

  return (
    <div
      className={`goals${showOverview ? ' goals--overview' : ''}${showOnboardingBoard ? ' goals--setup-board' : ''}${showFormBoard ? ' goals--form-board' : ''}`}
    >
      <header className="goals__top">
        <button
          type="button"
          className="brand brand--button brand--desktop-hidden"
          onClick={onLogoClick}
          aria-label="MyPowerPlant home"
        >
          <span className="brand__mark brand__mark--logo">
            <MyPowerPlantMark width={28} height={28} />
          </span>
          MyPowerPlant
        </button>
      </header>

      <div className="goals-head">
        <div className="goals-head__copy">
          <p className="eyebrow goals-head__eyebrow">{GOALS_PAGE.eyebrow}</p>
          <h1 className="goals-head__title">{GOALS_PAGE.title}</h1>
          {firstTimeSetup && bundle ? (
            <p className="goals-head__lede">{GOALS_PAGE.setupLede}</p>
          ) : showOverview ? (
            <p className="goals-head__lede">
              {store.months.length ? GOALS_PAGE.uploadPromptAgain : GOALS_PAGE.uploadPrompt}
            </p>
          ) : null}
        </div>
        {goals && !editing && !nextKinds ? (
          <div className="goals-head__actions">
            <Button
              id="goals-upload-button"
              variant="primary"
              className="goals-head__upload"
              disabled={!limits || !context}
              onClick={openUpload}
            >
              <span aria-hidden="true">↑</span>
              {GOALS_PAGE.upload}
            </Button>
          </div>
        ) : null}
      </div>

      {notice ? (
        <div
          className={`goals-notice${showOnboardingBoard || showFormBoard ? ' goals-notice--setup' : ''}`}
          role="status"
        >
          <Callout
            tone="success"
            icon={<CheckIcon />}
            action={
              <Button variant="secondary" className="goals-notice__dismiss" onClick={() => setNotice('')}>
                Dismiss
              </Button>
            }
          >
            {notice}
          </Callout>
        </div>
      ) : null}

      {estimatesMessage}

      {goals && !editing && !nextKinds ? (
        <GoalGarden
          headingRef={overviewHeading}
          goals={goals}
          totals={totals}
          months={store.months}
          reached={reached}
          onSetNewGoal={(kind) => startNextGoal([kind])}
          onViewAchievement={viewAchievement}
          onEdit={bundle && context ? startEdit : undefined}
        />
      ) : null}

      {stage === 'choice' && store.baseline ? (
        <section className="dashboard-card goals-setup" aria-labelledby="goals-setup-title">
          <h2 id="goals-setup-title" ref={setupHeading} tabIndex={-1}>
            {setupTitle}
          </h2>
          <p className="dashboard-card__lede">
            Your last goal range came from your battery file for{' '}
            {formatMonthLabel(store.baseline.month)}. Has anything changed since then, such as more
            solar panels or a new battery? A more recent file gives a more realistic range.
          </p>
          <div className="goals-form__actions">
            <Button variant="primary" onClick={() => chooseBaseline('current')}>
              Keep using {formatMonthLabel(store.baseline.month)}
            </Button>
            <Button variant="secondary" onClick={() => chooseBaseline('upload')}>
              Upload a more recent file
            </Button>
            <Button variant="edit" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      {showOnboardingBoard && bundle && onboardingContext ? (
        <GoalsSetupBoard
          headingRef={setupHeading}
          unlocked={Boolean(draft)}
          initialBattery={battery}
          profileBattery={profileBattery}
          profileRatePerKwh={rateFromProfile}
          initialRatePerKwh={store.baseline?.ratePerKwh ?? null}
          bundle={bundle}
          previewBaseline={previewBaseline}
          previewSuggestions={previewSuggestions}
          context={
            draft
              ? buildCalculationContext(draft.baseline.ratePerKwh ?? rateFromProfile, bundle)
              : onboardingContext
          }
          activeBaseline={activeBaseline}
          formSuggestions={formSuggestions}
          saveError={saveError}
          onBaselineReady={acceptBaselineDraft}
          onSave={save}
          onChooseAnotherFile={draft ? chooseAnotherFile : undefined}
        />
      ) : null}

      {stage === 'upload' && bundle && !showOnboardingBoard ? (
        <BaselineStep
          title={setupTitle}
          headingRef={setupHeading}
          initialBattery={battery}
          profileBattery={profileBattery}
          profileRatePerKwh={rateFromProfile}
          initialRatePerKwh={store.baseline?.ratePerKwh ?? null}
          bundle={bundle}
          onReady={acceptBaselineDraft}
          onCancel={goals ? cancelEdit : undefined}
        />
      ) : null}

      {showFormBoard && activeBaseline && formSuggestions ? (
        <GoalsFormBoard
          title={
            nextKinds
              ? GOALS_FORM.nextTitle
              : goals
                ? GOALS_FORM.editTitle
                : GOALS_FORM.createTitle
          }
          helper={
            nextKinds
              ? GOALS_FORM.createHelper
              : goals
                ? GOALS_FORM.editHelper
                : GOALS_FORM.createHelper
          }
          headingRef={setupHeading}
          baselineMonth={activeBaseline.month}
          note={
            nextKinds
              ? `So far: ${nextKinds
                  .map((kind) => formatGoalValue(kind, formTotals[kind]))
                  .join(' and ')}. The suggested next goal adds about ${GOAL_SUGGESTION_MONTHS.suggested} more months of your ${formatMonthLabel(activeBaseline.month)} figures.`
              : undefined
          }
          formMode={nextKinds ? 'next' : goals ? 'edit' : 'create'}
          kinds={nextKinds ?? undefined}
          suggestions={formSuggestions}
          baseline={activeBaseline}
          context={buildCalculationContext(activeBaseline.ratePerKwh ?? rateFromProfile, bundle!)}
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
          showUtilityFooter={Boolean(goals || store.months.length || store.completedGoals.length)}
          onClear={() => setClearOpen(true)}
          beforeForm={
            draft ? (
              <>
                <p className="goals-setup__step">Step 2 of 2: choose your goals</p>
                {draft ? (
                  <p className="goals-form-board__baseline-days">
                    {baselineDaysSentence(draft, draftNewDays.length, 'will be')}
                  </p>
                ) : null}
                <Button variant="edit" className="goals-setup__change" onClick={chooseAnotherFile}>
                  Use a different file
                </Button>
              </>
            ) : null
          }
        />
      ) : null}

      <p className="goals__upload-status" role="status">
        {uploadStatus}
      </p>

      {goals && !editing && !nextKinds ? (
        <ProgressHistory
          months={store.months}
          goals={goals}
          onUpload={openUpload}
          onRemove={(month) => {
            setRemoveError(null)
            setRemoveTarget(month)
          }}
        />
      ) : null}

      {removeError ? <GoalMessage code={removeError} /> : null}

      {(goals || store.months.length || store.completedGoals.length) && !showFormBoard ? (
        <footer className="goals-footer">
          <p>{GOALS_PAGE.footer}</p>
          <Button variant="secondary" className="goals-footer__clear" onClick={() => setClearOpen(true)}>
            {GOALS_PAGE.clear}
          </Button>
          {clearError ? <GoalMessage code="write_failed" /> : null}
        </footer>
      ) : null}

      <UploadDialog
        open={uploadOpen}
        limits={limits}
        onRead={(read) => {
          setUploadStatus('')
          setPreviewError(null)
          setPendingRead(read)
        }}
        onClearFile={() => {
          setPendingRead(null)
          setPreviewError(null)
        }}
        onClose={() => closePreview(pendingRead ? 'Nothing was saved.' : '')}
        onConfirm={confirmUpload}
        canConfirm={Boolean(preview && plan && context && goals)}
        saveError={previewError}
      >
        {pendingRead && goals && !context ? (
          <GoalMessage code="estimates_unavailable" details={<p>Your file was not added.</p>} />
        ) : null}

        {plan && pendingRead && gaps.length ? (
          <GoalMessage
            code="missing_days"
            details={
              <ul>
                {gaps.map((range) => (
                  <li key={range[0]}>{formatRangeLabel(range)}</li>
                ))}
              </ul>
            }
          />
        ) : null}

        {plan && pendingRead && revisionCheck?.unchecked.length ? (
          <GoalMessage
            code="revision_unchecked"
            details={<p>{revisionCheck.unchecked.map(formatMonthLabel).join(', ')}.</p>}
          />
        ) : null}

        {plan && pendingRead && revisionCheck?.revised.length ? (
          <RevisionPanel revisions={revisionCheck.revised} onReplace={replaceUpload} />
        ) : null}

        {plan && !preview && pendingRead && !revisionCheck?.revised.length ? (
          <GoalMessage
            code="already_counted"
            details={
              <p>
                {formatRangeLabel([
                  pendingRead.days[0].date,
                  pendingRead.days[pendingRead.days.length - 1].date,
                ])}{' '}
                is already in your history.
              </p>
            }
          />
        ) : null}

        {preview && plan && context && goals ? (
          <UploadSummary
            preview={preview}
            context={context}
            goals={goals}
            totals={totals}
            monthsBefore={store.months}
            monthsAfter={monthsAfter}
            skippedCount={plan.skippedDays.length}
          />
        ) : null}
      </UploadDialog>

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

      <RemoveMonthDialog
        month={removeTarget}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}
