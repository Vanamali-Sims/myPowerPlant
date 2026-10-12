/**
 * Guided tutorial: dims the page, spotlights the real controls for each step,
 * and the assistant robot explains them in a small dialog with Back, Next or
 * Done, and Skip.
 *
 * The overlay only points at controls. It sits over the whole page, so the
 * spotlit control cannot be clicked through it, and nothing it points at is
 * run. Steps whose target is missing or hidden are left out; when none are
 * left the tutorial closes at once as "unavailable".
 */
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { TUTORIAL_COPY, type TutorialStep } from '../../constants/tutorials'
import type { TutorialOutcome } from '../../lib/tutorialStorage'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { BotAvatar } from '../ui/BotAvatar'
import { Button } from '../ui/Button'
import {
  SPOTLIGHT_PADDING,
  findTutorialTargets,
  placeTooltip,
  unionBox,
  type Box,
  type Size,
} from './tutorialLayout'

export type TutorialCloseReason = TutorialOutcome | 'unavailable'

type Props = {
  steps: TutorialStep[]
  /** Called once when the tutorial ends. */
  onClose: (reason: TutorialCloseReason) => void
  /** Where focus goes on close when nothing usable was focused at open (e.g. a removed intro). */
  fallbackFocus?: () => HTMLElement | null
}

type Layout = { target: Box | null; tip: Size; view: Size }

/**
 * Tutorial
 * @param props.steps - Steps for the current flow, in order
 * @param props.onClose - Finished ("done"), skipped, or nothing to show ("unavailable")
 * @param props.fallbackFocus - Focus target on close when the opener is gone
 * @returns JSX.Element | null
 */
export function Tutorial({ steps, onClose, fallbackFocus }: Props) {
  const reducedMotion = useReducedMotion()
  // Read before the page behind goes inert, which would move focus to the body.
  const [returnTo] = useState(() =>
    document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null,
  )
  const [shown, setShown] = useState<TutorialStep[] | null>(null)
  const [index, setIndex] = useState(0)
  const [layout, setLayout] = useState<Layout | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const bodyId = useId()
  const counterId = useId()

  const step = shown?.[index] ?? null
  const total = shown?.length ?? 0
  const isLast = index === total - 1
  const ready = layout !== null

  const reportUnavailable = useEffectEvent(() => onClose('unavailable'))
  const restoreFocus = useEffectEvent(() => {
    const target = returnTo?.isConnected ? returnTo : (fallbackFocus?.() ?? null)
    target?.focus()
  })

  // Targets are looked up after the page has painted, so they exist even when
  // the tutorial mounts in the same render as the page.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const available = steps.filter((candidate) => findTutorialTargets(candidate.target).length > 0)
      if (available.length === 0) reportUnavailable()
      else setShown(available)
    })
    return () => cancelAnimationFrame(frame)
  }, [steps])

  useEffect(() => () => restoreFocus(), [])

  // Bring the target into view, then keep the spotlight and tooltip on it
  // through scrolling, resizing, and the tooltip changing size.
  useEffect(() => {
    if (!step) return
    const elements = findTutorialTargets(step.target)
    elements[0]?.scrollIntoView?.({
      block: 'center',
      inline: 'nearest',
      behavior: reducedMotion ? 'instant' : 'smooth',
    })

    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const boxes = elements
          .filter((element) => element.isConnected)
          .map((element) => {
            const rect = element.getBoundingClientRect()
            return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
          })
        const tip = dialogRef.current
        setLayout({
          target: unionBox(boxes),
          tip: { width: tip?.offsetWidth ?? 0, height: tip?.offsetHeight ?? 0 },
          view: { width: window.innerWidth, height: window.innerHeight },
        })
      })
    }

    measure()
    window.addEventListener('scroll', measure, { capture: true, passive: true })
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    for (const element of elements) observer?.observe(element)
    if (dialogRef.current) observer?.observe(dialogRef.current)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', measure, { capture: true })
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [step, reducedMotion])

  // Focus moves into the dialog once it is placed, and back into it when the
  // focused button goes away (Back on the first step).
  useEffect(() => {
    const node = dialogRef.current
    if (!ready || !node) return
    if (!node.contains(document.activeElement)) node.focus()
  }, [ready, index])

  if (!shown || !step) return null

  function goTo(next: number) {
    if (!shown) return
    setIndex(next)
    setAnnouncement(`${TUTORIAL_COPY.stepOf(next + 1, shown.length)}: ${shown[next].title}`)
  }

  function handleNext() {
    if (isLast) onClose('done')
    else goTo(index + 1)
  }

  function handleBack() {
    if (index > 0) goTo(index - 1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose('skipped')
      return
    }
    if (event.key === 'ArrowRight' && !isLast) {
      event.preventDefault()
      goTo(index + 1)
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      handleBack()
      return
    }
    if (event.key !== 'Tab') return
    const node = dialogRef.current
    if (!node) return
    const buttons = Array.from(node.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
    if (buttons.length === 0) return
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === node)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const position = layout ? placeTooltip(layout.target, layout.tip, layout.view, step.placement) : null
  const spot = layout?.target ?? null
  const classes = ['tutorial', reducedMotion ? 'tutorial--reduced' : '', spot ? '' : 'tutorial--no-target']

  return (
    <div className={classes.filter(Boolean).join(' ')} onKeyDown={handleKeyDown}>
      {spot ? (
        <div
          className="tutorial__spotlight"
          aria-hidden="true"
          style={{
            top: spot.top - SPOTLIGHT_PADDING,
            left: spot.left - SPOTLIGHT_PADDING,
            width: spot.width + SPOTLIGHT_PADDING * 2,
            height: spot.height + SPOTLIGHT_PADDING * 2,
          }}
        />
      ) : null}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${counterId} ${bodyId}`}
        tabIndex={-1}
        className="tutorial__dialog"
        data-placement={position?.placement}
        style={position ? { top: position.top, left: position.left } : { top: 0, left: 0, visibility: 'hidden' }}
      >
        <div className="tutorial__header">
          <BotAvatar size={44} smiling className="tutorial__avatar" />
          <div>
            <p id={counterId} className="tutorial__counter">
              {TUTORIAL_COPY.stepOf(index + 1, total)}
            </p>
            <h2 id={titleId} className="tutorial__title">
              {step.title}
            </h2>
          </div>
        </div>
        <p id={bodyId} className="tutorial__body">
          {step.body}
        </p>
        <div className="tutorial__actions">
          <Button variant="ghost" className="tutorial__skip" onClick={() => onClose('skipped')}>
            {TUTORIAL_COPY.skip}
          </Button>
          <div className="tutorial__nav">
            {index > 0 ? (
              <Button variant="secondary" className="tutorial__back" onClick={handleBack}>
                {TUTORIAL_COPY.back}
              </Button>
            ) : null}
            <Button variant="primary" className="tutorial__next" onClick={handleNext}>
              {isLast ? TUTORIAL_COPY.done : TUTORIAL_COPY.next}
            </Button>
          </div>
        </div>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
