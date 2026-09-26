/**
 * Chat dock (Epic 6): on-device matcher, actions, transcript, and a11y (6.7).
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { AppNavId } from '../../constants/navigation'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import { applyProfilePatch } from '../../lib/chat/applyProfilePatch'
import { buildChatReply, type ChatReplyContext } from '../../lib/chat/buildChatReply'
import {
  navigateReply,
  RESET_PROMPT,
  timeframeReply,
} from '../../lib/chat/chatActions'
import {
  CHAT_UNMATCHED,
  matchChat,
  PROFILE_LOCKED_MESSAGE,
  type ChatDataIntent,
} from '../../lib/chat/matchChat'
import { buildAsyncChatReply, isAsyncChatIntent } from '../../lib/chat/reminderChatReply'
import { trySetupChatFill } from '../../lib/chat/setupChatFill'
import type { Timeframe } from '../../lib/kpis'
import type { ProfileData, SetupStepId } from '../../types/profile'
import type { EventType } from '../../types/reminders'
import { Button } from '../ui/Button'

const MAX_MESSAGES = 20

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

type AppView = 'welcome' | 'setup' | 'profile' | 'dashboard' | 'reminders'

type Props = {
  profile: ProfileData
  hasProfile: boolean
  view: AppView
  setupStepId: SetupStepId | null
  bundle: MethodologyBundle | null
  methodologyError: string
  timeframe: Timeframe
  eventType: EventType
  reminderPeriodDays: string
  onNavigate: (id: AppNavId) => void
  onGoSetup: () => void
  onSetTimeframe: (timeframe: Timeframe) => void
  onPatchProfile: (profile: ProfileData) => void
  onSaveProfile: (profile: ProfileData) => void
  onResetProfile: () => void
}

/**
 * ChatDock
 */
