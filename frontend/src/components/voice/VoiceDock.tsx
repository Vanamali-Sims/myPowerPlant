/**
 * Voice control surface for the setup wizard.
 *
 * Sits bottom-right on every step. Deliberately not the primary action on the
 * page — Continue is — so the typed path never looks like the fallback.
 */
import { useState } from 'react'
import { PROFILE_SECTIONS } from '../../constants/setup'
import type { ProfileData } from '../../types/profile'
import type { PendingChoice, VoiceFailure, VoiceState } from '../../lib/voice/useVoiceInput'
import { Button } from '../ui/Button'
import { AlertIcon, CheckIcon, MicIcon, MicOffIcon, PauseIcon, StopIcon } from '../ui/icons'

const FIELD_LABELS: Partial<Record<keyof ProfileData, string>> = Object.fromEntries(
  PROFILE_SECTIONS.flatMap((section) => section.fields.map((f) => [f.field, f.label])),
)

type Props = {
  state: VoiceState
  supported: boolean
  consented: boolean
  partial: string
  failure: VoiceFailure | null
  heard: Partial<Record<keyof ProfileData, string>>
  flagged: Partial<Record<keyof ProfileData, true>>
  pending: PendingChoice | null
  onStart: () => void
  onConsentAndStart: () => void
  onPause: () => void
  onStop: () => void
  onTurnOff: () => void
  onConfirmPending: () => void
  onRejectPending: () => void
  onChooseInstead: (option: string) => void
  onDismissFailure: () => void
}

/**
 * VoiceDock
 * @param props.state - idle, listening or paused
 * @param props.heard - Field mapped to the words its answer came from
 * @returns JSX.Element | null
 *
 * Renders nothing when the browser cannot do voice, rather than offering a
 * control that can only fail. The consent panel opens on the first press and
 * never on load, so the microphone is never the page's opening move.
 */
export function VoiceDock({
  state,
  supported,
  consented,
  partial,
  failure,
  heard,
  flagged,
  pending,
  onStart,
  onConsentAndStart,
  onPause,
  onStop,
  onTurnOff,
  onConfirmPending,
  onRejectPending,
  onChooseInstead,
  onDismissFailure,
}: Props) {
  const [panelOpen, setPanelOpen] = useState(false)
  const listening = state === 'listening'
  const active = listening || state === 'paused'
  const filled = Object.keys(heard) as (keyof ProfileData)[]

  if (!supported) return null

  function pressVoice() {
    if (consented) onStart()
    else setPanelOpen(true)
  }

  return (
    <div className="voice-dock">
      {panelOpen && !consented ? (
        <div className="voice-panel" role="dialog" aria-label="About voice input">
          <h2 className="voice-panel__title">Answer by speaking</h2>
          <p className="voice-panel__body">
            You can answer these questions out loud instead of typing. Your
            microphone is only on while the listening bar is showing, and it
            turns off when you leave this form.
          </p>
          <p className="voice-panel__body voice-panel__body--note">
            <strong>Prototype build:</strong> speech is recognised by your
            browser’s built-in service, which means audio leaves this device.
            The shipped version will recognise speech on your own device with
            nothing sent anywhere.
          </p>
          <div className="voice-panel__actions">
            <Button
              variant="secondary"
              onClick={() => setPanelOpen(false)}
            >
              Not now
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setPanelOpen(false)
                onConsentAndStart()
              }}
            >
              Turn on voice
            </Button>
          </div>
        </div>
      ) : null}

      {filled.length > 0 ? (
        <div className="voice-filled" aria-live="polite">
          <p className="voice-filled__title">
            <CheckIcon width={14} height={14} />
            <span>Filled from what you said</span>
          </p>
          <ul className="voice-filled__list">
            {filled.map((field) => (
              <li key={field} className="voice-filled__item">
                <span className="voice-filled__label">{FIELD_LABELS[field] ?? field}</span>
                <span className="voice-filled__heard">“{heard[field]}”</span>
                {flagged[field] ? (
                  <span className="voice-filled__flag">check this one</span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="voice-filled__note">
            Every answer is on the form above — change any of them before you
            press Continue.
          </p>
        </div>
      ) : null}

      {/* A closed-list guess waits for a yes rather than landing silently. */}
      {pending ? (
        <div className="voice-confirm" role="dialog" aria-label="Confirm what was heard">
          <p className="voice-confirm__question">
            Did you mean <strong>{pending.value}</strong>?
          </p>
          <p className="voice-confirm__heard">We heard “{pending.heard}”</p>
          <div className="voice-confirm__actions">
            <Button variant="secondary" onClick={onRejectPending}>
              No
            </Button>
            <Button variant="primary" onClick={onConfirmPending}>
              Yes, that’s it
            </Button>
          </div>
          <details className="voice-confirm__list">
            <summary>Choose from the list instead</summary>
            <ul>
              {pending.options.map((option) => (
                <li key={option}>
                  <button type="button" onClick={() => onChooseInstead(option)}>
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}

      {failure ? (
        <div className="voice-error" role="alert">
          <AlertIcon width={15} height={15} />
          <div className="voice-error__body">
            <p className="voice-error__message">{failure.message}</p>
            {failure.suggestTyping ? (
              <p className="voice-error__hint">
                Typing this one in may be quicker — the form works exactly the
                same either way.
              </p>
            ) : null}
            <div className="voice-error__actions">
              <button type="button" onClick={onDismissFailure}>
                Dismiss
              </button>
              <button type="button" onClick={onStart}>
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Listening is never silent — this bar is the whole promise of US-5.2. */}
      {active ? (
        <div className={`voice-status voice-status--${state}`} aria-live="polite">
          <span className="voice-status__dot" aria-hidden="true" />
          <span className="voice-status__text">
            {listening ? 'Listening' : 'Paused'}
            {partial ? <em className="voice-status__partial"> — {partial}</em> : null}
          </span>
          <div className="voice-status__controls">
            {listening ? (
              <button type="button" onClick={onPause} aria-label="Pause listening">
                <PauseIcon width={15} height={15} />
              </button>
            ) : (
              <button type="button" onClick={onStart} aria-label="Resume listening">
                <MicIcon width={15} height={15} />
              </button>
            )}
            <button type="button" onClick={onStop} aria-label="Stop listening">
              <StopIcon width={15} height={15} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="voice-dock__buttons">
        {!active ? (
          <button
            type="button"
            className="voice-fab"
            onClick={pressVoice}
            aria-label="Answer these questions by speaking"
          >
            <MicIcon width={18} height={18} />
            <span>Answer by voice</span>
          </button>
        ) : null}
        {consented ? (
          <button
            type="button"
            className="voice-off"
            onClick={onTurnOff}
            aria-label="Turn voice off on this device"
          >
            <MicOffIcon width={14} height={14} />
            <span>Turn off voice</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
