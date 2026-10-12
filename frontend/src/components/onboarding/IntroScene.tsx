/**
 * Line-art scene for the Screen 1 intro: the sun, one home with solar and a
 * battery, then the neighbourhood linking up into one power plant.
 *
 * Every stroke draws itself with CSS (pathLength 1 + dashoffset); timings are
 * the design's, in seconds from the start of the intro. Decorative only.
 */
import type { CSSProperties } from 'react'
import { INTRO_COPY, STORY_SPEED } from '../../constants/onboarding'

type Stroke = { d: string; delay: number; duration: number }

/** Times below are the design's; STORY_SPEED sets the pace actually played. */
function timing(delay: number, duration?: number): CSSProperties {
  const at = (seconds: number) => `${(seconds * STORY_SPEED).toFixed(3)}s`
  return duration === undefined
    ? { animationDelay: at(delay) }
    : { animationDelay: at(delay), animationDuration: at(duration) }
}

function Draw({ d, delay, duration, className = 'ic-line', width }: Stroke & { className?: string; width?: number }) {
  return (
    <path
      d={d}
      pathLength={1}
      className={`ic-draw ${className}`}
      strokeWidth={width}
      style={timing(delay, duration)}
    />
  )
}

/** Sun rays, clockwise from the right, each drawn a little after the last. */
const RAYS: Stroke[] = Array.from({ length: 8 }, (_, index) => {
  const angle = (index * Math.PI) / 4
  const from = (radius: number) =>
    `${(1390 + radius * Math.cos(angle)).toFixed(1)} ${(300 + radius * Math.sin(angle)).toFixed(1)}`
  return { d: `M${from(62)} L${from(80)}`, delay: 1.3 + index * 0.05, duration: 0.4 }
})

/** The house outline shared by the main home and its neighbours. */
const HOUSE = ['M-60 0 V-70 H60 V0', 'M-74 -68 L0 -122 L74 -68', 'M-12 0 V-36 H12 V0', 'M-44 -52 H-24 V-32 H-44 Z']

/**
 * A point on the right-hand roof slope, in house units: `along` from the ridge
 * down the slope, `inset` in from the roofline. Keeps the panel parallel to the roof.
 */
function roofPoint(along: number, inset: number): string {
  const length = Math.hypot(74, 54)
  const dx = 74 / length
  const dy = 54 / length
  return `${(dx * along - dy * inset).toFixed(1)} ${(-122 + dy * along + dx * inset).toFixed(1)}`
}

/** Solar panel: outline on the roof, then a 2 × 3 grid of cells. */
const PANEL = { from: 14, to: 60, top: 4, bottom: 18 }
const PANEL_OUTLINE = `M${roofPoint(PANEL.from, PANEL.top)} L${roofPoint(PANEL.to, PANEL.top)} L${roofPoint(
  PANEL.to,
  PANEL.bottom,
)} L${roofPoint(PANEL.from, PANEL.bottom)} Z`
const PANEL_GRID = [
  ...[1, 2].map((part) => {
    const along = PANEL.from + ((PANEL.to - PANEL.from) * part) / 3
    return `M${roofPoint(along, PANEL.top)} L${roofPoint(along, PANEL.bottom)}`
  }),
  `M${roofPoint(PANEL.from, (PANEL.top + PANEL.bottom) / 2)} L${roofPoint(PANEL.to, (PANEL.top + PANEL.bottom) / 2)}`,
]

/** Battery on the front wall, right of the door, so it stays inside the house outline. */
const BATTERY_BODY = 'M30 -6 V-44 H46 V-6 Z'
const BATTERY_TERMINAL = 'M35 -47 H41'

/** Energy flowing from the panel down to the battery. */
const PANEL_TO_BATTERY = `M${roofPoint(37, PANEL.bottom)} C30 -80 38 -62 38 -49`

/** Neighbouring homes: position, scale, and when each starts drawing. */
const NEIGHBOURS = [
  [830, 630, 0.62, 11.7],
  [950, 606, 0.55, 11.78],
  [1030, 640, 0.6, 11.86],
  [1270, 640, 0.6, 11.94],
  [1360, 606, 0.55, 12.02],
  [1470, 630, 0.62, 12.1],
  [890, 540, 0.38, 12.18],
  [1000, 526, 0.36, 12.26],
  [1300, 526, 0.36, 12.34],
  [1410, 540, 0.38, 12.42],
  [1110, 516, 0.34, 12.5],
  [1200, 520, 0.34, 12.58],
] as const

/** Where each home's link to the hub starts (the main home first). */
const LINK_STARTS = [
  [1150, 534.7],
  [830, 548.4],
  [950, 532.9],
  [1030, 560.8],
  [1270, 560.8],
  [1360, 532.9],
  [1470, 548.4],
  [890, 487.6],
  [1000, 476.1],
  [1300, 476.1],
  [1410, 487.6],
  [1110, 468.5],
  [1200, 472.5],
] as const

const PULSE_DELAYS = [16.5, 16.68, 16.86, 17.04, 17.22]

/**
 * IntroScene
 * @returns The animated SVG, hidden from assistive technology
 */
