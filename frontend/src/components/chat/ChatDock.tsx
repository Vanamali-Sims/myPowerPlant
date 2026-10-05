/**
 * Fixed corner tray: Actions (save/download) and What if (preview hardware changes).
 */
import { useEffect, useId, useState, type FormEvent } from 'react'
import { batteryModels, solarDirections } from '../../data/profileOptions'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import { applyProfilePatch } from '../../lib/chat/applyProfilePatch'
import type { ChatReplyContext } from '../../lib/chat/buildChatReply'
import { buildAsyncChatReply } from '../../lib/chat/reminderChatReply'
import { buildIcsFile, downloadIcsFile } from '../../lib/calendarExport'
import { buildKpiReport, formatKwh, parseCount } from '../../lib/kpis'
import { loadReminderRecommendations } from '../../lib/reminderRecommendations'
import type { ReminderRecommendation } from '../../lib/reminderForecast'
import {
  formatKwhShort,
  matchSuggestionPlans,
  type SuggestionMatch,
} from '../../lib/vppSuggestions'
import { DAYS_PER_WEEK } from '../../constants/kpiMethodology'
import { FIELD_BOUNDS } from '../../constants/validation'
import type { ProfileData, SolarDirection } from '../../types/profile'
import type { EventType } from '../../types/reminders'
import { Button } from '../ui/Button'
import { BulbIcon, DownloadIcon, PencilIcon } from '../ui/icons'

type PanelMode = 'actions' | 'whatif' | null

type WhatIfKind = 'battery' | 'panel' | 'direction'

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

