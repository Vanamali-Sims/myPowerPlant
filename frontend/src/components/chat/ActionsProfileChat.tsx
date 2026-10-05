/**
 * Profile tab inside Actions: typed instructions that map to profile field updates.
 *
 * Uses the same on-device sentence matcher as the legacy chat dock (set_profile
 * only). No Q&A, navigation, or downloads here.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { ProfileData } from '../../types/profile'
import { applyProfilePatch } from '../../lib/chat/applyProfilePatch'
import { CHAT_UNMATCHED, matchChat } from '../../lib/chat/matchChat'
import { Button } from '../ui/Button'

const MAX_MESSAGES = 12

const PROFILE_HINT =
  'Try “change rooms to 5”, “change my postcode to 3186”, or “set monthly bill to 220”.'

const PROFILE_SCOPE_NOTE =
  'Only profile updates are handled here. Open Location or Reminders for those tasks.'

type ChatLine = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

type Props = {
  profile: ProfileData
  onSave: (profile: ProfileData) => void
  onStatus: (message: string) => void
}

/**
 * ActionsProfileChat
 */
export function ActionsProfileChat({ profile, onSave, onStatus }: Props) {
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatLine[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const seqRef = useRef(0)
  const inputId = useId()
  const logId = useId()

  function nextId(): string {
    seqRef.current += 1
    return `profile-chat-${seqRef.current}`
  }

  function append(role: ChatLine['role'], text: string) {
    setMessages((prev) => {
      const next = [...prev, { id: nextId(), role, text }]
      return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next
    })
    queueMicrotask(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus())
  }, [])

  function handleSend(event: FormEvent) {
    event.preventDefault()
    const sentence = draft.trim()
    if (!sentence) return
    setDraft('')
    append('user', sentence)

    const matched = matchChat(sentence)
    if (!matched) {
      append('assistant', CHAT_UNMATCHED)
      onStatus('')
      return
    }
    if (matched.intent !== 'set_profile') {
      append('assistant', PROFILE_SCOPE_NOTE)
      onStatus('')
      return
    }

    const result = applyProfilePatch(profile, matched.patch)
    if (!result.ok) {
      append('assistant', result.message)
      onStatus('')
      return
    }

    onSave(result.profile)
    append('assistant', result.message)
    onStatus(result.message)
  }

  return (
    <div className="chat-profile-chat">
      <p className="chat-panel__hint">{PROFILE_HINT}</p>
      <div
        ref={listRef}
        id={logId}
        className="chat-profile-chat__log"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <p className="chat-panel__hint chat-profile-chat__empty">No changes yet.</p>
        ) : null}
        {messages.map((msg) => (
          <p key={msg.id} className={`chat-bubble chat-bubble--${msg.role}`}>
            <span className="chat-bubble__label" aria-hidden="true">
              {msg.role === 'user' ? 'You' : 'Saved'}
            </span>
            {msg.text}
          </p>
        ))}
      </div>
      <form className="chat-profile-chat__form" onSubmit={handleSend}>
        <label className="sr-only" htmlFor={inputId}>Profile change</label>
        <input
          ref={inputRef}
          id={inputId}
          className="chat-panel__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          autoComplete="off"
          placeholder="Change rooms to 5…"
          aria-describedby={logId}
        />
        <Button type="submit" variant="primary" className="chat-panel__send">
          Save
        </Button>
      </form>
    </div>
  )
}
