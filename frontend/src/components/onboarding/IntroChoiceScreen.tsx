/**
 * Screens 1 and 2: the line-art intro plays over the "Which describes you?"
 * choice, then the logo lands on the choice header.
 *
 * The intro can be skipped with a click, Enter, Space, or Escape, and replayed.
 * With reduced motion it does not play at all.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { INTRO_COPY, INTRO_STEPS, PATH_CHOICE } from '../../constants/onboarding'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { MyPowerPlantMark } from '../ui/MyPowerPlantMark'
import { IntroScene } from './IntroScene'

type Props = {
  /** Play the intro when the screen opens (every visit); false shows the choice straight away. */
  playIntro: boolean
  /** Called once the intro has finished or been skipped. */
  onIntroDone?: () => void
  onExplore: () => void
  onImprove: () => void
}

type Phase = 'playing' | 'skipping' | 'done'

/** How long the intro runs, and how long the skip takes to clear, in ms (from the design). */
const INTRO_MS = 24_600
const SKIP_MS = 1_050

/** When each caption and progress segment starts, in seconds. */
const STEP_DELAYS = [0.6, 5.9, 11.2, 16.5]

/** The captions are inside a button, so their words go in its accessible name. */
const INTRO_LABEL = `MyPowerPlant introduction: ${INTRO_STEPS.map((step) =>
  `${step.title[0]} ${step.title[1]}`.replace(/\.$/, ''),
).join('; ')}. Press Enter or click anywhere to skip.`

function Arrow() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" className="ic-arrow">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/**
 * IntroChoiceScreen
 * @param props.playIntro - Whether the intro plays first
 * @param props.onExplore - Left card: Screen 2.1, getting started
 * @param props.onImprove - Right card: Screen 3.1, improving a setup
 * @returns JSX.Element
 *
 * While the intro shows, the choice underneath is inert so focus stays on the
 * intro. When it ends, focus moves to the "Which describes you?" heading.
 */
export function IntroChoiceScreen({ playIntro, onIntroDone, onExplore, onImprove }: Props) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>(playIntro ? 'playing' : 'done')
  const [run, setRun] = useState(0)
  const overlayRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const doneRef = useRef(onIntroDone)
  const focusHeadingNext = useRef(false)
  const showIntro = phase !== 'done' && !reduced

  useEffect(() => {
    doneRef.current = onIntroDone
  }, [onIntroDone])

  // Ends the intro after its run, after the skip, or at once under reduced motion.
  useEffect(() => {
    if (phase === 'done') return
    const ms = reduced ? 0 : phase === 'playing' ? INTRO_MS : SKIP_MS
    const timer = window.setTimeout(() => {
      focusHeadingNext.current = true
      setPhase('done')
      doneRef.current?.()
    }, ms)
    return () => window.clearTimeout(timer)
  }, [phase, reduced, run])

  useEffect(() => {
    if (showIntro && phase === 'playing') overlayRef.current?.focus()
  }, [showIntro, phase, run])

  useEffect(() => {
    if (phase === 'done' && focusHeadingNext.current) {
      focusHeadingNext.current = false
      headingRef.current?.focus()
    }
  }, [phase])

  function skip() {
    setPhase((current) => (current === 'playing' ? 'skipping' : current))
  }

  function onIntroKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault()
      skip()
    }
  }

  function replay() {
    setRun((count) => count + 1)
    setPhase('playing')
  }

  return (
    <div className="ic-page">
      <div className="ic-split" inert={showIntro || undefined}>
        <button type="button" className="ic-half ic-half--new" onClick={onExplore}>
          <span className="ic-eyebrow">{PATH_CHOICE.explore.eyebrow}</span>
          <span className="ic-title">
            {PATH_CHOICE.explore.title[0]}
            <br />
            {PATH_CHOICE.explore.title[1]}
          </span>
          <span className="ic-body">{PATH_CHOICE.explore.body}</span>
          <span className="ic-go">
            {PATH_CHOICE.explore.action}
            <Arrow />
          </span>
        </button>
        <button type="button" className="ic-half ic-half--imp" onClick={onImprove}>
          <span className="ic-eyebrow">{PATH_CHOICE.improve.eyebrow}</span>
          <span className="ic-title">
            {PATH_CHOICE.improve.title[0]}
            <br />
            {PATH_CHOICE.improve.title[1]}
          </span>
          <span className="ic-body">{PATH_CHOICE.improve.body}</span>
          <span className="ic-go">
            {PATH_CHOICE.improve.action}
            <Arrow />
          </span>
        </button>
      </div>

      <div className="ic-header" inert={showIntro || undefined}>
        <span className="ic-mark">
          <MyPowerPlantMark width={48} height={48} className="ic-logo-img" />
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="ic-question">
          {PATH_CHOICE.title}
        </h1>
      </div>

      {reduced ? null : (
        <button type="button" className="ic-replay" onClick={replay} inert={showIntro || undefined}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          {PATH_CHOICE.replay}
        </button>
      )}

      {showIntro ? (
        <div
          key={run}
          ref={overlayRef}
          className={`ic-intro${phase === 'skipping' ? ' is-skipping' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={INTRO_LABEL}
          onClick={skip}
          onKeyDown={onIntroKey}
        >
          <div className="ic-bg" />
          <IntroScene />
          <div className="ic-captions">
            {INTRO_STEPS.map((step, index) => (
              <div key={step.tag} className="ic-caption" style={{ animationDelay: `${STEP_DELAYS[index]}s` }}>
                <span className="ic-caption__tag">
                  <span className="ic-caption__number">{String(index + 1).padStart(2, '0')}</span>
                  {step.tag}
                </span>
                <h2 className="ic-caption__title">
                  {step.title[0]}
                  <br />
                  {step.title[1]}
                </h2>
                <p className="ic-caption__body">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="ic-chrome ic-progress" aria-hidden="true">
            {STEP_DELAYS.map((delay) => (
              <span key={delay} className="ic-progress__track">
                <span className="ic-progress__fill" style={{ animationDelay: `${delay}s` }} />
              </span>
            ))}
          </div>
          <div className="ic-chrome ic-place" aria-hidden="true">
            {INTRO_COPY.place}
          </div>
          <div className="ic-chrome ic-hint-wrap" aria-hidden="true">
            <span className="ic-hint">
              {INTRO_COPY.skipHint}
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M5 5l7 7-7 7M13 5l7 7-7 7" />
              </svg>
            </span>
          </div>
          <div className="ic-logo" aria-hidden="true">
            <MyPowerPlantMark width={112} height={112} className="ic-logo-img" />
          </div>
          <div className="ic-word" aria-hidden="true">
            <span className="ic-word__name">{INTRO_COPY.brand}</span>
            <span className="ic-word__tag">{INTRO_COPY.tagline}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
