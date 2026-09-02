/**
 * Modelled 24-hour load vs solar line chart, with leftover window highlighted.
 */
import { useId, useMemo } from 'react'
import { formatKwh } from '../../lib/kpis'
import {
  formatHour,
  leftoverHours,
  peakLeftoverHour,
  type HourPoint,
} from '../../lib/typicalDay'

type Props = {
  points: HourPoint[]
  activeHour: number
  onSelectHour: (hour: number) => void
}

const W = 840
const H = 268
const PAD = { top: 18, right: 18, bottom: 32, left: 42 }

function xFor(hour: number): number {
  return PAD.left + (hour / 23) * (W - PAD.left - PAD.right)
}

function yFor(value: number, max: number): number {
  const plot = H - PAD.top - PAD.bottom
  return PAD.top + plot - (value / max) * plot
}

function smoothPath(xs: number[], ys: number[]): string {
  if (!xs.length) return ''
  let d = `M ${xs[0]} ${ys[0]}`
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[i - 1] ?? xs[i]
    const y0 = ys[i - 1] ?? ys[i]
    const x1 = xs[i]
    const y1 = ys[i]
    const x2 = xs[i + 1]
    const y2 = ys[i + 1]
    const x3 = xs[i + 2] ?? x2
    const y3 = ys[i + 2] ?? y2
    d += ` C ${x1 + (x2 - x0) / 6} ${y1 + (y2 - y0) / 6}, ${x2 - (x3 - x1) / 6} ${y2 - (y3 - y1) / 6}, ${x2} ${y2}`
  }
  return d
}

function leftoverPath(points: HourPoint[], max: number): string {
  const chunks: HourPoint[][] = []
  let current: HourPoint[] = []
  for (const point of points) {
    if (point.solarKwh > point.loadKwh + 0.005) {
      current.push(point)
    } else if (current.length) {
      chunks.push(current) image.png
      current = []
    }
  }
  if (current.length) chunks.push(current)

  return chunks
    .map((chunk) => {
      const xs = chunk.map((point) => xFor(point.hour))
      const solarY = chunk.map((point) => yFor(point.solarKwh, max))
      const loadY = chunk.map((point) => yFor(point.loadKwh, max))
      const top = smoothPath(xs, solarY)
      const bottomXs = [...xs].reverse()
      const bottomYs = [...loadY].reverse()
      let d = top
      for (let i = 0; i < bottomXs.length; i += 1) {
        d += i === 0 ? ` L ${bottomXs[i]} ${bottomYs[i]}` : ` L ${bottomXs[i]} ${bottomYs[i]}`
      }
      return `${d} Z`
    })
    .join(' ')
}

/**
 * TypicalDayChart
 * @returns JSX.Element
 *
 * Y values are kWh in that hour of a typical day (same as kW for 1-hour buckets).
 * The leftover fill is where solar sits above household use — the VPP window.
 */
export function TypicalDayChart({ points, activeHour, onSelectHour }: Props) {
  const clipId = useId().replace(/:/g, '')
  const max = Math.max(...points.flatMap((point) => [point.loadKwh, point.solarKwh]), 0.2)
  const xs = points.map((point) => xFor(point.hour))
  const loadPath = smoothPath(xs, points.map((point) => yFor(point.loadKwh, max)))
  const solarPath = smoothPath(xs, points.map((point) => yFor(point.solarKwh, max)))
  const leftover = leftoverPath(points, max)
  const peak = peakLeftoverHour(points)
  const active = points[activeHour] ?? points[0]
  const leftoverCount = leftoverHours(points).length

  const ticks = useMemo(() => [0, 6, 12, 18, 23], [])

  return (
    <figure className="day-chart">
      <div className="day-chart__legend">
        <span>
          <i className="day-chart__swatch day-chart__swatch--load" />
          Household use
        </span>
        <span>
          <i className="day-chart__swatch day-chart__swatch--solar" />
          Solar
        </span>
        <span>
          <i className="day-chart__swatch day-chart__swatch--leftover" />
          Leftover window
        </span>
      </div>
      <svg
        className="day-chart__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Typical day household use compared with solar generation"
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={PAD.left}
              y={PAD.top}
              width={W - PAD.left - PAD.right}
              height={H - PAD.top - PAD.bottom}
            />
          </clipPath>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = yFor(max * frac, max)
          return (
            <g key={frac}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                className="day-chart__grid"
              />
            </g>
          )
        })}

        <g clipPath={`url(#${clipId})`}>
          {leftover ? <path d={leftover} className="day-chart__leftover" /> : null}
          <path d={loadPath} className="day-chart__line day-chart__line--load" />
          <path d={solarPath} className="day-chart__line day-chart__line--solar" />
        </g>

        {peak ? (
          <g className="day-chart__peak">
            <line
              x1={xFor(peak.hour)}
              x2={xFor(peak.hour)}
              y1={PAD.top}
              y2={H - PAD.bottom}
            />
            <circle cx={xFor(peak.hour)} cy={yFor(peak.solarKwh, max)} r="5" />
          </g>
        ) : null}

        <line
          className="day-chart__playhead"
          x1={xFor(active.hour)}
          x2={xFor(active.hour)}
          y1={PAD.top}
          y2={H - PAD.bottom}
        />

        {ticks.map((hour) => (
          <text key={hour} x={xFor(hour)} y={H - 10} className="day-chart__tick">
            {formatHour(hour)}
          </text>
        ))}

        {points.map((point) => (
          <rect
            key={point.hour}
            x={xFor(point.hour) - 12}
            y={PAD.top}
            width="24"
            height={H - PAD.top - PAD.bottom}
            className="day-chart__hit"
            onClick={() => onSelectHour(point.hour)}
          >
            <title>
              {formatHour(point.hour)}: use {point.loadKwh.toFixed(2)} kWh, solar{' '}
              {point.solarKwh.toFixed(2)} kWh
            </title>
          </rect>
        ))}
      </svg>

      <figcaption className="day-chart__readout">
        <strong>{formatHour(active.hour)}</strong>
        {formatKwh(active.loadKwh)} use · {formatKwh(active.solarKwh)} solar
        {active.solarKwh > active.loadKwh
          ? ` · leftover ${formatKwh(active.solarKwh - active.loadKwh)}`
          : ' · drawing from the grid'}
        {leftoverCount ? ` · leftover window ${leftoverCount}h` : ''}
      </figcaption>
    </figure>
  )
}
