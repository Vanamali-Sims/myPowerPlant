/**
 * Fixed corner tray: Actions (save, questionnaire, downloads).
 *
 * Actions commits immediately. What if lives on its own page in the app
 * rail now — see components/whatif/WhatIfView.
 */
import { useEffect, useId, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import { applyProfilePatch } from '../../lib/chat/applyProfilePatch'
import type { ChatReplyContext } from '../../lib/chat/buildChatReply'
import { buildAsyncChatReply } from '../../lib/chat/reminderChatReply'
import { buildIcsFile, downloadIcsFile } from '../../lib/calendarExport'
import { loadReminderRecommendations } from '../../lib/reminderRecommendations'
import type { ReminderRecommendation } from '../../lib/reminderForecast'
import type { ProfileData } from '../../types/profile'
import type { EventType } from '../../types/reminders'
import { ActionsProfileChat } from './ActionsProfileChat'
import { TrayPanelLayout } from './TrayPanelLayout'
import { Button } from '../ui/Button'
import { DownloadIcon, PencilIcon } from '../ui/icons'

type PanelMode = 'actions' | null
type ActionsTab = 'location' | 'reminders' | 'profile'

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

/**
 * Draft field that follows the saved profile value when that value changes.
 * Updating during render avoids a setState effect when the profile is saved.
 */
function useSyncedDraft<T>(saved: T): [T, Dispatch<SetStateAction<T>>] {
  const [draft, setDraft] = useState(saved)
  const [prevSaved, setPrevSaved] = useState(saved)
  if (!Object.is(saved, prevSaved)) {
    setPrevSaved(saved)
    setDraft(saved)
  }
  return [draft, setDraft]
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
  const [postcodeDraft, setPostcodeDraft] = useSyncedDraft(profile.postcode)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [reminders, setReminders] = useState<ReminderRecommendation[]>([])
  const [reminderError, setReminderError] = useState('')
  const [appliedReminderQuery, setAppliedReminderQuery] = useState('')
  const [reminderLoadGen, setReminderLoadGen] = useState(0)
  const [reminderSettledGen, setReminderSettledGen] = useState(0)
  const postcodeId = useId()
  const statusId = useId()

  const trayReady = hasProfile && Boolean(bundle) && !methodologyError
  const remindersActive = panel === 'actions' && actionsTab === 'reminders' && trayReady && bundle != null
  const reminderQuery = remindersActive
    ? `${eventType}|${reminderPeriodDays}|${JSON.stringify(profile)}`
    : ''

  // Clear the previous list when the reminder query changes. Doing this while
  // rendering keeps the reset out of the fetch effect.
  if (reminderQuery !== appliedReminderQuery) {
    setAppliedReminderQuery(reminderQuery)
    setReminders([])
    setReminderError('')
    setReminderLoadGen((gen) => gen + 1)
  }

  const remindersLoading = remindersActive && reminderLoadGen !== reminderSettledGen

  useEffect(() => {
    if (!remindersActive || !bundle) return
    const gen = reminderLoadGen
    let cancelled = false
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
        if (!cancelled) setReminderSettledGen(gen)
      })
    return () => {
      cancelled = true
    }
  }, [remindersActive, reminderLoadGen, bundle, profile, eventType, reminderPeriodDays])

  useEffect(() => {
    if (!panel) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setPanel(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [panel])

  function closeTray() {
    setPanel(null)
    setStatus('')
  }

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

  const disabledReason = !hasProfile
    ? 'Finish setup to use Actions.'
    : methodologyError
      ? methodologyError
      : !bundle
        ? 'Loading rates and appliance ratings…'
        : ''

  const actionsTooltip = trayReady
    ? 'Edit questionnaire answers, postcode, or reminders without leaving this page.'
    : disabledReason

  const traySurfaceOpen = Boolean(panel)

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
      {panel === 'actions' && trayReady ? (
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
          busy={busy || remindersLoading}
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
                {!reminderError && !remindersLoading && !busy && reminders.length === 0 ? (
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
                  disabled={busy || remindersLoading || !reminders.length}
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
      </div>
    </div>
  )
}
