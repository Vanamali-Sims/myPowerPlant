/**
 * Energy consumption breakdown — a donut of modelled appliance use.
 */
import { useMemo, useState } from 'react'
import { formatKwh, scaleKwh, type ApplianceLine, type Timeframe } from '../../lib/kpis'

type Props = {
  appliances: ApplianceLine[]
  timeframe: Timeframe
}

/** Alternate eucalypt / terracotta families, descending share order. */
const SLICE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]

/** Show at most this many named slices; the rest fold into "Other". */
const MAX_SLICES = 6

const R = 70
const STROKE = 30
const CIRCUMFERENCE = 2 * Math.PI * R

/**
 * ConsumptionDonut
 * @param props.appliances - Modelled appliance lines from the KPI report
 * @param props.timeframe - Scale applied to each slice before drawing
 * @returns JSX.Element
 *
 * Slices are appliance weekly kWh scaled to the timeframe, largest first.
 * Out-of-season lines (0 kWh) are dropped, and everything past the top few is
 * folded into a single "Other" slice so the ring and legend stay readable.
 * kWh and share sit on hover, not beside the legend.
 */
export function ConsumptionDonut({ appliances, timeframe }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const slices = useMemo(() => {
    const scaled = appliances
      .map((line) => ({
        id: line.spec.id,
        name: line.spec.name,
        kwh: scaleKwh(line.weeklyKwh, timeframe),
      }))
      .filter((line) => line.kwh > 0)
      .sort((a, b) => b.kwh - a.kwh)

    // Keep the top slices named; fold the long tail into one "Other" slice.
    const grouped =
      scaled.length > MAX_SLICES
        ? [
            ...scaled.slice(0, MAX_SLICES - 1),
            {
              id: 'other',
              name: 'Other',
              kwh: scaled.slice(MAX_SLICES - 1).reduce((sum, line) => sum + line.kwh, 0),
            },
          ]
        : scaled

    const total = grouped.reduce((sum, line) => sum + line.kwh, 0)
    const fractionOf = (kwh: number) => (total > 0 ? kwh / total : 0)
    return {
      total,
      items: grouped.map((line, index) => {
        const fraction = fractionOf(line.kwh)
        // Offset is the sum of every earlier slice, computed without mutation.
        const priorFraction = grouped
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

  const active = slices.items.find((slice) => slice.id === activeId) ?? null

  if (!slices.items.length) {
    return <p className="dashboard-card__lede">No appliance use to break down yet.</p>
  }

  return (
    <div className="donut">
      <div className="donut__plot">
        <svg
          className="donut__svg"
          viewBox="0 0 200 200"
          role="img"
          aria-label="Energy consumption broken down by appliance. Hover or focus a slice for kWh and share."
        >
          <g transform="rotate(-90 100 100)">
            <circle cx="100" cy="100" r={R} className="donut__track" strokeWidth={STROKE} />
            {slices.items.map((slice) => {
              const isActive = activeId === slice.id
              const isDim = activeId !== null && !isActive
              return (
                <circle
                  key={slice.id}
                  className={`donut__slice${isActive ? ' is-active' : ''}${isDim ? ' is-dim' : ''}`}
                  cx="100"
                  cy="100"
                  r={R}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isActive ? STROKE + 4 : STROKE}
                  strokeDasharray={`${slice.dash} ${slice.gap}`}
                  strokeDashoffset={slice.dashOffset}
                  tabIndex={0}
                  role="img"
                  aria-label={`${slice.name}: ${formatKwh(slice.kwh)}, ${Math.round(slice.fraction * 100)} percent`}
                  onPointerEnter={() => setActiveId(slice.id)}
                  onPointerLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(slice.id)}
                  onBlur={() => setActiveId(null)}
                />
              )
            })}
          </g>
          <text x="100" y="94" className="donut__total">
            {formatKwh(active ? active.kwh : slices.total)}
          </text>
          <text x="100" y="114" className="donut__total-label">
            {active ? `${Math.round(active.fraction * 100)}%` : 'total use'}
          </text>
        </svg>
      </div>

      <ul className="donut__legend">
        {slices.items.map((slice) => (
          <li key={slice.id}>
            <button
              type="button"
              className={`donut__legend-item${activeId === slice.id ? ' is-active' : ''}`}
              onPointerEnter={() => setActiveId(slice.id)}
              onPointerLeave={() => setActiveId(null)}
              onFocus={() => setActiveId(slice.id)}
              onBlur={() => setActiveId(null)}
              aria-label={`${slice.name}: ${formatKwh(slice.kwh)}, ${Math.round(slice.fraction * 100)} percent`}
            >
              <span className="donut__swatch" style={{ background: slice.color }} />
              <span className="donut__name">{slice.name}</span>
              {activeId === slice.id ? (
                <span className="donut__value">
                  <strong>{formatKwh(slice.kwh)}</strong>
                  <span className="donut__pct">{Math.round(slice.fraction * 100)}%</span>
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