export function ChatDock({
  profile,
  hasProfile,
  view,
  setupStepId,
  bundle,
  methodologyError,
  timeframe,
  eventType,
  reminderPeriodDays,
  onNavigate,
  onGoSetup,
  onSetTimeframe,
  onPatchProfile,
  onSaveProfile,
  onResetProfile,
}: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [pendingReset, setPendingReset] = useState(false)
  const [liveStatus, setLiveStatus] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelResetRef = useRef<HTMLButtonElement>(null)
  const seqRef = useRef(0)
  const inputId = useId()
  const logId = useId()
  const confirmId = useId()
  const confirmTitleId = useId()
  const statusLiveId = useId()

  function nextId(): string {
    seqRef.current += 1
    return `chat-${seqRef.current}`
  }

  function announceStatus(text: string) {
    setLiveStatus(text)
  }

  function trimHistory(next: ChatMessage[]): ChatMessage[] {
    if (next.length <= MAX_MESSAGES) return next
    return next.slice(next.length - MAX_MESSAGES)
  }

  function append(role: ChatMessage['role'], text: string) {
    setMessages((prev) => trimHistory([...prev, { id: nextId(), role, text }]))
    if (role === 'assistant') {
      announceStatus(`Assistant: ${text}`)
    }
    queueMicrotask(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  function closePanel() {
    setOpen(false)
    setPendingReset(false)
    queueMicrotask(() => toggleRef.current?.focus())
  }

  function openPanel() {
    setOpen(true)
    queueMicrotask(() => inputRef.current?.focus())
  }

  function dismissPendingReset() {
    if (pendingReset) {
      announceStatus('Reset cancelled. Your profile is unchanged.')
    }
    setPendingReset(false)
  }

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (pendingReset) {
        dismissPendingReset()
        inputRef.current?.focus()
        return
      }
      closePanel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, pendingReset])

  useEffect(() => {
    if (!pendingReset) return
    queueMicrotask(() => cancelResetRef.current?.focus())
  }, [pendingReset])

  function handleSend(event: FormEvent) {
    event.preventDefault()
    const sentence = draft.trim()
    if (!sentence || busy) return
    setDraft('')
    if (pendingReset) dismissPendingReset()
    append('user', sentence)

    if (view === 'setup' && setupStepId) {
      const setupFill = trySetupChatFill(sentence, setupStepId, profile)
      if (setupFill.kind === 'saved') {
        onPatchProfile(setupFill.profile)
        append('assistant', setupFill.message)
        return
      }
      if (setupFill.kind === 'error') {
        append('assistant', setupFill.message)
        return
      }
    }

    const matched = matchChat(sentence)
    if (!matched) {
      append('assistant', CHAT_UNMATCHED)
      return
    }

    const ctx: ChatReplyContext = {
      profile,
      hasProfile,
      bundle,
      methodologyError,
      timeframe,
      eventType,
      reminderPeriodDays,
    }

    if (matched.intent === 'reset_profile') {
      setPendingReset(true)
      append('assistant', RESET_PROMPT)
      return
    }

    if (matched.intent === 'navigate') {
      if (matched.target === 'setup') {
        onGoSetup()
        append('assistant', navigateReply('setup'))
        return
      }
      if (matched.target === 'profile' && !hasProfile) {
        append('assistant', PROFILE_LOCKED_MESSAGE)
        return
      }
      onNavigate(matched.target)
      append('assistant', navigateReply(matched.target))
      return
    }

    if (matched.intent === 'set_timeframe') {
      onSetTimeframe(matched.timeframe)
      append('assistant', timeframeReply(matched.timeframe))
      return
    }

    if (matched.intent === 'set_profile') {
      const result = applyProfilePatch(profile, matched.patch)
      if (!result.ok) {
        append('assistant', result.message)
        return
      }
      if (hasProfile) {
        onSaveProfile(result.profile)
      } else {
        onPatchProfile(result.profile)
      }
      const nextCtx = { ...ctx, profile: result.profile, hasProfile: Boolean(result.profile.lastUpdated) || hasProfile }
      const figures =
        hasProfile && bundle && !methodologyError
          ? ` ${buildChatReply('energy_picture', { ...nextCtx, hasProfile: true })}`
          : ''
      append('assistant', `${result.message}${figures ? ` ${figures}` : ''}`)
      return
    }

    if (matched.intent === 'profile_display') {
      append('assistant', buildChatReply('profile_display', ctx))
      return
    }

    const dataIntent = matched.intent as ChatDataIntent
    if (isAsyncChatIntent(dataIntent)) {
      setBusy(true)
      announceStatus('Working on your answer.')
      void buildAsyncChatReply(dataIntent, ctx)
        .then((say) => append('assistant', say))
        .catch(() =>
          append('assistant', 'Could not load the solar forecast. Nothing has changed.'),
        )
        .finally(() => setBusy(false))
      return
    }

    append('assistant', buildChatReply(dataIntent, ctx))
  }

  function confirmReset() {
    setPendingReset(false)
    onResetProfile()
    append('assistant', 'Profile cleared on this device. Setup is open so you can start again.')
    queueMicrotask(() => inputRef.current?.focus())
  }

  return (
    <div className={`chat-dock${open ? ' is-open' : ''}`}>
      {open ? (
        <section
          id="chat-panel-main"
          className="chat-panel"
          aria-label="Chat assistant"
          aria-busy={busy}
        >
          <header className="chat-panel__head">
            <h2 className="chat-panel__title" id={logId}>
              Ask MyPowerPlant
            </h2>
            <button
              type="button"
              className="chat-panel__close"
              onClick={closePanel}
              aria-label="Close chat"
            >
              Close
            </button>
          </header>
          <p className="chat-panel__notice">
            Answers are worked out on this device. Your full profile stays on this device.
          </p>
          <p
            id={statusLiveId}
            className="chat-panel__live"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {liveStatus}
          </p>
          <div
            ref={listRef}
            className="chat-panel__log"
            role="log"
            aria-labelledby={logId}
            aria-describedby={statusLiveId}
          >
            {messages.length === 0 ? (
              <p className="chat-panel__hint">
                Try “What is my weekly picture?”, “Open reminders”, or “Change my postcode to 3121”.
              </p>
            ) : null}
            {messages.map((msg) => (
              <p
                key={msg.id}
                className={`chat-bubble chat-bubble--${msg.role}`}
                aria-label={msg.role === 'user' ? `You said: ${msg.text}` : `Assistant said: ${msg.text}`}
              >
                <span className="chat-bubble__label" aria-hidden="true">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </span>
                {msg.text}
              </p>
            ))}
          </div>
          {pendingReset ? (
            <div
              id={confirmId}
              className="chat-panel__confirm"
              role="alertdialog"
              aria-labelledby={confirmTitleId}
              aria-describedby={`${confirmTitleId}-detail`}
            >
              <p id={confirmTitleId} className="chat-panel__confirm-text">
                Reset this profile?
              </p>
              <p id={`${confirmTitleId}-detail`} className="chat-panel__confirm-detail">
                This clears every answer on this device. Confirm to reset, or Cancel to keep your
                profile. Press Escape to cancel.
              </p>
              <div className="chat-panel__confirm-actions">
                <Button type="button" variant="danger" onClick={confirmReset}>
                  Confirm reset
                </Button>
                <button
                  ref={cancelResetRef}
                  type="button"
                  className="chat-panel__confirm-dismiss"
                  onClick={() => {
                    dismissPendingReset()
                    inputRef.current?.focus()
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          <form className="chat-panel__form" onSubmit={handleSend}>
            <label className="sr-only" htmlFor={inputId}>
              Ask a question
            </label>
            <input
              ref={inputRef}
              id={inputId}
              className="chat-panel__input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoComplete="off"
              placeholder="Ask about your energy picture, plans, or reminders…"
              disabled={busy}
              aria-describedby={
                pendingReset ? `${confirmId} ${statusLiveId}` : statusLiveId
              }
            />
            <Button
              type="submit"
              variant="primary"
              className="chat-panel__send"
              disabled={busy}
              aria-disabled={busy}
            >
              Send
            </Button>
          </form>
        </section>
      ) : null}
      <button
        ref={toggleRef}
        type="button"
        className="chat-dock__toggle"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-expanded={open}
        aria-controls={open ? 'chat-panel-main' : undefined}
      >
        {open ? 'Hide chat' : 'Ask a question'}
      </button>
    </div>
  )
}
