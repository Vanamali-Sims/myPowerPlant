/**
 * Predicted solar generation, driven by a public weather forecast.
 */
import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { formatKwh } from '../../lib/kpis'
import {
  fetchSolarForecast,
  pointsForView,
  type ForecastPoint,
  type ForecastView,
  type SolarForecast,
  type SolarInputs,
} from '../../lib/solarForecast'

type Props = {
  inputs: SolarInputs
  /** Which range to show, driven by the shared dashboard timeframe. */
  view: ForecastView
  /** True when the household has no solar, so this is roof potential. */
  isPotential: boolean
  placeLabel: string
}

const VIEW_UNIT: Record<ForecastView, string> = {
  daily: 'per hour, today',
  weekly: 'per day, next 7 days',
  fortnightly: 'per day, next 14 days',
}

const W = 840
const H = 268
const PAD = { top: 28, right: 18, bottom: 34, left: 52 }

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

function viewBoxX(event: ReactPointerEvent<SVGSVGElement>): number {
  const svg = event.currentTarget
  const ctm = svg.getScreenCTM()
  if (!ctm) {
    const rect = svg.getBoundingClientRect()
    return ((event.clientX - rect.left) / rect.width) * W
  }
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  return point.matrixTransform(ctm.inverse()).x
}

/** Round the plot ceiling so Y ticks land on readable kWh steps. */
function yAxis(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 1, ticks: [0, 1] }
  const exp = Math.floor(Math.log10(max))
  const mag = 10 ** exp
  const fraction = max / mag
  const niceFrac = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  const top = niceFrac * mag
  const step = top / 4
  return { top, ticks: [0, step, step * 2, step * 3, top] }
}

function formatAxisTick(value: number): string {
  if (value === 0) return '0'
  if (value >= 10 || Number.isInteger(value)) return String(Number(value.toFixed(1)))
  return value.toFixed(1)
}

/**
 * SolarForecastChart
 * @param props.inputs - Location plus array size and derates for the estimate
 * @param props.isPotential - Whether this is a household array or roof potential
 * @returns JSX.Element
 *
 * Fetches predicted irradiance once per location/array change. The range
 * (hourly day curve vs daily totals over 1–2 weeks) follows the shared filter.
 * Point kWh follows the pointer as a tooltip. Peak stays marked on the line.
 */
