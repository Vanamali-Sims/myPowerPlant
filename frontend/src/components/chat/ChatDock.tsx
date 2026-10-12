/**
 * Fixed corner tray for the explore flow: the assistant robot, whose menu
 * opens Actions (postcode, questionnaire) or replays the tutorial.
 *
 * Actions commits immediately. What if lives on its own page in the app
 * rail now — see components/whatif/WhatIfView.
 */
import { useEffect, useId, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { ASSISTANT_COPY } from '../../constants/tutorials'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import { applyProfilePatch } from '../../lib/chat/applyProfilePatch'
import type { ProfileData } from '../../types/profile'
import { ActionsProfileChat } from './ActionsProfileChat'
import { AssistantBot } from './AssistantBot'
import { TrayPanelLayout } from './TrayPanelLayout'
import { Button } from '../ui/Button'
import { PencilIcon, PlayIcon } from '../ui/icons'

type PanelMode = 'actions' | null
type ActionsTab = 'location' | 'profile'

type Props = {
  profile: ProfileData
  hasProfile: boolean
  bundle: MethodologyBundle | null
  methodologyError: string
  onSaveProfile: (profile: ProfileData) => void
  /** Starts this flow's tutorial again. */
  onTutorial: () => void
  /** Marks Tutorial with a dot when this flow's tutorial has not been finished or skipped. */
  tutorialNew: boolean
  /** A tutorial is running, so the robot smiles. */
  tutorialActive: boolean
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
  onSaveProfile,
  onTutorial,
  tutorialNew,
  tutorialActive,
}: Props) {
  const [panel, setPanel] = useState<PanelMode>(null)
  const [actionsTab, setActionsTab] = useState<ActionsTab>('location')
  const [postcodeDraft, setPostcodeDraft] = useSyncedDraft(profile.postcode)
  const [status, setStatus] = useState('')
  const postcodeId = useId()
  const statusId = useId()

  const trayReady = hasProfile && Boolean(bundle) && !methodologyError
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

  const disabledReason = !hasProfile
    ? 'Finish setup to use Actions.'
    : methodologyError
      ? methodologyError
      : !bundle
        ? 'Loading rates and appliance ratings…'
        : ''

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
          subtitle="Edit your answers or postcode without leaving this page."
          tabs={[
            { id: 'location', label: 'Location' },
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

      <AssistantBot
        smiling={tutorialActive}
        items={[
          {
            id: 'actions',
            label: ASSISTANT_COPY.actions,
            icon: <PencilIcon />,
            onSelect: () => openPanel('actions'),
            unavailableReason: trayReady ? undefined : disabledReason,
            expanded: panel === 'actions',
          },
          {
            id: 'tutorial',
            label: ASSISTANT_COPY.tutorial,
            icon: <PlayIcon />,
            tone: 'accent',
            onSelect: () => {
              closeTray()
              onTutorial()
            },
            badge: tutorialNew ? ASSISTANT_COPY.tutorialNew : undefined,
          },
        ]}
      />
    </div>
  )
}
