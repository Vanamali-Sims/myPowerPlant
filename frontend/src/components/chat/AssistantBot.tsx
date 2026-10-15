/**
 * The assistant robot in the bottom corner. Clicking it opens a short menu
 * (Actions in the explore flow, Tutorial in both). The tutorial's last step
 * points at it, so it carries the bot data-tour target.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ASSISTANT_COPY, TUTORIAL_TARGETS } from '../../constants/tutorials'
import { BotAvatar } from '../ui/BotAvatar'

/** A menu opened by hover closes this long after the mouse leaves, so crossing to it does not flicker. */
export const HOVER_CLOSE_MS = 300

export type AssistantItem = {
  id: string
  label: string
  icon: ReactNode
  /** Deep green for tools, orange for the tutorial. */
  tone?: 'deep' | 'accent'
  onSelect: () => void
  /** Why the item cannot be used yet; shown under the menu and the item stays put. */
  unavailableReason?: string
  /** Adds a dot and this text for screen readers, e.g. a tutorial not seen yet. */
  badge?: string
  /** Mirrors a panel the item opens, for aria-expanded. */
  expanded?: boolean
}

type Props = {
  items: AssistantItem[]
  /** Smile while a tutorial is running. */
  smiling?: boolean
  /** Short line from Bolt (e.g. locked improve features). */
  speech?: string | null
}

/**
 * AssistantBot
 * @param props.items - Menu entries, top to bottom
 * @param props.smiling - Smile regardless of hover, e.g. during the tutorial
 * @returns JSX.Element
 *
 * Hovering the robot with a mouse opens the menu, and it closes shortly after
 * the mouse leaves the robot and menu. A click (or tap, or Enter) opens it and
 * keeps it open; clicking the robot again, Esc, or a click elsewhere closes it.
 * Choosing an item returns focus to the robot first, so anything the item
 * opens can hand focus back to it.
 */
export function AssistantBot({ items, smiling = false, speech = null }: Props) {
  const [open, setOpen] = useState(false)
  /** Opened by a click: stays open when the mouse leaves. */
  const [pinned, setPinned] = useState(false)
  const closeTimer = useRef(0)
  /** Hovered or focused: the robot smiles back. */
  const [noticed, setNoticed] = useState(false)
  const menuId = useId()
  const hintId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const botRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      setPinned(false)
      botRef.current?.focus()
    }
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
      setPinned(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const hint = items.find((item) => item.unavailableReason)?.unavailableReason

  function close() {
    window.clearTimeout(closeTimer.current)
    setOpen(false)
    setPinned(false)
  }

  function toggleFromClick() {
    window.clearTimeout(closeTimer.current)
    // Already open from hover: the click keeps it open rather than closing it.
    if (open && !pinned) {
      setPinned(true)
      return
    }
    if (open) close()
    else {
      setOpen(true)
      setPinned(true)
    }
  }

  function choose(item: AssistantItem) {
    if (item.unavailableReason) return
    botRef.current?.focus()
    close()
    item.onSelect()
  }

  return (
    <div
      ref={rootRef}
      className="assistant"
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse') return
        window.clearTimeout(closeTimer.current)
        setOpen(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse' || pinned) return
        window.clearTimeout(closeTimer.current)
        closeTimer.current = window.setTimeout(close, HOVER_CLOSE_MS)
      }}
    >
      {speech ? (
        <div className="assistant__speech" role="status" aria-live="polite">
          <p className="assistant__speech-line">
            <span className="visually-hidden">{ASSISTANT_COPY.boltName}. </span>
            &ldquo;{speech}&rdquo;
          </p>
        </div>
      ) : null}
      {open ? (
        <div id={menuId} className="assistant__menu" role="group" aria-label={ASSISTANT_COPY.menuLabel}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`assistant__item assistant__item--${item.tone ?? 'deep'}`}
              aria-disabled={item.unavailableReason ? true : undefined}
              aria-describedby={item.unavailableReason ? hintId : undefined}
              aria-expanded={item.expanded}
              onClick={() => choose(item)}
            >
              <span className="assistant__item-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="assistant__item-label">{item.label}</span>
              {item.badge ? (
                <>
                  <span className="assistant__dot" aria-hidden="true" />
                  <span className="visually-hidden">, {item.badge}</span>
                </>
              ) : null}
            </button>
          ))}
          {hint ? (
            <p id={hintId} className="assistant__hint">
              {hint}
            </p>
          ) : null}
        </div>
      ) : null}
      <button
        ref={botRef}
        type="button"
        className={`assistant__bot${open ? ' is-open' : ''}`}
        aria-label={ASSISTANT_COPY.menuLabel}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-tour={TUTORIAL_TARGETS.bot}
        onClick={toggleFromClick}
        onPointerEnter={() => setNoticed(true)}
        onPointerLeave={() => setNoticed(false)}
        onFocus={() => setNoticed(true)}
        onBlur={() => setNoticed(false)}
      >
        <BotAvatar size={60} blink smiling={smiling || noticed || Boolean(speech)} />
      </button>
    </div>
  )
}
