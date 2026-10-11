/**
 * Screens 1 and 2: the brand intro (orbiting homes, the logo, and the
 * MyPowerPlant wordmark) plays over the "Which describes you?" choice. The
 * logo then lands on the choice header.
 *
 * The intro can be skipped with a click, Enter, Space, or Escape, and replayed.
 * With reduced motion it does not play at all.
 */
import { useRef, type CSSProperties } from 'react'
import { BRAND_INTRO, PATH_CHOICE } from '../../constants/onboarding'
import { MyPowerPlantMark } from '../ui/MyPowerPlantMark'
import { useIntroPlayback } from './useIntroPlayback'

type Props = {
  /** Play the intro when the screen opens (every visit); false shows the choice straight away. */
  playIntro: boolean
  /** Called once the intro has finished or been skipped. */
  onIntroDone?: () => void
  onExplore: () => void
  onImprove: () => void
}

/** How long the intro runs, and how long the skip takes to clear, in ms (from the design). */
const INTRO_MS = 7_100
const SKIP_MS = 1_050

const INTRO_LABEL = `${BRAND_INTRO.brand} introduction: ${BRAND_INTRO.slogan} Press Enter or click anywhere to skip.`

/** Orbit rings round the centre, drawn one after another. */
const ORBITS = [
  { r: 150, opacity: 0.16, delay: 0.5 },
  { r: 235, opacity: 0.11, delay: 0.75 },
  { r: 330, opacity: 0.07, delay: 1 },
]

/** Pulses that ripple out from the centre. */
const PULSES = [2, 3.1, 4.2]

/** Homes circling on the orbits: ring radius, lap time, start offset, fade-in, all in seconds. */
const HOMES = [
  [150, 26, -1.4, 1.6],
  [150, 26, -14.4, 1.72],
  [235, 38, -8.4, 1.84],
  [235, 38, -26.4, 1.96],
  [235, 38, -34.8, 2.08],
  [330, 52, -18.8, 2.2],
  [330, 52, -43.3, 2.32],
] as const

const LETTERS = Array.from(BRAND_INTRO.brand)

function delay(seconds: number, duration?: number): CSSProperties {
  return duration === undefined
    ? { animationDelay: `${seconds}s` }
    : { animationDelay: `${seconds}s`, animationDuration: `${duration}s` }
}

function Arrow() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" className="ic-arrow">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/** The orbiting homes, the pulses, the logo, the wordmark, and the slogan. Decorative. */
function BrandIntro() {
  return (
    <>
      <div className="bi-bg" />
      <svg className="bi-fx bi-orbits" aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMin slice">
        {ORBITS.map((orbit) => (
          <circle
            key={orbit.r}
            cx="720"
            cy="380"
            r={orbit.r}
            pathLength={1}
            className="bi-orbit"
            strokeOpacity={orbit.opacity}
            style={delay(orbit.delay)}
          />
        ))}
        {PULSES.map((start) => (
          <circle key={start} cx="720" cy="380" r="70" className="bi-pulse" style={delay(start)} />
        ))}
        {HOMES.map(([radius, lap, offset, fadeIn]) => (
          <g key={`${radius}${offset}`} className="bi-spin" style={delay(offset, lap)}>
            <g className="bi-home" style={delay(fadeIn)}>
              <circle cx={720 + radius} cy="380" r="5" className="bi-home__dot" />
              <circle cx={720 + radius} cy="380" r="11" className="bi-home__halo" />
            </g>
          </g>
        ))}
      </svg>
      <div className="bi-logo" aria-hidden="true">
        <MyPowerPlantMark width={132} height={132} className="ic-logo-img" />
      </div>
      <div className="bi-fx bi-word" aria-hidden="true">
        {LETTERS.map((letter, index) => (
          <span key={index} className="bi-letter" style={delay(2.2 + index * 0.045)}>
            {letter}
          </span>
        ))}
      </div>
      <div className="bi-fx bi-foot" aria-hidden="true">
        <span className="bi-slogan">{BRAND_INTRO.slogan}</span>
        <span className="bi-hint">{BRAND_INTRO.skipHint}</span>
      </div>
    </>
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
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { reduced, run, showIntro, skipping, overlayRef, skip, onKeyDown, replay } = useIntroPlayback({
    play: playIntro,
    introMs: INTRO_MS,
    skipMs: SKIP_MS,
    onDone: onIntroDone,
    focusAfter: () => headingRef.current,
  })

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
          className={`ic-intro ic-intro--brand${skipping ? ' is-skipping' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={INTRO_LABEL}
          onClick={skip}
          onKeyDown={onKeyDown}
        >
          <BrandIntro />
        </div>
      ) : null}
    </div>
  )
}
