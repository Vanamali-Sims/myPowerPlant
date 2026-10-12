/**
 * The assistant robot in the bottom corner. Clicking it opens a short menu
 * (Actions in the explore flow, Tutorial in both). The tutorial's last step
 * points at it, so it carries the bot data-tour target.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ASSISTANT_COPY, TUTORIAL_TARGETS } from '../../constants/tutorials'
import { BotAvatar } from '../ui/BotAvatar'

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
}

/**
 * AssistantBot
 * @param props.items - Menu entries, top to bottom
 * @param props.smiling - Smile regardless of hover, e.g. during the tutorial
 * @returns JSX.Element
 *
 * Esc or a click elsewhere closes the menu. Choosing an item returns focus to
 * the robot first, so anything the item opens can hand focus back to it.
 */
export function AssistantBot({ items, smiling = false }: Props) {
  const [open, setOpen] = useState(false)
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
      botRef.current?.focus()
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const hint = items.find((item) => item.unavailableReason)?.unavailableReason

  function choose(item: AssistantItem) {
    if (item.unavailableReason) return
    botRef.current?.focus()
    setOpen(false)
    item.onSelect()
  }

  return (
    <div ref={rootRef} className="assistant">
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
        onClick={() => setOpen((current) => !current)}
        onPointerEnter={() => setNoticed(true)}
        onPointerLeave={() => setNoticed(false)}
        onFocus={() => setNoticed(true)}
        onBlur={() => setNoticed(false)}
      >
        <BotAvatar size={60} blink smiling={smiling || noticed} />
      </button>
    </div>
  )
}
