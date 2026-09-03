/**
 * Predicted solar generation, driven by a public weather forecast.
 */
import { useEffect, useMemo, useState } from 'react'
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
const H = 260
const PAD = { top: 18, right: 18, bottom: 34, left: 44 }

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

/**
 * SolarForecastChart
 * @param props.inputs - Location plus array size and derates for the estimate
 * @param props.isPotential - Whether this is a household array or roof potential
 * @returns JSX.Element
 *
 * Fetches predicted irradiance once per location/array change. The range
 * (hourly day curve vs daily totals over 1–2 weeks) follows the shared filter.
 */
export function SolarForecastChart({ inputs, view, isPotential, placeLabel }: Props) {
  const [forecast, setForecast] = useState<SolarForecast | null>(null)
  const [error, setError] = useState('')

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
    const max = Math.max(...points.map((point) => point.kwh), 0.1)
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const xFor = (index: number) => PAD.left + (index / (points.length - 1)) * plotW
    const yFor = (value: number) => PAD.top + plotH - (value / max) * plotH
    const xs = points.map((_point, index) => xFor(index))
    const ys = points.map((point) => yFor(point.kwh))
    const line = smoothPath(xs, ys)
    const area = `${line} L ${xs[xs.length - 1]} ${PAD.top + plotH} L ${xs[0]} ${PAD.top + plotH} Z`
    return { max, xs, ys, line, area, plotH }
  }, [points])

  const total = points.reduce((sum, point) => sum + point.kwh, 0)
  const peak = points.reduce(
    (best, point) => (point.kwh > best.kwh ? point : best),
    { label: '', kwh: 0 },
  )

  // Label only a handful of x ticks so the axis stays readable.
  const tickEvery = points.length > 8 ? Math.ceil(points.length / 7) : 1

  return (
    <figure className="forecast">
      {loading ? (
        <p className="dashboard-card__lede">Loading the solar forecast…</p>
      ) : error ? (
        <p className="dashboard-card__lede">{error}</p>
      ) : geometry ? (
        <>
          <svg
            className="forecast__svg"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Predicted solar generation, ${VIEW_UNIT[view]}`}
          >
            {[0.25, 0.5, 0.75, 1].map((frac) => {
              const y = PAD.top + geometry.plotH - frac * geometry.plotH
              return (
                <line
                  key={frac}
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y}
                  y2={y}
                  className="forecast__grid"
                />
              )
            })}

            <path d={geometry.area} className="forecast__area" />
            <path d={geometry.line} className="forecast__line" />

            {points.map((point, index) => (
              <g key={`${point.label}-${index}`}>
                <circle
                  cx={geometry.xs[index]}
                  cy={geometry.ys[index]}
                  r="2.5"
                  className={
                    point.label === peak.label && point.kwh === peak.kwh
                      ? 'forecast__dot forecast__dot--peak'
                      : 'forecast__dot'
                  }
                >
                  <title>
                    {point.label}: {formatKwh(point.kwh)}
                  </title>
                </circle>
                {index % tickEvery === 0 ? (
                  <text x={geometry.xs[index]} y={H - 12} className="forecast__tick">
                    {point.label}
                  </text>
                ) : null}
              </g>
            ))}
          </svg>

          <figcaption className="forecast__readout">
            <span>
              <strong>{formatKwh(total)}</strong> forecast {view === 'daily' ? 'today' : `over ${points.length} days`}
            </span>
            <span className="forecast__peak">
              Peak {peak.label ? `${peak.label} · ` : ''}
              {formatKwh(peak.kwh)}
            </span>
          </figcaption>
          <p className="forecast__source">
            {isPotential ? 'Potential for a typical roof. ' : ''}
            Estimated from Open-Meteo predicted sunlight for {placeLabel || 'your area'}, your panel
            size, and roof direction — a forecast, not a meter reading.
          </p>
        </>
      ) : (
        <p className="dashboard-card__lede">Not enough forecast data to draw a line yet.</p>
      )}
    </figure>
  )
}
