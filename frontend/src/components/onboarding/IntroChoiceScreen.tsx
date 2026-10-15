/**
 * Screens 1 and 2: the brand intro (orbiting homes, the logo, and the
 * MyPowerPlant wordmark) plays over the path-choice split. The
 * logo then lands on the choice header, and Bolt introduces himself.
 *
 * The intro can be skipped with a click, Enter, Space, or Escape, and replayed.
 * With reduced motion it does not play at all.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { BOLT_HELLO_DISPLAY_MS, BRAND_INTRO, PATH_CHOICE } from '../../constants/onboarding'
import { hasSeenBoltHello, markBoltHelloSeen } from '../../lib/boltIntroStorage'
import { MyPowerPlantMark } from '../ui/MyPowerPlantMark'
import { PathChoiceBolt, PathChoiceBoltFloating } from './PathChoiceBolt'
import { useBoltHintState, usePathChoiceBoltGuide } from './usePathChoiceBoltGuide'
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

function liveMessage(hint: 'idle' | 'explore' | 'improve') {
  if (hint === 'explore') return `${PATH_CHOICE.bolt.explore} ${PATH_CHOICE.explore.action}`
  if (hint === 'improve') return `${PATH_CHOICE.bolt.improve} ${PATH_CHOICE.improve.action}`
  return ''
}

/**
 * IntroChoiceScreen
 * @param props.playIntro - Whether the intro plays first
 * @param props.onExplore - Left card: Screen 2.1, getting started
 * @param props.onImprove - Right card: Screen 3.1, improving a setup
 * @returns JSX.Element
 *
 * While the intro shows, the choice underneath is inert so focus stays on the
 * intro. When it ends, Bolt introduces himself and focus moves to the heading.
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

  const { committed, setPointerHint, setFocusHint, releaseFocus, resetHints } = useBoltHintState({
    resetKey: run,
  })

  // Centre hello runs once per device, right after the logo intro hands off to the choice.
  // Tracked during render so a replay hides it and the handoff shows it, without an effect.
  const [centerHello, setCenterHello] = useState(() => !showIntro && !hasSeenBoltHello())
  const [trackedShowIntro, setTrackedShowIntro] = useState(showIntro)
  if (showIntro !== trackedShowIntro) {
    setTrackedShowIntro(showIntro)
    if (showIntro) setCenterHello(false)
    else if (!hasSeenBoltHello()) setCenterHello(true)
  }

  const dismissCenterHello = useCallback(() => {
    setCenterHello((showing) => {
      if (showing) markBoltHelloSeen()
      return false
    })
  }, [])

  const boltEnabled = !showIntro

  useEffect(() => {
    if (!centerHello || committed !== 'idle') return
    const timer = window.setTimeout(dismissCenterHello, BOLT_HELLO_DISPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [centerHello, committed, dismissCenterHello])

  function onPointerHint(hint: 'idle' | 'explore' | 'improve') {
    if (hint !== 'idle') dismissCenterHello()
    setPointerHint(hint)
  }

  function onFocusHint(hint: 'explore' | 'improve') {
    dismissCenterHello()
    setFocusHint(hint)
  }
  const {
    markRef,
    exploreStackRef,
    improveStackRef,
    guideRef,
    translate,
    tilt,
    travel,
    reducedMotion,
    staticLayout,
  } = usePathChoiceBoltGuide({ enabled: boltEnabled, committed })

  const splitClass =
    committed === 'explore'
      ? 'ic-split--explore'
      : committed === 'improve'
        ? 'ic-split--improve'
        : ''

  function handleReplay() {
    resetHints()
    setCenterHello(false)
    replay()
  }

  const showFloatingBolt =
    boltEnabled && !staticLayout && (committed !== 'idle' || centerHello)
  const boltHint = committed !== 'idle' ? committed : 'idle'

  return (
    <div className={`ic-page${reducedMotion ? ' ic-page--reduced-motion' : ''}`}>
      <div
        className={`ic-split ${splitClass}`.trim()}
        inert={showIntro || undefined}
        onPointerLeave={(event) => {
          const next = event.relatedTarget
          if (next instanceof Node && guideRef.current?.contains(next)) return
          onPointerHint('idle')
        }}
      >
        <button
          type="button"
          className="ic-half ic-half--new"
          onClick={onExplore}
          onPointerEnter={() => onPointerHint('explore')}
          onFocus={() => onFocusHint('explore')}
          onBlur={() => {
            window.setTimeout(() => {
              const active = document.activeElement
              if (guideRef.current?.contains(active)) return
              releaseFocus('explore')
            }, 0)
          }}
        >
          <div
            ref={exploreStackRef}
            className={`ic-half__stack${committed === 'explore' ? ' is-raised' : ''}`}
          >
            <span className="ic-eyebrow">{PATH_CHOICE.explore.eyebrow}</span>
            <span className="ic-title">
              {PATH_CHOICE.explore.title[0]}
              <br />
              {PATH_CHOICE.explore.title[1]}
            </span>
          </div>
          {staticLayout ? (
            <div className="ic-half__bolt">
              <PathChoiceBolt
                hint="explore"
                anchored
                smiling
                onExplore={onExplore}
                onImprove={onImprove}
              />
            </div>
          ) : null}
        </button>
        <button
          type="button"
          className="ic-half ic-half--imp"
          onClick={onImprove}
          onPointerEnter={() => onPointerHint('improve')}
          onFocus={() => onFocusHint('improve')}
          onBlur={() => {
            window.setTimeout(() => {
              const active = document.activeElement
              if (guideRef.current?.contains(active)) return
              releaseFocus('improve')
            }, 0)
          }}
        >
          <div
            ref={improveStackRef}
            className={`ic-half__stack${committed === 'improve' ? ' is-raised' : ''}`}
          >
            <span className="ic-eyebrow">{PATH_CHOICE.improve.eyebrow}</span>
            <span className="ic-title">
              {PATH_CHOICE.improve.title[0]}
              <br />
              {PATH_CHOICE.improve.title[1]}
            </span>
          </div>
          {staticLayout ? (
            <div className="ic-half__bolt">
              <PathChoiceBolt
                hint="improve"
                anchored
                smiling
                onExplore={onExplore}
                onImprove={onImprove}
              />
            </div>
          ) : null}
        </button>
      </div>

      <div className="ic-header" inert={showIntro || undefined}>
        <span ref={markRef} className={`ic-mark${showIntro ? ' is-awaiting-intro' : ''}`}>
          <MyPowerPlantMark width={48} height={48} className="ic-logo-img" />
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="visually-hidden">
          {PATH_CHOICE.title}
        </h1>
      </div>

      {showFloatingBolt ? (
        <>
          <p className="visually-hidden" aria-live="polite">
            {liveMessage(committed)}
          </p>
          <PathChoiceBoltFloating
            key={run}
            guideRef={guideRef}
            translate={translate}
            tilt={tilt}
            travel={travel}
            hint={boltHint}
            smiling={committed !== 'idle'}
            enter={centerHello && committed === 'idle'}
            anchored={committed !== 'idle'}
            reducedMotion={reducedMotion}
            onExplore={onExplore}
            onImprove={onImprove}
            onLayerPointerEnter={() => {
              if (committed === 'explore' || committed === 'improve') onPointerHint(committed)
            }}
            onLayerPointerLeave={(event) => {
              const next = event.relatedTarget
              if (next instanceof Element && next.closest('.ic-half')) return
              onPointerHint('idle')
            }}
          />
        </>
      ) : null}

      {reduced ? null : (
        <button type="button" className="ic-replay" onClick={handleReplay} inert={showIntro || undefined}>
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
