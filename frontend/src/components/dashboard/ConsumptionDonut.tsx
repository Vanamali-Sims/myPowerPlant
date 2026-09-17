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

const CX = 100
const CY = 100
const INNER = 54
const OUTER = 86
const OUTER_ACTIVE = 90

/**
 * ringSector
 * @param inner - Hole radius
 * @param outer - Outer radius
 * @param start - Start angle in radians (0 = 3 o’clock, clockwise)
 * @param end - End angle in radians
 * @returns SVG path for an open annular sector (not a closed circle stroke)
 *
 * Stroked `<circle>` dashes close at 12 o’clock and SVG miter-joins that seam,
 * which draws a hook into the hole. A filled sector path has a clean inner edge.
 */
function ringSector(inner: number, outer: number, start: number, end: number): string {
  const sweep = Math.min(Math.max(end - start, 0), Math.PI * 2 - 1e-6)
  if (sweep <= 0) return ''
  const endA = start + sweep
  const large = sweep > Math.PI ? 1 : 0
  const at = (radius: number, angle: number) => [
    CX + radius * Math.cos(angle),
    CY + radius * Math.sin(angle),
  ]
  const [ox0, oy0] = at(outer, start)
  const [ox1, oy1] = at(outer, endA)
  const [ix1, iy1] = at(inner, endA)
  const [ix0, iy0] = at(inner, start)
  return [
    `M ${ox0} ${oy0}`,
    `A ${outer} ${outer} 0 ${large} 1 ${ox1} ${oy1}`,
    `L ${ix1} ${iy1}`,
    `A ${inner} ${inner} 0 ${large} 0 ${ix0} ${iy0}`,
    'Z',
  ].join(' ')
}

function fullRing(inner: number, outer: number): string {
  return `${ringSector(inner, outer, -Math.PI / 2, Math.PI / 2)} ${ringSector(inner, outer, Math.PI / 2, (Math.PI * 3) / 2)}`
}

/**
 * ConsumptionDonut
 * @param props.appliances - Modelled appliance lines from the KPI report
 * @param props.timeframe - Scale applied to each slice before drawing
 * @returns JSX.Element
 *
 * Slices are appliance weekly kWh scaled to the timeframe, largest first.
 * Out-of-season lines (0 kWh) are dropped, and everything past the top few is
 * folded into a single "Other" slice so the ring and legend stay readable.
 * Hover a slice or legend row to show that appliance’s kWh and share in the
 * centre; the legend is names only.
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
        const priorFraction = grouped
          .slice(0, index)
          .reduce((sum, earlier) => sum + fractionOf(earlier.kwh), 0)
        // Start at 12 o’clock and sweep clockwise.
        const start = -Math.PI / 2 + priorFraction * Math.PI * 2
        const end = start + fraction * Math.PI * 2 + 0.006
        return {
          ...line,
          fraction,
          color: SLICE_COLORS[index % SLICE_COLORS.length],
          start,
          end,
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
          <path className="donut__track" d={fullRing(INNER, OUTER)} />
          <g key={timeframe} className="donut__draw">
            {slices.items.map((slice) => {
              const isActive = activeId === slice.id
              const isDim = activeId !== null && !isActive
              return (
                <path
                  key={slice.id}
                  className={`donut__slice${isActive ? ' is-active' : ''}${isDim ? ' is-dim' : ''}`}
                  d={ringSector(INNER, isActive ? OUTER_ACTIVE : OUTER, slice.start, slice.end)}
                  fill={slice.color}
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
          <text x="100" y="96" className="donut__total">
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
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
