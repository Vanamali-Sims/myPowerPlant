/**
 * The line-art story (sun, one home, then the neighbourhood as one power
 * plant) that plays over the explore home when someone picks "Get started
 * with VPPs".
 *
 * Skipped with a click, Enter, Space, or Escape. Never plays with reduced motion.
 */
import { INTRO_COPY, INTRO_STEPS } from '../../constants/onboarding'
import { IntroScene } from './IntroScene'
import { useIntroPlayback } from './useIntroPlayback'

type Props = {
  /** Called once the intro has finished or been skipped. */
  onDone: () => void
  /** Takes focus when the intro clears. */
  focusAfter?: () => HTMLElement | null | undefined
}

/** How long the intro runs, and how long the skip takes to clear, in ms (from the design). */
const EXPLORE_INTRO_MS = 23_100
const SKIP_MS = 1_050

/** When each caption and progress segment starts, in seconds. */
const STEP_DELAYS = [0.6, 5.9, 11.2, 16.5]

/** The captions are inside a button, so their words go in its accessible name. */
const INTRO_LABEL = `How a VPP works: ${INTRO_STEPS.map((step) =>
  `${step.title[0]} ${step.title[1]}`.replace(/\.$/, ''),
).join('; ')}. Press Enter or click anywhere to skip.`

/**
 * ExploreIntro
 * @param props.onDone - Called when the intro ends, so the page underneath can take over
 * @returns The full-screen overlay, or nothing once it has ended
 */
export function ExploreIntro({ onDone, focusAfter }: Props) {
  const { showIntro, skipping, overlayRef, skip, onKeyDown } = useIntroPlayback({ play: true, introMs: EXPLORE_INTRO_MS, skipMs: SKIP_MS, onDone, focusAfter })
  if (!showIntro) return null

  return (
    <div
      ref={overlayRef}
      className={`ic-intro ic-intro--story${skipping ? ' is-skipping' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={INTRO_LABEL}
      onClick={skip}
      onKeyDown={onKeyDown}
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
    </div>
  )
}
