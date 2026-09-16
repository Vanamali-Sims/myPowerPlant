/**
 * Hero illustration: an isometric home with solar roof, battery wall, and a
 * neighbour on the VPP link. Token fills only; depth from overlapping planes.
 */
import { BatteryIcon, SunIcon } from '../ui/icons'

const COS = Math.sqrt(3) / 2

function xy(
  x: number,
  y: number,
  z: number,
  originX: number,
  originY: number,
  scale: number,
): { x: number; y: number } {
  return {
    x: originX + (x - y) * COS * scale,
    y: originY + (x + y) * 0.5 * scale - z * scale,
  }
}

function iso(
  x: number,
  y: number,
  z: number,
  originX: number,
  originY: number,
  scale: number,
): string {
  const p = xy(x, y, z, originX, originY, scale)
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
}

function face(
  pts: [number, number, number][],
  originX: number,
  originY: number,
  scale: number,
): string {
  return pts.map(([x, y, z]) => iso(x, y, z, originX, originY, scale)).join(' ')
}

const MAIN = { ox: 132, oy: 168, s: 22 }
const NEXT = { ox: 232, oy: 148, s: 13 }

const solar = face(
  [
    [0, 0, 2],
    [3, 0, 2],
    [3, 1.5, 3.15],
    [0, 1.5, 3.15],
  ],
  MAIN.ox,
  MAIN.oy,
  MAIN.s,
)
const roofBack = face(
  [
    [0, 3, 2],
    [3, 3, 2],
    [3, 1.5, 3.15],
    [0, 1.5, 3.15],
  ],
  MAIN.ox,
  MAIN.oy,
  MAIN.s,
)
const battery = face(
  [
    [0, 0, 0],
    [0, 3, 0],
    [0, 3, 2],
    [0, 0, 2],
  ],
  MAIN.ox,
  MAIN.oy,
  MAIN.s,
)
const front = face(
  [
    [0, 0, 0],
    [3, 0, 0],
    [3, 0, 2],
    [0, 0, 2],
  ],
  MAIN.ox,
  MAIN.oy,
  MAIN.s,
)
const side = face(
  [
    [3, 0, 0],
    [3, 3, 0],
    [3, 3, 2],
    [3, 0, 2],
  ],
  MAIN.ox,
  MAIN.oy,
  MAIN.s,
)
const door = face(
  [
    [1.15, 0, 0],
    [1.9, 0, 0],
    [1.9, 0, 1.05],
    [1.15, 0, 1.05],
  ],
  MAIN.ox,
  MAIN.oy,
  MAIN.s,
)
const pane = face(
  [
    [3, 0.75, 0.7],
    [3, 1.55, 0.7],
    [3, 1.55, 1.4],
    [3, 0.75, 1.4],
  ],
  MAIN.ox,
  MAIN.oy,
  MAIN.s,
)
const nFront = face(
  [
    [0, 0, 0],
    [2.2, 0, 0],
    [2.2, 0, 1.6],
    [0, 0, 1.6],
  ],
  NEXT.ox,
  NEXT.oy,
  NEXT.s,
)
const nSide = face(
  [
    [2.2, 0, 0],
    [2.2, 2.2, 0],
    [2.2, 2.2, 1.6],
    [2.2, 0, 1.6],
  ],
  NEXT.ox,
  NEXT.oy,
  NEXT.s,
)
const nRoof = face(
  [
    [0, 0, 1.6],
    [2.2, 0, 1.6],
    [2.2, 1.1, 2.4],
    [0, 1.1, 2.4],
  ],
  NEXT.ox,
  NEXT.oy,
  NEXT.s,
)
const nRoofBack = face(
  [
    [0, 2.2, 1.6],
    [2.2, 2.2, 1.6],
    [2.2, 1.1, 2.4],
    [0, 1.1, 2.4],
  ],
  NEXT.ox,
  NEXT.oy,
  NEXT.s,
)
const panelStripes = [0.55, 1.25, 1.95].map((x) =>
  face(
    [
      [x, 0.15, 2.08],
      [x + 0.45, 0.15, 2.08],
      [x + 0.45, 1.35, 3.02],
      [x, 1.35, 3.02],
    ],
    MAIN.ox,
    MAIN.oy,
    MAIN.s,
  ),
)
const linkStart = xy(3, 1.5, 3.15, MAIN.ox, MAIN.oy, MAIN.s)
const linkEnd = xy(0, 1.1, 2.4, NEXT.ox, NEXT.oy, NEXT.s)

/**
 * HeroHouse
 * @returns JSX.Element
 *
 * Static 2.5D drawing. Hover the solar roof or battery wall to highlight them.
 */
export function HeroHouse() {
  return (
    <div className="hero-house">
      <div className="hero-house__stage">
        <svg className="hero-house__svg" viewBox="0 0 320 240" aria-hidden="true">
          <polygon className="hero-house__face hero-house__face--far" points={nRoofBack} />
          <polygon className="hero-house__face hero-house__face--far" points={nSide} />
          <polygon className="hero-house__face hero-house__face--mid" points={nFront} />
          <polygon className="hero-house__face hero-house__face--far" points={nRoof} />

          <polygon className="hero-house__face hero-house__face--side" points={side} />
          <polygon className="hero-house__window" points={pane} />
          <polygon className="hero-house__face hero-house__face--front" points={front} />
          <polygon className="hero-house__door" points={door} />
          <polygon className="hero-house__face hero-house__face--battery" points={battery} />
          <polygon className="hero-house__face hero-house__face--roof-back" points={roofBack} />
          <polygon className="hero-house__face hero-house__face--solar" points={solar} />
          {panelStripes.map((points) => (
            <polygon key={points} className="hero-house__panel" points={points} />
          ))}
          <line
            className="hero-house__link"
            x1={linkStart.x}
            y1={linkStart.y}
            x2={linkEnd.x}
            y2={linkEnd.y}
          />
          <circle className="hero-house__node" cx={linkStart.x} cy={linkStart.y} r="3.2" />
          <circle className="hero-house__node" cx={linkEnd.x} cy={linkEnd.y} r="2.6" />
        </svg>
        <span className="hero-house__badge hero-house__badge--sun">
          <SunIcon width={14} height={14} />
        </span>
        <span className="hero-house__badge hero-house__badge--battery">
          <BatteryIcon width={14} height={14} />
        </span>
      </div>
    </div>
  )
}
