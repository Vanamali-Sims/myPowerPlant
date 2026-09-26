/**
 * Chat dock (Epic 6): on-device matcher, actions, and transcript.
 */
import { useId, useRef, useState, type FormEvent } from 'react'
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
  const listRef = useRef<HTMLDivElement>(null)
  const seqRef = useRef(0)
  const inputId = useId()
  const liveId = useId()
  const confirmId = useId()

  function nextId(): string {
    seqRef.current += 1
    return `chat-${seqRef.current}`
  }

  function trimHistory(next: ChatMessage[]): ChatMessage[] {
    if (next.length <= MAX_MESSAGES) return next
    return next.slice(next.length - MAX_MESSAGES)
  }

  function append(role: ChatMessage['role'], text: string) {
    setMessages((prev) => trimHistory([...prev, { id: nextId(), role, text }]))
    queueMicrotask(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  function dismissPendingReset() {
    setPendingReset(false)
  }

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
    dismissPendingReset()
    onResetProfile()
    append('assistant', 'Profile cleared on this device. Setup is open so you can start again.')
  }

  return (
    <div className={`chat-dock${open ? ' is-open' : ''}`}>
      {open ? (
        <section id="chat-panel-main" className="chat-panel" aria-label="Chat assistant">
          <header className="chat-panel__head">
            <h2 className="chat-panel__title">Ask MyPowerPlant</h2>
            <button
              type="button"
              className="chat-panel__close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              Close
            </button>
          </header>
          <p className="chat-panel__notice">
            Answers are worked out on this device. Your full profile stays on this device.
          </p>
          <div ref={listRef} className="chat-panel__log" role="log" aria-live="polite" aria-relevant="additions">
            {messages.length === 0 ? (
              <p className="chat-panel__hint">
                Try “What is my weekly picture?”, “Open reminders”, or “Change my postcode to 3121”.
              </p>
            ) : null}
            {messages.map((msg) => (
              <p
                key={msg.id}
                className={`chat-bubble chat-bubble--${msg.role}`}
                id={msg.id === messages[messages.length - 1]?.id ? liveId : undefined}
              >
                <span className="chat-bubble__label">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                {msg.text}
              </p>
            ))}
          </div>
          {pendingReset ? (
            <div
              id={confirmId}
              className="chat-panel__confirm"
              role="group"
              aria-label="Confirm profile reset"
            >
              <p className="chat-panel__confirm-text">Reset clears every answer on this device.</p>
              <div className="chat-panel__confirm-actions">
                <Button type="button" variant="danger" onClick={confirmReset}>
                  Confirm reset
                </Button>
                <button type="button" className="chat-panel__confirm-dismiss" onClick={dismissPendingReset}>
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
              id={inputId}
              className="chat-panel__input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoComplete="off"
              placeholder="Ask about your energy picture, plans, or reminders…"
              disabled={busy}
              aria-describedby={pendingReset ? confirmId : undefined}
            />
            <Button type="submit" variant="primary" className="chat-panel__send" disabled={busy}>
              Send
            </Button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        className="chat-dock__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? 'chat-panel-main' : undefined}
      >
        {open ? 'Hide chat' : 'Ask a question'}
      </button>
    </div>
  )
}
