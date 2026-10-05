/**
 * Fixed corner tray: Actions (save, questionnaire, downloads) and What if (preview).
 *
 * Actions commits immediately. What if keeps a draft profile until the user
 * chooses Use this setup or Keep current setup.
 */
import { useEffect, useId, useState, type FormEvent } from 'react'
import { batteryModels, solarDirections } from '../../data/profileOptions'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import { applyProfilePatch } from '../../lib/chat/applyProfilePatch'
import type { ChatReplyContext } from '../../lib/chat/buildChatReply'
import { buildAsyncChatReply } from '../../lib/chat/reminderChatReply'
import {
  compareFootnote,
  formatPlanColumn,
  householdCompareRows,
  solarCompareRows,
  type MetricCompareRow,
  type WhatIfKind,
} from '../../lib/chat/whatIfCompare'
import { buildIcsFile, downloadIcsFile } from '../../lib/calendarExport'
import { buildKpiReport, parseCount } from '../../lib/kpis'
import { loadReminderRecommendations } from '../../lib/reminderRecommendations'
import type { ReminderRecommendation } from '../../lib/reminderForecast'
import { matchSuggestionPlans } from '../../lib/vppSuggestions'
import { FIELD_BOUNDS } from '../../constants/validation'
import type { ProfileData, SolarDirection } from '../../types/profile'
import type { EventType } from '../../types/reminders'
import { ActionsProfileChat } from './ActionsProfileChat'
import { TrayPanelCloseButton, TrayPanelLayout } from './TrayPanelLayout'
import { hasHouseholdDraftChanges, WhatIfHouseholdTab } from './WhatIfHouseholdTab'
import { Button } from '../ui/Button'
import { BulbIcon, DownloadIcon, PencilIcon } from '../ui/icons'

type PanelMode = 'actions' | 'whatif' | null
type ActionsTab = 'location' | 'reminders' | 'profile'
type WhatIfTab = 'household' | 'battery' | 'solar'

type CompareState = {
  kind: WhatIfKind
  draftProfile: ProfileData
  summary: string
}

type Props = {
  profile: ProfileData
  hasProfile: boolean
  bundle: MethodologyBundle | null
  methodologyError: string
  eventType: EventType
  reminderPeriodDays: string
  onSaveProfile: (profile: ProfileData) => void
}

function chatContext(
  profile: ProfileData,
  hasProfile: boolean,
  bundle: MethodologyBundle | null,
  methodologyError: string,
  eventType: EventType,
  reminderPeriodDays: string,
): ChatReplyContext {
  return {
    profile,
    hasProfile,
    bundle,
    methodologyError,
    timeframe: 'weekly',
    eventType,
    reminderPeriodDays,
  }
}

function bestSolarDirection(factors: Record<string, number>): { value: SolarDirection | ''; label: string } {
  const ranked = Object.entries(factors)
    .filter(([key]) => key !== 'not_sure')
    .sort((a, b) => b[1] - a[1])
  const top = ranked[0]
  if (!top) return { value: '', label: '' }
  const label = solarDirections.find((row) => row.value === top[0])?.label ?? top[0]
  return { value: top[0] as SolarDirection, label }
}

function CompareMetricRow({ row, side }: { row: MetricCompareRow; side: 'now' | 'after' }) {
  const value = side === 'now' ? row.nowDisplay : row.afterDisplay
  return (
    <p className="chat-compare__metric">
      <span className="chat-compare__metric-label">{row.label}</span>
      <span className="chat-compare__metric-value">
        {value}
        {side === 'after' && row.delta ? (
          <span className={`chat-compare__delta chat-compare__delta--${row.deltaTone}`}>{row.delta}</span>
        ) : null}
      </span>
    </p>
  )
}

