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
  formatHouseholdKpiLines,
  formatPlanColumn,
  formatSolarKpiLines,
  type WhatIfKind,
  type WhatIfTab,
  whatIfTabForKind,
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
import { Button } from '../ui/Button'
import { BulbIcon, DownloadIcon, PencilIcon } from '../ui/icons'

type PanelMode = 'actions' | 'whatif' | null
type ActionsTab = 'location' | 'reminders' | 'profile'

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

function CompareMetricLines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <p key={line} className={line.startsWith('Weekly use') || line.startsWith('Weekly solar') ? 'chat-compare__metric' : 'chat-compare__detail'}>
          {line}
        </p>
      ))}
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
    setCompare(null)
  }, [whatIfTab])

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

  function openPanel(mode: PanelMode) {
    setPanel((current) => {
      const next = current === mode ? null : mode
      if (next !== 'whatif') setCompare(null)
      return next
    })
    setStatus('')
  }

  function closeWhatIfPanel() {
    setCompare(null)
    setPanel(null)
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

  function comparePeople() {
    const trimmed = peopleDraft.trim()
    if (!trimmed || trimmed === profile.people) {
      setStatus('Enter a different number of people to compare.')
      return
    }
    openWhatIf('household', { people: trimmed }, `People: ${profile.people || '—'} → ${trimmed}`)
  }

  function compareDishwasher() {
    const trimmed = dishwasherDraft.trim()
    if (!trimmed || trimmed === profile.dishwasherCyclesPerWeek) {
      setStatus('Enter a different dishwasher figure to compare.')
      return
    }
    openWhatIf(
      'household',
      { dishwasherCyclesPerWeek: trimmed },
      `Dishwasher: ${profile.dishwasherCyclesPerWeek || '—'} → ${trimmed} cycles/week`,
    )
  }

  function compareWasher() {
    const trimmed = washerDraft.trim()
    if (!trimmed || trimmed === profile.washerCyclesPerWeek) {
      setStatus('Enter a different washing machine figure to compare.')
      return
    }
    openWhatIf(
      'household',
      { washerCyclesPerWeek: trimmed },
      `Washing machine: ${profile.washerCyclesPerWeek || '—'} → ${trimmed} cycles/week`,
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

  const compareDataReady =
    Boolean(compare && reportNow && reportDraft && bundle) &&
    (compare?.kind !== 'battery' || Boolean(plansNow && plansDraft))

  const compareOpen =
    compareDataReady &&
    panel === 'whatif' &&
    compare !== null &&
    whatIfTabForKind(compare.kind) === whatIfTab

  function linesForSide(kind: WhatIfKind, side: 'now' | 'draft'): string[] {
    const report = side === 'now' ? reportNow! : reportDraft!
    if (kind === 'battery') {
      const plans = side === 'now' ? plansNow! : plansDraft!
      return [formatPlanColumn(plans.matches, plans.emptyReason)]
    }
    if (kind === 'household') return formatHouseholdKpiLines(report)
    return formatSolarKpiLines(report)
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

  return (
    <div className={`chat-dock${panel ? ' is-open' : ''}`}>
      {panel === 'actions' && trayReady ? (
        <section
          id="chat-panel-actions"
          className="chat-panel"
          aria-label="Actions"
          aria-busy={busy}
        >
          <header className="chat-panel__head">
            <h2 className="chat-panel__title">Actions</h2>
            <button type="button" className="chat-panel__close" onClick={() => setPanel(null)}>
              Close
            </button>
          </header>
          <p className="chat-panel__notice">
            Edit questionnaire answers, postcode, or reminders without leaving this page.
          </p>
          <div className="chat-actions__tabs chat-actions__tabs--primary" role="tablist" aria-label="Action type">
            {(
              [
                { id: 'location' as const, label: 'Location' },
                { id: 'reminders' as const, label: 'Reminders' },
                { id: 'profile' as const, label: 'Profile' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={actionsTab === tab.id}
                className={`chat-actions__tab${actionsTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setActionsTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {actionsTab !== 'profile' ? (
            <p id={statusId} className="chat-panel__status" role="status" aria-live="polite">
              {status}
            </p>
          ) : null}
          <div className="chat-panel__body">
            {actionsTab === 'location' ? (
              <form className="chat-actions__block" onSubmit={savePostcode}>
                <h3 className="chat-actions__label">Postcode</h3>
                <div className="chat-actions__row">
                  <label className="sr-only" htmlFor={postcodeId}>Postcode</label>
                  <input
                    id={postcodeId}
                    className="chat-panel__input"
                    inputMode="numeric"
                    maxLength={4}
                    value={postcodeDraft}
                    onChange={(event) => setPostcodeDraft(event.target.value)}
                    autoComplete="postal-code"
                  />
                  <Button type="submit" variant="primary" className="chat-panel__send">
                    Save
                  </Button>
                </div>
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
          </div>
        </section>
      ) : null}

      {panel === 'whatif' && trayReady ? (
        <div className="chat-dock__stack">
          {compareOpen && compare ? (
            <div
              className="chat-compare chat-compare--enter"
              role="dialog"
              aria-modal="true"
              aria-labelledby={compareTitleId}
            >
              <header className="chat-panel__head">
                <h2 className="chat-panel__title" id={compareTitleId}>
                  Now vs this change
                </h2>
                <button type="button" className="chat-panel__close" onClick={() => setCompare(null)}>
                  Close
                </button>
              </header>
              <p className="chat-panel__notice">{compare.summary}</p>
              <div className="chat-compare__grid">
                <div className="chat-compare__col">
                  <h3 className="chat-compare__heading">Now</h3>
                  {compare.kind === 'battery' ? (
                    <pre className="chat-compare__body">{linesForSide('battery', 'now')[0]}</pre>
                  ) : (
                    <CompareMetricLines lines={linesForSide(compare.kind, 'now')} />
                  )}
                </div>
                <div className="chat-compare__col chat-compare__col--after">
                  <h3 className="chat-compare__heading">This change</h3>
                  {compare.kind === 'battery' ? (
                    <pre className="chat-compare__body">{linesForSide('battery', 'draft')[0]}</pre>
                  ) : (
                    <CompareMetricLines lines={linesForSide(compare.kind, 'draft')} />
                  )}
                </div>
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
                <Button type="button" variant="primary" onClick={applyWhatIf}>
                  Use this setup
                </Button>
                <button type="button" className="chat-panel__confirm-dismiss" onClick={() => setCompare(null)}>
                  Keep current setup
                </button>
              </div>
            </div>
          ) : null}
        <section id="chat-panel-whatif" className="chat-panel" aria-label="What if">
          <header className="chat-panel__head">
            <h2 className="chat-panel__title">What if</h2>
            <button type="button" className="chat-panel__close" onClick={closeWhatIfPanel}>
              Close
            </button>
          </header>
          <p className="chat-panel__notice">
            Compare household, battery, or solar changes before anything is saved.
          </p>
          <div className="chat-actions__tabs chat-actions__tabs--primary" role="tablist" aria-label="What if category">
            {(
              [
                { id: 'household' as const, label: 'Household' },
                { id: 'battery' as const, label: 'Battery' },
                { id: 'solar' as const, label: 'Solar' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={whatIfTab === tab.id}
                className={`chat-actions__tab${whatIfTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setWhatIfTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="chat-panel__status" role="status" aria-live="polite">
            {status}
          </p>
          <div className="chat-panel__body">
            {whatIfTab === 'household' ? (
              <>
                <div className="chat-whatif__field">
                  <label className="chat-actions__label" htmlFor="whatif-people">People in the home</label>
                  <input
                    id="whatif-people"
                    className="chat-panel__input chat-whatif__input"
                    inputMode="numeric"
                    value={peopleDraft}
                    onChange={(event) => setPeopleDraft(event.target.value)}
                  />
                  <Button type="button" variant="secondary" className="chat-whatif__compare" onClick={comparePeople}>
                    See comparison for people
                  </Button>
                </div>
                <div className="chat-whatif__field">
                  <label className="chat-actions__label" htmlFor="whatif-dishwasher">
                    Dishwasher cycles per week
                  </label>
                  <input
                    id="whatif-dishwasher"
                    className="chat-panel__input chat-whatif__input"
                    inputMode="numeric"
                    value={dishwasherDraft}
                    onChange={(event) => setDishwasherDraft(event.target.value)}
                  />
                  <Button type="button" variant="secondary" className="chat-whatif__compare" onClick={compareDishwasher}>
                    See comparison for dishwasher
                  </Button>
                </div>
                <div className="chat-whatif__field">
                  <label className="chat-actions__label" htmlFor="whatif-washer">
                    Washing machine cycles per week
                  </label>
                  <input
                    id="whatif-washer"
                    className="chat-panel__input chat-whatif__input"
                    inputMode="numeric"
                    value={washerDraft}
                    onChange={(event) => setWasherDraft(event.target.value)}
                  />
                  <Button type="button" variant="secondary" className="chat-whatif__compare" onClick={compareWasher}>
                    See comparison for washing machine
                  </Button>
                </div>
              </>
            ) : null}
            {whatIfTab === 'battery' ? (
              <div className="chat-whatif__field">
                <label className="chat-actions__label" htmlFor="whatif-battery">Different battery</label>
                <select
                  id="whatif-battery"
                  className="chat-whatif__select chat-whatif__input"
                  value={batteryDraft}
                  onChange={(event) => setBatteryDraft(event.target.value)}
                >
                  <option value="">Select battery</option>
                  {batteryModels.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <Button type="button" variant="secondary" className="chat-whatif__compare" onClick={compareBattery}>
                  See comparison for this battery
                </Button>
              </div>
            ) : null}
            {whatIfTab === 'solar' ? (
              <>
                <div className="chat-whatif__field">
                  <h3 className="chat-actions__label">One more solar panel</h3>
                  <Button
                    type="button"
                    variant="secondary"
                    className="chat-whatif__compare"
                    disabled={profile.hasSolar !== 'yes'}
                    onClick={compareExtraPanel}
                  >
                    See comparison for +1 panel
                  </Button>
                </div>
                <div className="chat-whatif__field">
                  <label className="chat-actions__label" htmlFor="whatif-direction">Panel direction</label>
                  <select
                    id="whatif-direction"
                    className="chat-whatif__select chat-whatif__input"
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
                  <Button type="button" variant="secondary" className="chat-whatif__compare" onClick={compareDirection}>
                    See comparison for direction
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </section>
        </div>
      ) : null}

      <div className="chat-dock__tray" role="group" aria-label="Quick tools">
        <button
          type="button"
          className={`chat-dock__icon${panel === 'actions' ? ' is-active' : ''}`}
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
          className={`chat-dock__icon${panel === 'whatif' ? ' is-active' : ''}`}
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