export function SolarForecastChart({ inputs, view, isPotential, placeLabel }: Props) {
  const [forecast, setForecast] = useState<SolarForecast | null>(null)
  const [error, setError] = useState('')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number; flip: boolean } | null>(null)

  const { lat, lon, systemKw, orientationFactor, performanceRatio } = inputs

  useEffect(() => {
    let cancelled = false
    fetchSolarForecast({ lat, lon, systemKw, orientationFactor, performanceRatio })
      .then((result) => {
        if (cancelled) return
        setForecast(result)
        setError('')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setForecast(null)
        setError(err instanceof Error ? err.message : 'Could not load the solar forecast.')
      })
    return () => {
      cancelled = true
    }
  }, [lat, lon, systemKw, orientationFactor, performanceRatio])

  // Loading is derived: no forecast yet and nothing has errored.
  const loading = forecast === null && !error

  const points: ForecastPoint[] = useMemo(
    () => (forecast ? pointsForView(forecast, view) : []),
    [forecast, view],
  )

  const geometry = useMemo(() => {
    if (points.length < 2) return null
    const { top, ticks } = yAxis(Math.max(...points.map((point) => point.kwh), 0.1))
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const xFor = (index: number) => PAD.left + (index / (points.length - 1)) * plotW
    const yFor = (value: number) => PAD.top + plotH - (value / top) * plotH
    const xs = points.map((_point, index) => xFor(index))
    const ys = points.map((point) => yFor(point.kwh))
    const line = smoothPath(xs, ys)
    const area = `${line} L ${xs[xs.length - 1]} ${PAD.top + plotH} L ${xs[0]} ${PAD.top + plotH} Z`
    return { top, ticks, xs, ys, line, area, plotH, plotW }
  }, [points])

  const peak = points.reduce(
    (best, point) => (point.kwh > best.kwh ? point : best),
    { label: '', kwh: 0 },
  )

  // Label only a handful of x ticks so the axis stays readable.
  const tickEvery = points.length > 8 ? Math.ceil(points.length / 7) : 1
  const hover = hoverIndex !== null ? points[hoverIndex] : null
  const hoverX = hoverIndex !== null && geometry ? geometry.xs[hoverIndex] : null
  const isPeakHover = Boolean(
    hover && peak.label && hover.label === peak.label && hover.kwh === peak.kwh,
  )

  const sourceNote = [
    isPotential ? 'Potential for a typical roof.' : '',
    `Estimated from Open-Meteo predicted sunlight for ${placeLabel || 'your area'}, your panel size, and roof direction — a forecast, not a meter reading.`,
  ]
    .filter(Boolean)
    .join(' ')

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!geometry) return
    const x = viewBoxX(event)
    let nearest = 0
    let best = Infinity
    geometry.xs.forEach((px, index) => {
      const distance = Math.abs(px - x)
      if (distance < best) {
        best = distance
        nearest = index
      }
    })
    const plot = event.currentTarget.parentElement
    const rect = plot?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()
    setHoverIndex(nearest)
    setPointer({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      flip: event.clientX - rect.left > rect.width * 0.62,
    })
  }

  function clearHover() {
    setHoverIndex(null)
    setPointer(null)
  }

  return (
    <figure className="forecast">
      {loading ? (
        <p className="dashboard-card__lede">Loading the solar forecast…</p>
      ) : error ? (
        <p className="dashboard-card__lede">{error}</p>
      ) : geometry ? (
        <>
          <div className="forecast__plot">
            <svg
              className="forecast__svg"
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`Predicted solar generation, ${VIEW_UNIT[view]}. Hover the line for each point.`}
              onPointerMove={handlePointerMove}
              onPointerLeave={clearHover}
            >
              {geometry.ticks.map((tick) => {
                const y = PAD.top + geometry.plotH - (tick / geometry.top) * geometry.plotH
                return (
                  <g key={tick}>
                    <line
                      x1={PAD.left}
                      x2={W - PAD.right}
                      y1={y}
                      y2={y}
                      className="forecast__grid"
                    />
                    <text x={PAD.left - 8} y={y + 4} className="forecast__y-tick">
                      {formatAxisTick(tick)}
                    </text>
                  </g>
                )
              })}
              <line
                x1={PAD.left}
                x2={PAD.left}
                y1={PAD.top}
                y2={PAD.top + geometry.plotH}
                className="forecast__axis"
              />
              <text x={PAD.left - 8} y={PAD.top - 10} className="forecast__y-unit">
                kWh
              </text>

              <g key={view} className="forecast__draw">
                <path d={geometry.area} className="forecast__area" />
                <path d={geometry.line} className="forecast__line" pathLength={1} />
              </g>

              {hoverX !== null ? (
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1={PAD.top}
                  y2={PAD.top + geometry.plotH}
                  className="forecast__guide"
                />
              ) : null}

              {points.map((point, index) => (
                <g key={`${point.label}-${index}`}>
                  <circle
                    cx={geometry.xs[index]}
                    cy={geometry.ys[index]}
                    r={hoverIndex === index ? 5 : 2.5}
                    className={
                      point.label === peak.label && point.kwh === peak.kwh
                        ? 'forecast__dot forecast__dot--peak'
                        : 'forecast__dot'
                    }
                  />
                  {index % tickEvery === 0 ? (
                    <text x={geometry.xs[index]} y={H - 12} className="forecast__tick">
                      {point.label}
                    </text>
                  ) : null}
                </g>
              ))}
              <rect
                className="forecast__hit"
                x={PAD.left}
                y={PAD.top}
                width={W - PAD.left - PAD.right}
                height={geometry.plotH}
              />
            </svg>
            {hover && pointer ? (
              <div
                className={`forecast__tooltip${isPeakHover ? ' is-peak' : ''}${pointer.flip ? ' is-flip' : ''}`}
                style={{ left: pointer.x, top: pointer.y }}
                role="status"
              >
                {isPeakHover ? 'Peak · ' : ''}
                {hover.label} · {formatKwh(hover.kwh)}
              </div>
            ) : null}
          </div>
          <p className="forecast__source">{sourceNote}</p>
        </>
      ) : (
        <p className="dashboard-card__lede">Not enough forecast data to draw a line yet.</p>
      )}
    </figure>
  )
}