function CompareKpiColumns({
  kind,
  reportNow,
  reportDraft,
}: {
  kind: WhatIfKind
  reportNow: ReturnType<typeof buildKpiReport>
  reportDraft: ReturnType<typeof buildKpiReport>
}) {
  const rows =
    kind === 'household'
      ? householdCompareRows(reportNow, reportDraft)
      : solarCompareRows(reportNow, reportDraft)
  return (
    <>
      <div className="chat-compare__col">
        <h3 className="chat-compare__heading">Now</h3>
        {rows.map((row) => (
          <CompareMetricRow key={row.label} row={row} side="now" />
        ))}
      </div>
      <div className="chat-compare__col chat-compare__col--after">
        <h3 className="chat-compare__heading">This change</h3>
        {rows.map((row) => (
          <CompareMetricRow key={row.label} row={row} side="after" />
        ))}
      </div>
    </>
  )
}

/**
 * ChatDock
 */
export function ChatDock({
  profile,
  hasProfile,
  bundle,
  methodologyError,
  eventType,
  reminderPeriodDays,
  onSaveProfile,
}: Props) {
  const [panel, setPanel] = useState<PanelMode>(null)
  const [actionsTab, setActionsTab] = useState<ActionsTab>('location')
  const [whatIfTab, setWhatIfTab] = useState<WhatIfTab>('household')
  const [postcodeDraft, setPostcodeDraft] = useState(profile.postcode)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [reminders, setReminders] = useState<ReminderRecommendation[]>([])
  const [reminderError, setReminderError] = useState('')
  const [batteryDraft, setBatteryDraft] = useState(profile.batteryModel)
  const [directionDraft, setDirectionDraft] = useState(profile.solarDirection)
  const [peopleDraft, setPeopleDraft] = useState(profile.people)
  const [dishwasherDraft, setDishwasherDraft] = useState(profile.dishwasherCyclesPerWeek)
  const [washerDraft, setWasherDraft] = useState(profile.washerCyclesPerWeek)
  const [compare, setCompare] = useState<CompareState | null>(null)
  const postcodeId = useId()
  const statusId = useId()
  const compareTitleId = useId()

  const trayReady = hasProfile && Boolean(bundle) && !methodologyError

  useEffect(() => {
    setPostcodeDraft(profile.postcode)
    setBatteryDraft(profile.batteryModel)
    setDirectionDraft(profile.solarDirection)
    setPeopleDraft(profile.people)
    setDishwasherDraft(profile.dishwasherCyclesPerWeek)
    setWasherDraft(profile.washerCyclesPerWeek)
  }, [
    profile.postcode,
    profile.batteryModel,
    profile.solarDirection,
    profile.people,
    profile.dishwasherCyclesPerWeek,
    profile.washerCyclesPerWeek,
  ])

  useEffect(() => {
    if (panel !== 'actions' || actionsTab !== 'reminders' || !trayReady || !bundle) {
      setReminders([])
      setReminderError('')
      return
    }
    let cancelled = false
    setBusy(true)
    void loadReminderRecommendations({
      profile,
      bundle,
      eventType,
      reminderPeriodDays,
      postcode: profile.postcode,
    })
      .then((loaded) => {
        if (cancelled) return
        if (!loaded.ok) {
          setReminderError(loaded.message)
          setReminders([])
          return
        }
        setReminderError('')
        setReminders(loaded.recommendations)
      })
      .catch(() => {
        if (!cancelled) {
          setReminderError('Could not load the solar forecast. Try again shortly.')
          setReminders([])
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [panel, actionsTab, trayReady, bundle, profile, eventType, reminderPeriodDays])

  useEffect(() => {
    if (!panel && !compare) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (compare) {
        setCompare(null)
        return
      }
      setPanel(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [panel, compare])

  function closeTray() {
    setCompare(null)
    setPanel(null)
    setStatus('')
  }

  function openPanel(mode: PanelMode) {
    setCompare(null)
    setPanel((current) => (current === mode ? null : mode))
    setStatus('')
  }

  function savePostcode(event: FormEvent) {
    event.preventDefault()
    const digits = postcodeDraft.trim()
    const result = applyProfilePatch(profile, { postcode: digits })
    if (!result.ok) {
      setStatus(result.message)
      return
    }
    onSaveProfile(result.profile)
    setStatus(result.message)
  }

  function downloadAllReminders() {
    if (!bundle) return
    setBusy(true)
    void buildAsyncChatReply(
      'download_calendar',
      chatContext(profile, hasProfile, bundle, methodologyError, eventType, reminderPeriodDays),
    )
      .then((message) => setStatus(message))
      .catch(() => setStatus('Could not download reminders. Nothing has changed.'))
      .finally(() => setBusy(false))
  }

  function downloadOneReminder(entry: ReminderRecommendation) {
    const content = buildIcsFile([entry], eventType)
    downloadIcsFile(`mypowerplant-${eventType.replace('_', '-')}-${entry.date}.ics`, content)
    setStatus(`Downloaded ${entry.dayLabel} to your calendar file.`)
  }

  function openWhatIf(kind: WhatIfKind, patch: Partial<ProfileData>, summary: string) {
    const result = applyProfilePatch(profile, patch)
    if (!result.ok) {
      setStatus(result.message)
      return
    }
    setCompare({ kind, draftProfile: result.profile, summary })
    setStatus('')
  }

  function compareBattery() {
    if (!batteryDraft || batteryDraft === profile.batteryModel) {
      setStatus('Pick a different battery model to compare.')
      return
    }
    openWhatIf('battery', { batteryModel: batteryDraft }, `Battery: ${batteryDraft}`)
  }

  function compareExtraPanel() {
    if (profile.hasSolar !== 'yes') {
      setStatus('Solar must be on your profile to add a panel.')
      return
    }
    const current = parseCount(profile.panelCount)
    const next = current + 1
    if (next > FIELD_BOUNDS.panelCount.max) {
      setStatus(`Panel count cannot go above ${FIELD_BOUNDS.panelCount.max} in this model.`)
      return
    }
    openWhatIf('panel', { panelCount: String(next) }, `Panels: ${current} → ${next}`)
  }

  function compareDirection() {
    if (!directionDraft || directionDraft === profile.solarDirection) {
      setStatus('Pick a different panel direction to compare.')
      return
    }
    const label = solarDirections.find((row) => row.value === directionDraft)?.label ?? directionDraft
    openWhatIf('direction', { solarDirection: directionDraft }, `Direction: ${label}`)
  }

  function resolvedHouseholdValue(draft: string, saved: string): string {
    const d = draft.trim()
    if (d) return d
    return saved.trim()
  }

  function compareHousehold() {
    if (
      !hasHouseholdDraftChanges(profile, peopleDraft, dishwasherDraft, washerDraft)
    ) {
      setStatus('Change at least one household figure to compare.')
      return
    }

    const nextPeople = resolvedHouseholdValue(peopleDraft, profile.people)
    const nextDishwasher = resolvedHouseholdValue(
      dishwasherDraft,
      profile.dishwasherCyclesPerWeek,
    )
    const nextWasher = resolvedHouseholdValue(washerDraft, profile.washerCyclesPerWeek)

    const parts: string[] = []
    if (nextPeople !== profile.people.trim()) {
      parts.push(`People: ${profile.people || '—'} → ${nextPeople}`)
    }
    if (nextDishwasher !== profile.dishwasherCyclesPerWeek.trim()) {
      parts.push(`Dishwasher: ${profile.dishwasherCyclesPerWeek || '—'} → ${nextDishwasher}/week`)
    }
    if (nextWasher !== profile.washerCyclesPerWeek.trim()) {
      parts.push(`Washing machine: ${profile.washerCyclesPerWeek || '—'} → ${nextWasher}/week`)
    }

    openWhatIf(
      'household',
      {
        people: nextPeople,
        dishwasherCyclesPerWeek: nextDishwasher,
        washerCyclesPerWeek: nextWasher,
      },
      parts.join(' · '),
    )
  }

  function applyWhatIf() {
    if (!compare) return
    onSaveProfile(compare.draftProfile)
    setStatus('Saved on this device. Dashboard and reminders will use this setup.')
    setCompare(null)
    setPanel(null)
  }

  const reportNow = bundle ? buildKpiReport(profile, bundle) : null
  const reportDraft = bundle && compare ? buildKpiReport(compare.draftProfile, bundle) : null
  const plansNow =
    bundle ? matchSuggestionPlans(profile, bundle.vppSuggestionPlans, bundle.batteryModels) : null
  const plansDraft =
    bundle && compare
      ? matchSuggestionPlans(compare.draftProfile, bundle.vppSuggestionPlans, bundle.batteryModels)
      : null
  const bestDir = bundle ? bestSolarDirection(bundle.orientationFactors) : null

  const compareOpen =
    Boolean(compare && reportNow && reportDraft && bundle) &&
    (compare?.kind !== 'battery' || Boolean(plansNow && plansDraft))

  function batteryPlanText(side: 'now' | 'draft'): string {
    const plans = side === 'now' ? plansNow! : plansDraft!
    return formatPlanColumn(plans.matches, plans.emptyReason)
  }

  const disabledReason = !hasProfile
    ? 'Finish setup to use Actions and What if.'
    : methodologyError
      ? methodologyError
      : !bundle
        ? 'Loading rates and appliance ratings…'
        : ''

  const actionsTooltip = trayReady
    ? 'Edit questionnaire answers, postcode, or reminders without leaving this page.'
    : disabledReason

  const whatIfTooltip = trayReady
    ? 'Compare household, battery, or solar changes before anything is saved.'
    : disabledReason

  const traySurfaceOpen = Boolean(panel || compareOpen)

  const postcodeDigits = postcodeDraft.trim()
  const canSavePostcode =
    /^\d{4}$/.test(postcodeDigits) && postcodeDigits !== profile.postcode.trim()

  return (
    <div className={`chat-dock${traySurfaceOpen ? ' is-open' : ''}`}>
      {traySurfaceOpen && trayReady ? (
        <button
          type="button"
          className="chat-dock__backdrop"
          aria-label="Close tray"
          onClick={closeTray}
        />
      ) : null}
      <div className="chat-dock__stack">
      {compareOpen && compare ? (
        <div
          className="chat-compare chat-compare--whatif chat-dock__surface"
          role="dialog"
          aria-modal="true"
          aria-labelledby={compareTitleId}
        >
          <header className="chat-panel__head">
            <h2 className="chat-panel__title" id={compareTitleId}>
              Now vs this change
            </h2>
            <TrayPanelCloseButton onClick={() => setCompare(null)} label="Close comparison" />
          </header>
          <p className="chat-panel__notice">{compare.summary}</p>
          <div className="chat-compare__grid">
            {compare.kind === 'battery' ? (
              <>
                <div className="chat-compare__col">
                  <h3 className="chat-compare__heading">Now</h3>
                  <pre className="chat-compare__body">{batteryPlanText('now')}</pre>
                </div>
                <div className="chat-compare__col chat-compare__col--after">
                  <h3 className="chat-compare__heading">This change</h3>
                  <pre className="chat-compare__body">{batteryPlanText('draft')}</pre>
                </div>
              </>
            ) : (
              <CompareKpiColumns kind={compare.kind} reportNow={reportNow!} reportDraft={reportDraft!} />
            )}
          </div>
          {compareFootnote(compare.kind) ? (
            <p className="chat-panel__notice chat-compare__note">{compareFootnote(compare.kind)}</p>
          ) : null}
          {compare.kind === 'direction' && bestDir ? (
            <p className="chat-panel__notice chat-compare__note">
              {compare.draftProfile.solarDirection === bestDir.value
                ? `This direction (${bestDir.label}) is the strongest for generation in this model.`
                : `Strongest direction in this model: ${bestDir.label}.`}
            </p>
          ) : null}
          <div className="chat-compare__actions">
            <Button type="button" variant="primary" className="chat-compare__apply" onClick={applyWhatIf}>
              Use this setup
            </Button>
            <Button type="button" variant="outline-accent" onClick={() => setCompare(null)}>
              Keep current setup
            </Button>
          </div>
        </div>
      ) : null}

      {panel === 'actions' && trayReady && !compareOpen ? (
        <TrayPanelLayout
          sectionId="chat-panel-actions"
          sectionLabel="Actions"
          panelClassName="chat-panel--actions chat-dock__surface"
          title="Actions"
          subtitle="Edit questionnaire answers, postcode, or reminders without leaving this page."
          tabs={[
            { id: 'location', label: 'Location' },
            { id: 'reminders', label: 'Reminders' },
            { id: 'profile', label: 'Profile' },
          ]}
          activeTab={actionsTab}
          onTabChange={setActionsTab}
          tabsAriaLabel="Action type"
          status={status}
          statusId={statusId}
          showStatus={actionsTab !== 'profile'}
          onClose={closeTray}
          closeLabel="Close Actions"
          busy={busy}
        >
            {actionsTab === 'location' ? (
              <form className="chat-actions__block" onSubmit={savePostcode}>
                <div className="chat-field__label-row">
                  <h3 className="chat-actions__label chat-actions__label--row">Postcode</h3>
                  <span className="chat-field__now">
                    Now: {profile.postcode.trim() || 'not set'}
                  </span>
                </div>
                <label className="sr-only" htmlFor={postcodeId}>Postcode</label>
                <input
                  id={postcodeId}
                  className="chat-panel__input chat-panel__input--block"
                  inputMode="numeric"
                  maxLength={4}
                  value={postcodeDraft}
                  onChange={(event) => setPostcodeDraft(event.target.value)}
                  autoComplete="postal-code"
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="chat-panel__action"
                  disabled={!canSavePostcode}
                >
                  Save
                </Button>
              </form>
            ) : null}
            {actionsTab === 'reminders' ? (
              <section className="chat-actions__block" aria-labelledby="chat-reminders-heading">
                <h3 id="chat-reminders-heading" className="chat-actions__label">
                  Reminders ({eventType === 'discharge' ? 'join events' : 'opt out'})
                </h3>
                <p className="chat-panel__hint">
                  Uses the same join/opt-out and period as the Reminders page. Change those there if
                  you need a different list.
                </p>
                {reminderError ? <p className="chat-actions__error">{reminderError}</p> : null}
                {!reminderError && !busy && reminders.length === 0 ? (
                  <p className="chat-panel__hint">No qualifying days in this period.</p>
                ) : null}
                <ul className="chat-actions__list">
                  {reminders.map((entry) => (
                    <li key={entry.date} className="chat-actions__item">
                      <span className="chat-actions__day">{entry.dayLabel}</span>
                      <button
                        type="button"
                        className="chat-actions__download"
                        onClick={() => downloadOneReminder(entry)}
                        aria-label={`Download ${entry.dayLabel}`}
                      >
                        <DownloadIcon />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="primary"
                  className="chat-actions__all"
                  disabled={busy || !reminders.length}
                  onClick={downloadAllReminders}
                >
                  Download all reminders
                </Button>
              </section>
            ) : null}
            {actionsTab === 'profile' ? (
              <ActionsProfileChat
                profile={profile}
                onSave={onSaveProfile}
                onStatus={setStatus}
              />
            ) : null}
        </TrayPanelLayout>
      ) : null}

      {panel === 'whatif' && trayReady && !compareOpen ? (
        <TrayPanelLayout
          sectionId="chat-panel-whatif"
          sectionLabel="What if"
          panelClassName="chat-panel--whatif chat-dock__surface"
          title="What if"
          badge={<span className="chat-panel__badge">Draft, not saved</span>}
          subtitle="Compare household, battery, or solar changes before anything is saved."
          tabs={[
            { id: 'household', label: 'Household' },
            { id: 'battery', label: 'Battery' },
            { id: 'solar', label: 'Solar' },
          ]}
          activeTab={whatIfTab}
          onTabChange={(id) => {
            setCompare(null)
            setWhatIfTab(id)
          }}
          tabsAriaLabel="What if category"
          status={status}
          bodyClassName={whatIfTab === 'household' ? 'chat-panel__body--household' : ''}
          onClose={closeTray}
          closeLabel="Close What if"
        >
            {whatIfTab === 'household' ? (
              <WhatIfHouseholdTab
                profile={profile}
                peopleDraft={peopleDraft}
                dishwasherDraft={dishwasherDraft}
                washerDraft={washerDraft}
                onPeopleDraft={setPeopleDraft}
                onDishwasherDraft={setDishwasherDraft}
                onWasherDraft={setWasherDraft}
                onCompare={compareHousehold}
              />
            ) : null}
            {whatIfTab === 'battery' ? (
              <div className="chat-actions__block">
                <h3 className="chat-actions__label">Different battery</h3>
                <div className="chat-actions__row">
                  <select
                    className="chat-whatif__select"
                    value={batteryDraft}
                    onChange={(event) => setBatteryDraft(event.target.value)}
                  >
                    <option value="">Select battery</option>
                    {batteryModels.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <Button type="button" variant="primary" className="chat-panel__send" onClick={compareBattery}>
                    Compare
                  </Button>
                </div>
              </div>
            ) : null}
            {whatIfTab === 'solar' ? (
              <>
                <div className="chat-actions__block">
                  <h3 className="chat-actions__label">One more solar panel</h3>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={profile.hasSolar !== 'yes'}
                    onClick={compareExtraPanel}
                  >
                    Compare +1 panel
                  </Button>
                </div>
                <div className="chat-actions__block">
                  <h3 className="chat-actions__label">Panel direction</h3>
                  <div className="chat-actions__row">
                    <select
                      className="chat-whatif__select"
                      value={directionDraft}
                      onChange={(event) =>
                        setDirectionDraft(event.target.value as ProfileData['solarDirection'])
                      }
                    >
                      <option value="">Direction</option>
                      {solarDirections.map((row) => (
                        <option key={row.value} value={row.value}>{row.label}</option>
                      ))}
                    </select>
                    <Button type="button" variant="primary" className="chat-panel__send" onClick={compareDirection}>
                      Compare
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
        </TrayPanelLayout>
      ) : null}
      </div>

      <div className="chat-dock__tray" role="group" aria-label="Quick tools">
        <button
          type="button"
          className={`chat-dock__icon chat-dock__icon--actions${panel === 'actions' ? ' is-active' : ''}`}
          disabled={!trayReady}
          title={actionsTooltip}
          aria-expanded={panel === 'actions'}
          aria-controls={panel === 'actions' ? 'chat-panel-actions' : undefined}
          onClick={() => openPanel('actions')}
        >
          <PencilIcon />
          <span className="chat-dock__icon-label">Actions</span>
        </button>
        <button
          type="button"
          className={`chat-dock__icon chat-dock__icon--whatif${panel === 'whatif' ? ' is-active' : ''}`}
          disabled={!trayReady}
          title={whatIfTooltip}
          aria-expanded={panel === 'whatif'}
          aria-controls={panel === 'whatif' ? 'chat-panel-whatif' : undefined}
          onClick={() => openPanel('whatif')}
        >
          <BulbIcon />
          <span className="chat-dock__icon-label">What if</span>
        </button>
      </div>
    </div>
  )
}
