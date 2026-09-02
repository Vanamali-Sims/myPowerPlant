/**
 * Energy consumption breakdown — a donut of modelled appliance use.
 */
import { useMemo } from 'react'
import { formatKwh, scaleKwh, type ApplianceLine, type Timeframe } from '../../lib/kpis'

type Props = {
  appliances: ApplianceLine[]
  timeframe: Timeframe
}

/**
 * Warm, on-brand ramp built from the theme tokens (sidebar dark, amber, sage,
 * and their tints) so many appliance slices stay distinguishable without
 * introducing a second palette.
 */
const SLICE_COLORS = [
  '#1B1B1B',
  '#E38B4A',
  '#2F5D46',
  '#C9772F',
  '#8FB09B',
  '#6B6B6B',
  '#E8C9A8',
  '#3A3A3A',
  '#B5A98F',
  '#F0C7A0',
]

const R = 70
const STROKE = 34
const CIRCUMFERENCE = 2 * Math.PI * R

/**
 * ConsumptionDonut
 * @param props.appliances - Modelled appliance lines from the KPI report
 * @param props.timeframe - Scale applied to each slice before drawing
 * @returns JSX.Element
 *
 * Slices are appliance weekly kWh scaled to the timeframe, largest first.
 * Out-of-season lines (0 kWh) are dropped so the ring only shows real use.
 */
export function ConsumptionDonut({ appliances, timeframe }: Props) {
  const slices = useMemo(() => {
    const scaled = appliances
      .map((line) => ({
        id: line.spec.id,
        name: line.spec.name,
        kwh: scaleKwh(line.weeklyKwh, timeframe),
      }))
      .filter((line) => line.kwh > 0)
      .sort((a, b) => b.kwh - a.kwh)
    const total = scaled.reduce((sum, line) => sum + line.kwh, 0)
    const fractionOf = (kwh: number) => (total > 0 ? kwh / total : 0)
    return {
      total,
      items: scaled.map((line, index) => {
        const fraction = fractionOf(line.kwh)
        // Offset is the sum of every earlier slice, computed without mutation.
        const priorFraction = scaled
          .slice(0, index)
          .reduce((sum, earlier) => sum + fractionOf(earlier.kwh), 0)
        return {
          ...line,
          fraction,
          color: SLICE_COLORS[index % SLICE_COLORS.length],
          dash: fraction * CIRCUMFERENCE,
          gap: CIRCUMFERENCE - fraction * CIRCUMFERENCE,
          dashOffset: -priorFraction * CIRCUMFERENCE,
        }
      }),
    }
  }, [appliances, timeframe])

  if (!slices.items.length) {
    return <p className="dashboard-card__lede">No appliance use to break down yet.</p>
  }

  return (
    <div className="donut">
      <svg
        className="donut__svg"
        viewBox="0 0 200 200"
        role="img"
        aria-label="Energy consumption broken down by appliance"
      >
        <g transform="rotate(-90 100 100)">
          <circle cx="100" cy="100" r={R} className="donut__track" strokeWidth={STROKE} />
          {slices.items.map((slice) => (
            <circle
              key={slice.id}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeDasharray={`${slice.dash} ${slice.gap}`}
              strokeDashoffset={slice.dashOffset}
            >
              <title>
                {slice.name}: {formatKwh(slice.kwh)} ({Math.round(slice.fraction * 100)}%)
              </title>
            </circle>
          ))}
        </g>
        <text x="100" y="94" className="donut__total">
          {formatKwh(slices.total)}
        </text>
        <text x="100" y="114" className="donut__total-label">
          total use
        </text>
      </svg>

      <ul className="donut__legend">
        {slices.items.map((slice) => (
          <li key={slice.id}>
            <span className="donut__swatch" style={{ background: slice.color }} />
            <span className="donut__name">{slice.name}</span>
            <span className="donut__value">
              {formatKwh(slice.kwh)} · {Math.round(slice.fraction * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