export function IntroScene() {
  return (
    <svg className="ic-scene" aria-hidden="true" viewBox="0 0 1600 900" preserveAspectRatio="xMaxYMid slice">
      <defs>
        <radialGradient id="ic-glow">
          <stop offset="0" className="ic-glow-stop" stopOpacity="0.35" />
          <stop offset="1" className="ic-glow-stop" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ic-sun">
          <stop offset="0" className="ic-sun-stop" stopOpacity="0.22" />
          <stop offset="1" className="ic-sun-stop" stopOpacity="0" />
        </radialGradient>
      </defs>

      <Draw d="M700 640 H1600" delay={0.3} duration={1.6} className="ic-line ic-line--ground" />

      {/* The sun dims and drifts to the corner as the scene zooms out, clear of the links. */}
      <g className="ic-sun-group">
        <circle cx="1390" cy="300" r="160" fill="url(#ic-sun)" className="ic-fade" style={timing(0.6)} />
        <Draw d="M1390 254 a46 46 0 1 1 -0.1 0" delay={0.7} duration={1.2} className="ic-line ic-line--sun" />
        {RAYS.map((ray) => (
          <Draw key={ray.d} {...ray} className="ic-line ic-line--sun" />
        ))}
      </g>

      <g className="ic-main">
        <g transform="translate(1150 640) scale(1.3)">
          {HOUSE.map((d, index) => (
            <Draw key={d} d={d} delay={[0.9, 1.15, 1.4, 1.5][index]} duration={1.4} />
          ))}
          <path d={PANEL_OUTLINE} className="ic-fade ic-panel-fill" style={timing(2.4)} />
          <Draw d={PANEL_OUTLINE} delay={1.9} duration={0.7} className="ic-line ic-line--panel" />
          {PANEL_GRID.map((d, index) => (
            <Draw key={d} d={d} delay={2.1 + index * 0.1} duration={0.5} className="ic-line ic-line--grid" />
          ))}
          <g className="ic-beam-group">
            <Draw d={`M150 -258 L${roofPoint(37, 11)}`} delay={2.6} duration={0.9} className="ic-line ic-line--beam" />
          </g>
          <Draw d={BATTERY_BODY} delay={6} duration={0.8} />
          <Draw d={BATTERY_TERMINAL} delay={6.3} duration={0.3} />
          <rect x="33" y="-41" width="10" height="32" rx="1" className="ic-fill" style={timing(6.7)} />
          <path d={PANEL_TO_BATTERY} className="ic-flow" style={timing(6.4)} />
        </g>
      </g>

      {NEIGHBOURS.map(([x, y, scale, delay]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${scale})`} className="ic-neighbour" style={timing(delay)}>
          {HOUSE.map((d, index) => (
            <Draw key={d} d={d} delay={delay + [0, 0.25, 0.5, 0.6][index]} duration={1.4} width={1.44 / scale} />
          ))}
          {/* Every home in the plant has solar and a battery. */}
          <path d={PANEL_OUTLINE} className="ic-fade ic-panel-fill" style={timing(delay + 1)} />
          <Draw d={PANEL_OUTLINE} delay={delay + 0.7} duration={0.6} className="ic-line ic-line--panel" width={1.6 / scale} />
          {PANEL_GRID.map((d) => (
            <Draw key={d} d={d} delay={delay + 0.85} duration={0.4} className="ic-line ic-line--grid" width={1 / scale} />
          ))}
          <Draw d={BATTERY_BODY} delay={delay + 0.8} duration={0.6} width={1.44 / scale} />
          <Draw d={BATTERY_TERMINAL} delay={delay + 0.95} duration={0.3} width={1.44 / scale} />
          <rect x="33" y="-41" width="10" height="32" rx="1" className="ic-fill" style={timing(delay + 1.1)} />
        </g>
      ))}

      {LINK_STARTS.map(([x, y], index) => {
        const d = `M${x.toFixed(1)} ${y} Q${((x + 1150) / 2).toFixed(1)} 270.0 1150 334`
        return (
          <g key={d}>
            <path d={d} pathLength={1} className="ic-draw ic-link" style={timing(12.4 + index * 0.06, 1)} />
            <path d={d} pathLength={1} className="ic-pulse" style={timing(PULSE_DELAYS[index % PULSE_DELAYS.length])} />
          </g>
        )
      })}

      <g className="ic-hub">
        <circle cx="1150" cy="300" r="120" fill="url(#ic-glow)" />
        <circle cx="1150" cy="300" r="34" className="ic-hub-core" />
        <path d="M1154 285 l-11 17 h9 l-5 15 l13 -19 h-9z" className="ic-hub-bolt" />
      </g>

      <g className="ic-event">
        <rect x="1210" y="208" width="236" height="74" rx="14" className="ic-event-card" />
        <circle cx="1232" cy="232" r="4" className="ic-event-dot" />
        <text x="1244" y="236" className="ic-event-label">
          {INTRO_COPY.eventLabel}
        </text>
        <text x="1228" y="266" className="ic-event-value">
          {INTRO_COPY.eventValue} <tspan className="ic-event-note">{INTRO_COPY.eventNote}</tspan>
        </text>
      </g>
    </svg>
  )
}