function formatPlanColumn(matches: SuggestionMatch[], emptyReason: string | null): string {
  if (!matches.length) {
    if (emptyReason === 'battery') return 'No plans list this battery for your region.'
    if (emptyReason === 'region') return 'Plans are seeded for Victorian postcodes only.'
    return 'No matching plans.'
  }
  return matches
    .slice(0, 4)
    .map((row) => {
      const headroom =
        row.reserveHeadroomKwh != null
          ? ` — ${formatKwhShort(row.reserveHeadroomKwh)} reserve headroom`
          : ''
      return `${row.plan.brand} ${row.plan.name}${headroom}`
    })
    .join('\n')
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
  const [postcodeDraft, setPostcodeDraft] = useState(profile.postcode)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [reminders, setReminders] = useState<ReminderRecommendation[]>([])
  const [reminderError, setReminderError] = useState('')
  const [batteryDraft, setBatteryDraft] = useState(profile.batteryModel)
  const [directionDraft, setDirectionDraft] = useState(profile.solarDirection)
  const [compare, setCompare] = useState<CompareState | null>(null)
  const postcodeId = useId()
  const statusId = useId()
  const compareTitleId = useId()

  const trayReady = hasProfile && Boolean(bundle) && !methodologyError

  useEffect(() => {
    setPostcodeDraft(profile.postcode)
    setBatteryDraft(profile.batteryModel)
    setDirectionDraft(profile.solarDirection)
  }, [profile.postcode, profile.batteryModel, profile.solarDirection])

  useEffect(() => {
    if (panel !== 'actions' || !trayReady || !bundle) {
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
  }, [panel, trayReady, bundle, profile, eventType, reminderPeriodDays])

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
      setStatus(
        `Panel count cannot go above ${FIELD_BOUNDS.panelCount.max} in this model.`,
      )
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

  function applyWhatIf() {
    if (!compare) return
    onSaveProfile(compare.draftProfile)
    setStatus('Saved on this device. Dashboard and reminders will use this setup.')
    setCompare(null)
    setPanel(null)
  }

  const reportNow = bundle ? buildKpiReport(profile, bundle) : null
  const reportDraft =
    bundle && compare ? buildKpiReport(compare.draftProfile, bundle) : null
  const plansNow =
    bundle
      ? matchSuggestionPlans(profile, bundle.vppSuggestionPlans, bundle.batteryModels)
      : null
  const plansDraft =
    bundle && compare
      ? matchSuggestionPlans(compare.draftProfile, bundle.vppSuggestionPlans, bundle.batteryModels)
      : null
  const bestDir = bundle ? bestSolarDirection(bundle.orientationFactors) : null

  const disabledReason = !hasProfile
    ? 'Finish setup to use Actions and What if.'
    : methodologyError
      ? methodologyError
      : !bundle
        ? 'Loading rates and appliance ratings…'
        : ''

  return (
    <div className={`chat-dock${panel ? ' is-open' : ''}`}>
      {compare && reportNow && reportDraft && plansNow && plansDraft ? (
        <div
          className="chat-compare"
          role="dialog"
          aria-modal="true"
          aria-labelledby={compareTitleId}
        >
          <header className="chat-panel__head">
            <h2 className="chat-panel__title" id={compareTitleId}>
              Now vs this change
            </h2>
            <button
              type="button"
              className="chat-panel__close"
              onClick={() => setCompare(null)}
            >
              Close
            </button>
          </header>
          <p className="chat-panel__notice">{compare.summary}</p>
          <div className="chat-compare__grid">
            <div className="chat-compare__col">
              <h3 className="chat-compare__heading">Now</h3>
              {compare.kind === 'battery' ? (
                <pre className="chat-compare__body">{formatPlanColumn(plansNow.matches, plansNow.emptyReason)}</pre>
              ) : (
                <>
                  <p className="chat-compare__metric">
                    Weekly solar: {formatKwh(reportNow.weekly.generationKwh)}
                  </p>
                  <p className="chat-compare__detail">
                    Typical day for reminders:{' '}
                    {formatKwh(reportNow.weekly.generationKwh / DAYS_PER_WEEK)}
                  </p>
                </>
              )}
            </div>
            <div className="chat-compare__col chat-compare__col--after">
              <h3 className="chat-compare__heading">This change</h3>
              {compare.kind === 'battery' ? (
                <pre className="chat-compare__body">
                  {formatPlanColumn(plansDraft.matches, plansDraft.emptyReason)}
                </pre>
              ) : (
                <>
                  <p className="chat-compare__metric">
                    Weekly solar: {formatKwh(reportDraft.weekly.generationKwh)}
                  </p>
                  <p className="chat-compare__detail">
                    Typical day for reminders:{' '}
                    {formatKwh(reportDraft.weekly.generationKwh / DAYS_PER_WEEK)}
                  </p>
                </>
              )}
            </div>
          </div>
          {compare.kind !== 'battery' ? (
            <p className="chat-panel__notice chat-compare__note">
              Reminder dates stay the same — only the typical generation figure behind them
              changes. Forecast and typical both scale with panel size and direction.
            </p>
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
            <button
              type="button"
              className="chat-panel__confirm-dismiss"
              onClick={() => setCompare(null)}
            >
              Keep current setup
            </button>
          </div>
        </div>
      ) : null}

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
            Update your home or download reminders without leaving this page.
          </p>
          <p id={statusId} className="chat-panel__status" role="status" aria-live="polite">
            {status}
          </p>
          <div className="chat-panel__body">
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
            <section className="chat-actions__block" aria-labelledby="chat-reminders-heading">
              <h3 id="chat-reminders-heading" className="chat-actions__label">
                Reminders ({eventType === 'discharge' ? 'join events' : 'opt out'})
              </h3>
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
          </div>
        </section>
      ) : null}

      {panel === 'whatif' && trayReady ? (
        <section id="chat-panel-whatif" className="chat-panel" aria-label="What if">
          <header className="chat-panel__head">
            <h2 className="chat-panel__title">What if</h2>
            <button type="button" className="chat-panel__close" onClick={() => setPanel(null)}>
              Close
            </button>
          </header>
          <p className="chat-panel__notice">
            Compare a battery or solar change before anything is saved.
          </p>
          <p className="chat-panel__status" role="status" aria-live="polite">
            {status}
          </p>
          <div className="chat-panel__body">
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
          </div>
        </section>
      ) : null}

      <div className="chat-dock__tray" role="group" aria-label="Quick tools">
        <button
          type="button"
          className={`chat-dock__icon${panel === 'actions' ? ' is-active' : ''}`}
          disabled={!trayReady}
          title={trayReady ? 'Update your postcode or download reminders without leaving this page.' : disabledReason}
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
          title={trayReady ? 'See the difference before anything is saved.' : disabledReason}
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
