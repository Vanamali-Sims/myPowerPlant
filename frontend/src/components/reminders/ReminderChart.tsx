/**
 * Predicted solar generation for the Reminders page: a smooth line with the
 * recommended days marked as columns and the qualifying target as a dashed line.
 *
 * Plain SVG so it themes with the page tokens and renders in tests.
 */
import { formatKwh } from '../../lib/kpis'
import type { ForecastPoint } from '../../lib/solarForecast'

type Props = {
  points: ForecastPoint[]
  /** kWh a day must clear (or fall under) to be recommended; null hides the line. */
  target: number | null
  /** Dates (YYYY-MM-DD) of the recommended days. */
  recommended: Set<string>
  /** True for today's hourly curve: thinner labels, no columns or target. */
  hourly: boolean
}

const WIDTH = 640
const HEIGHT = 300
const PAD = { top: 34, right: 18, bottom: 36, left: 30 }

function niceStep(max: number): number {
  const raw = max / 3
  const magnitude = 10 ** Math.floor(Math.log10(raw || 1))
  const scaled = raw / magnitude
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10
  return nice * magnitude
}

/** Catmull-Rom curve through the points, kept inside the plot so it never dips below zero. */
function smoothPath(xy: [number, number][], floor: number, ceiling: number): string {
  if (xy.length < 2) return xy.length ? `M${xy[0][0]},${xy[0][1]}` : ''
  const clampY = (y: number) => Math.min(floor, Math.max(ceiling, y))
  let d = `M${xy[0][0]},${xy[0][1]}`
  for (let i = 0; i < xy.length - 1; i += 1) {
    const p0 = xy[i - 1] ?? xy[i]
    const p1 = xy[i]
    const p2 = xy[i + 1]
    const p3 = xy[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = clampY(p1[1] + (p2[1] - p0[1]) / 6)
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = clampY(p2[1] - (p3[1] - p1[1]) / 6)
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

function short(kwh: number): string {
  return kwh.toFixed(1)
}

/**
 * ReminderChart
 * @param props.points - Forecast points for the chosen range
 * @param props.target - Qualifying line for the event type, or null
 * @param props.recommended - Days to highlight
 * @returns An SVG chart with an accessible summary
 */
export function ReminderChart({ points, target, recommended, hourly }: Props) {
  if (!points.length) return null
  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const bottom = PAD.top + plotH
  const highest = Math.max(...points.map((point) => point.kwh), target ?? 0, 0.1)
  const step = niceStep(highest * 1.1)
  const yMax = Math.ceil((highest * 1.1) / step) * step
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, index) => index * step)
  const band = plotW / points.length
  const x = (index: number) => PAD.left + band * (index + 0.5)
  const y = (kwh: number) => bottom - (kwh / yMax) * plotH
  const xy = points.map((point, index) => [x(index), y(point.kwh)] as [number, number])
  const line = smoothPath(xy, bottom, PAD.top)
  const area = `${line} L${xy[xy.length - 1][0]},${bottom} L${xy[0][0]},${bottom} Z`
  const labelEvery = hourly ? Math.ceil(points.length / 8) : 1
  const showMarks = !hourly
  const summary = points
    .map((point) => `${point.label} ${formatKwh(point.kwh)}${recommended.has(point.date) && showMarks ? ', recommended' : ''}`)
    .join('; ')

  return (
    <svg
      className="reminder-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Predicted solar generation. ${summary}.${target !== null && showMarks ? ` Target ${short(target)} kWh.` : ''}`}
    >
      <defs>
        <linearGradient id="reminder-chart-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" className="reminder-chart__area-top" />
          <stop offset="100%" className="reminder-chart__area-bottom" />
        </linearGradient>
        <linearGradient id="reminder-chart-band" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" className="reminder-chart__band-top" />
          <stop offset="100%" className="reminder-chart__band-bottom" />
        </linearGradient>
      </defs>

      <text className="reminder-chart__unit" x={4} y={PAD.top - 18}>
        {hourly ? 'kWh/hour' : 'kWh/day'}
      </text>

      {ticks.map((tick) => (
        <g key={tick}>
          <line className="reminder-chart__grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
          <text className="reminder-chart__tick" x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}

      {showMarks
        ? points.map((point, index) =>
            recommended.has(point.date) ? (
              <rect
                key={`band-${point.date}`}
                className="reminder-chart__band"
                x={x(index) - band * 0.3}
                y={PAD.top - 12}
                width={band * 0.6}
                height={bottom - PAD.top + 12}
                rx={8}
              />
            ) : null,
          )
        : null}

      <path className="reminder-chart__area" d={area} fill="url(#reminder-chart-area)" />
      <path className="reminder-chart__line" d={line} />

      {target !== null && showMarks ? (
        <g>
          <line className="reminder-chart__target" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(target)} y2={y(target)} />
          <text className="reminder-chart__target-label" x={WIDTH - PAD.right} y={y(target) - 6} textAnchor="end">
            Target {short(target)}
          </text>
        </g>
      ) : null}

      {showMarks
        ? points.map((point, index) => {
            const marked = recommended.has(point.date)
            return (
              <g key={`dot-${point.date}`}>
                <circle
                  className={`reminder-chart__dot${marked ? ' is-recommended' : ''}`}
                  cx={x(index)}
                  cy={y(point.kwh)}
                  r={marked ? 6 : 3.5}
                />
                <text
                  className={`reminder-chart__value${marked ? ' is-recommended' : ''}`}
                  x={x(index)}
                  y={marked ? y(point.kwh) - 14 : y(point.kwh) + 20}
                  textAnchor="middle"
                >
                  {short(point.kwh)}
                </text>
              </g>
            )
          })
        : null}

      {points.map((point, index) =>
        index % labelEvery === 0 ? (
          <text
            key={`label-${point.date}-${point.label}`}
            className={`reminder-chart__label${showMarks && recommended.has(point.date) ? ' is-recommended' : ''}`}
            x={x(index)}
            y={HEIGHT - 10}
            textAnchor="middle"
          >
            {point.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}
