/**
 * Chat dock (Epic 6.1–6.3): on-device matcher and transcript.
 */
import { useId, useRef, useState, type FormEvent } from 'react'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import { buildChatReply, type ChatReplyContext } from '../../lib/chat/buildChatReply'
import { CHAT_UNMATCHED, matchChatIntent } from '../../lib/chat/matchChat'
import type { Timeframe } from '../../lib/kpis'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'

const MAX_MESSAGES = 20

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

type Props = {
  profile: ProfileData
  hasProfile: boolean
  bundle: MethodologyBundle | null
  methodologyError: string
  timeframe: Timeframe
}

/**
 * ChatDock
 * @param props.profile - Household answers (stay on device)
 * @param props.bundle - Methodology from GET /api/methodology
 * @param props.timeframe - Same Daily / Weekly / Fortnightly as the dashboard
 * @returns Floating chat panel in the app shell
 */
export function ChatDock({
  profile,
  hasProfile,
  bundle,
  methodologyError,
  timeframe,
}: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const seqRef = useRef(0)
  const inputId = useId()
  const liveId = useId()

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

  function handleSend(event: FormEvent) {
    event.preventDefault()
    const sentence = draft.trim()
    if (!sentence) return
    setDraft('')
    append('user', sentence)

    const intent = matchChatIntent(sentence)
    if (!intent) {
      append('assistant', CHAT_UNMATCHED)
      return
    }

    const ctx: ChatReplyContext = {
      profile,
      hasProfile,
      bundle,
      methodologyError,
      timeframe,
    }
    append('assistant', buildChatReply(intent, ctx))
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
                Try “What is my weekly picture?” or “Which plan is first?”
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
              placeholder="Ask about your energy picture or plans…"
            />
            <Button type="submit" variant="primary" className="chat-panel__send">
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
