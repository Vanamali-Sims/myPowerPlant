/**
 * Typical day on What if: household use against solar, saved setup and draft.
 *
 * The shaded band is where solar is above use on the draft. That is the
 * stretch a VPP can take. Lines update with the draft; nothing here waits
 * on the model.
 */
import { formatHour, type HourPoint } from '../../lib/typicalDay'

type Props = {
  now: HourPoint[]
  draft: HourPoint[]
  showPrevious: boolean
}

const W = 720
const H = 248
const PAD = { top: 12, right: 8, bottom: 28, left: 32 }

function niceTop(max: number): number {
  if (max <= 0) return 1
  const padded = max * 1.12
  const exp = Math.floor(Math.log10(padded))
  const mag = 10 ** exp
  const fraction = padded / mag
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return nice * mag
}

function seriesPath(
  points: HourPoint[],
  key: 'loadKwh' | 'solarKwh',
  xAt: (hour: number) => number,
  yAt: (value: number) => number,
): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xAt(point.hour).toFixed(1)} ${yAt(point[key]).toFixed(1)}`)
    .join(' ')
}

function surplusPath(points: HourPoint[], xAt: (hour: number) => number, yAt: (value: number) => number): string {
  const step = points.length > 1 ? xAt(1) - xAt(0) : 0
  let path = ''
  for (const point of points) {
    if (point.solarKwh <= point.loadKwh) continue
    const x = xAt(point.hour)
    const ySolar = yAt(point.solarKwh)
    const yLoad = yAt(point.loadKwh)
    path += `M ${x.toFixed(1)} ${yLoad.toFixed(1)} L ${x.toFixed(1)} ${ySolar.toFixed(1)} L ${(x + step).toFixed(1)} ${ySolar.toFixed(1)} L ${(x + step).toFixed(1)} ${yLoad.toFixed(1)} Z `
  }
  return path
}

/**
 * WhatIfDayChart
 */
export function WhatIfDayChart({ now, draft, showPrevious }: Props) {
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const max = Math.max(
    0,
    ...now.flatMap((point) => [point.loadKwh, point.solarKwh]),
    ...draft.flatMap((point) => [point.loadKwh, point.solarKwh]),
  )
  const top = niceTop(max)
  const xAt = (hour: number) => PAD.left + (hour / 23) * plotW
  const yAt = (value: number) => PAD.top + plotH - (value / top) * plotH
  const ticks = [0, 6, 12, 18, 23]

  return (
    <figure className="whatif-day">
      <svg
        className="whatif-day__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Typical day, household use and solar, current setup and the change being tried"
      >
        {[0, 0.5, 1].map((share) => {
          const y = yAt(top * share)
          return <line key={share} className="whatif-day__grid" x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} />
        })}
        <path className="whatif-day__surplus" d={surplusPath(draft, xAt, yAt)} />
        {showPrevious ? (
          <>
            <path className="whatif-day__line whatif-day__line--load-prev" d={seriesPath(now, 'loadKwh', xAt, yAt)} />
            <path className="whatif-day__line whatif-day__line--solar-prev" d={seriesPath(now, 'solarKwh', xAt, yAt)} />
          </>
        ) : null}
        <path className="whatif-day__line whatif-day__line--load" d={seriesPath(draft, 'loadKwh', xAt, yAt)} />
        <path className="whatif-day__line whatif-day__line--solar" d={seriesPath(draft, 'solarKwh', xAt, yAt)} />
        {ticks.map((hour) => (
          <text key={hour} className="whatif-day__tick" x={xAt(hour)} y={H - 8} textAnchor="middle">
            {formatHour(hour)}
          </text>
        ))}
      </svg>
      <figcaption className="whatif-day__legend">
        <span>
          <i className="whatif-swatch whatif-swatch--load" /> House use
        </span>
        <span>
          <i className="whatif-swatch whatif-swatch--solar" /> Solar
        </span>
        <span>
          <i className="whatif-swatch whatif-swatch--surplus" /> Spare solar
        </span>
        {showPrevious ? <span>Dashed lines are the saved setup</span> : null}
      </figcaption>
    </figure>
  )
}
