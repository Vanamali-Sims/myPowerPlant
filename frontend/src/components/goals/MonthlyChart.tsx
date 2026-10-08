/**
 * Monthly progress graph: a bar per month and a running total towards the goal.
 *
 * Recharts draws the chart and its built-in keyboard layer (arrow keys move
 * between months once the chart has focus). A row of month buttons offers the
 * same choice with Tab, and the panel below always shows the exact figures,
 * so nothing depends on hovering. The history table under the graph is the
 * full text equivalent.
 */
import { useEffect, useId, useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  useActiveTooltipLabel,
  type LabelProps,
} from 'recharts'
import { GOAL_LABELS } from '../../constants/goals'
import {
  formatGoalValue,
  formatMonthLabel,
  formatPercent,
  progressPercent,
} from '../../lib/goals/goalFormat'
import { niceTop } from '../../lib/goals/chartScale'
import { historyRows } from '../../lib/goals/history'
import { useReducedMotion } from '../../lib/useReducedMotion'
import type { GoalEntry, GoalKind, MonthRecord } from '../../types/goals'
import { Button } from '../ui/Button'

type Props = {
  months: MonthRecord[]
  goals: Record<GoalKind, GoalEntry>
  onGoToUpload: () => void
}

type Point = {
  month: string
  short: string
  value: number
  cumulative: number
  partial: boolean
  daysCounted: number
  daysInMonth: number
}

const SHORT_MONTH = new Intl.DateTimeFormat('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' })

function shortMonth(month: string): string {
  return SHORT_MONTH.format(new Date(`${month}-01T00:00:00Z`))
}

function buildPoints(months: MonthRecord[], kind: GoalKind): Point[] {
  let running = 0
  return historyRows(months).map((row) => {
    const value = kind === 'savings' ? row.savingsAud : row.carbonKg
    running += value
    return {
      month: row.month,
      short: shortMonth(row.month),
      value,
      cumulative: running,
      partial: row.partial,
      daysCounted: row.daysCounted,
      daysInMonth: row.daysInMonth,
    }
  })
}

/** Reports the month Recharts' keyboard layer or pointer is on, while the chart has focus. */
function ActiveMonthSync({ onActive, enabled }: { onActive: (short: string) => void; enabled: boolean }) {
  const label = useActiveTooltipLabel()
  useEffect(() => {
    if (enabled && typeof label === 'string') onActive(label)
  }, [enabled, label, onActive])
  return null
}

function PartialLabel({ label, points }: { label: LabelProps; points: Point[] }) {
  const { x = 0, y = 0, width = 0, index = -1 } = label
  if (!points[index]?.partial) return null
  return (
    <text
      className="goals-chart__partial-label"
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 6}
      textAnchor="middle"
    >
      Partial
    </text>
  )
}

/**
 * MonthlyChart
 * @param props.months - Stored monthly records
 * @param props.goals - Both goals, for the goal line and percentages
 * @returns Toggle, chart, month buttons, and a visible figures panel
 */
export function MonthlyChart({ months, goals, onGoToUpload }: Props) {
  const reduced = useReducedMotion()
  const panelId = useId()
  const [kind, setKind] = useState<GoalKind>('savings')
  const points = useMemo(() => buildPoints(months, kind), [months, kind])
  const [selected, setSelected] = useState<string | null>(null)
  const [chartFocused, setChartFocused] = useState(false)
  const target = goals[kind].target
  const current = points.find((point) => point.month === selected) ?? points[points.length - 1]
  const top = niceTop(Math.max(target, ...points.map((point) => point.cumulative)))

  if (!points.length) {
    return (
      <section className="dashboard-card goals-chart" aria-labelledby="goals-chart-title">
        <h2 id="goals-chart-title">Monthly progress</h2>
        <div className="goals-history__empty">
          <p>Your monthly graph appears after your first confirmed upload.</p>
          <Button variant="secondary" onClick={onGoToUpload}>
            Go to upload
          </Button>
        </div>
      </section>
    )
  }

  const valueText = (value: number) => formatGoalValue(kind, value)

  return (
    <section className="dashboard-card goals-chart" aria-labelledby="goals-chart-title">
      <div className="goals-chart__head">
        <h2 id="goals-chart-title">Monthly progress</h2>
        <div className="goals-chart__toggle" role="group" aria-label="Show the graph for">
          {(['savings', 'carbon'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`goals-chart__toggle-option${kind === option ? ' is-selected' : ''}`}
              aria-pressed={kind === option}
              onClick={() => setKind(option)}
            >
              {option === 'savings' ? 'Savings' : 'Carbon'}
            </button>
          ))}
        </div>
      </div>
      <p className="dashboard-card__lede">
        Bars show each month. The line shows your running total towards your{' '}
        {GOAL_LABELS[kind].title.toLowerCase()}. Hatched bars marked Partial are months with
        missing days. All figures are estimates.
      </p>

      <svg className="goals-chart__defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <pattern id="goals-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect className="goals-chart__hatch-bg" width="6" height="6" />
            <line className="goals-chart__hatch-line" x1="0" y1="0" x2="0" y2="6" />
          </pattern>
        </defs>
      </svg>

      <div
        className={`goals-chart__plot goals-chart__plot--${kind}`}
        aria-describedby={panelId}
        onFocus={() => setChartFocused(true)}
        onBlur={() => setChartFocused(false)}
      >
        <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 640, height: 280 }}>
          <ComposedChart
            data={points}
            margin={{ top: 22, right: 8, bottom: 4, left: 4 }}
            title={`Monthly ${kind === 'savings' ? 'savings' : 'carbon'} and running total`}
            desc="The same figures are listed in the month-by-month table below."
            onClick={(state) => {
              const index = Number(state?.activeTooltipIndex)
              if (Number.isInteger(index) && points[index]) setSelected(points[index].month)
            }}
          >
            <CartesianGrid vertical={false} className="goals-chart__grid" />
            <XAxis dataKey="short" tickLine={false} className="goals-chart__axis" />
            <YAxis
              domain={[0, top]}
              tickCount={5}
              tickFormatter={(value: number) => valueText(value)}
              width={78}
              tickLine={false}
              className="goals-chart__axis"
            />
            <Tooltip
              cursor={{ className: 'goals-chart__cursor' }}
              content={({ active, label }) =>
                active && label ? <span className="goals-chart__tooltip">{String(label)}</span> : null
              }
            />
            <Bar
              dataKey="value"
              name="Month"
              isAnimationActive={!reduced}
              label={(props: LabelProps) => <PartialLabel label={props} points={points} />}
            >
              {points.map((point) => (
                <Cell
                  key={point.month}
                  className={`goals-chart__bar${point.partial ? ' is-partial' : ''}`}
                />
              ))}
            </Bar>
            <Line
              dataKey="cumulative"
              name="Running total"
              type="monotone"
              className="goals-chart__line"
              dot={{ className: 'goals-chart__dot' }}
              isAnimationActive={!reduced}
            />
            <ReferenceLine
              y={target}
              className="goals-chart__goal"
              label={{ value: `Goal ${valueText(target)}`, position: 'insideTopRight', className: 'goals-chart__goal-label' }}
            />
            <ActiveMonthSync
              enabled={chartFocused}
              onActive={(short) => {
                const match = points.find((point) => point.short === short)
                if (match) setSelected(match.month)
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="goals-chart__months" role="group" aria-label="Choose a month">
        {points.map((point) => (
          <button
            key={point.month}
            type="button"
            className={`goals-chart__month${current?.month === point.month ? ' is-selected' : ''}`}
            aria-pressed={current?.month === point.month}
            aria-controls={panelId}
            onClick={() => setSelected(point.month)}
          >
            {point.short}
            {point.partial ? ' (Partial)' : ''}
          </button>
        ))}
      </div>

      {current ? (
        <div id={panelId} className="goals-chart__panel" aria-live="polite">
          <p className="goals-chart__panel-title">
            {formatMonthLabel(current.month)}
            {current.partial ? `: Partial, ${current.daysCounted} of ${current.daysInMonth} days` : ''}
          </p>
          <dl>
            <div>
              <dt>{kind === 'savings' ? 'Estimated savings this month' : 'Estimated carbon avoided this month'}</dt>
              <dd>{valueText(current.value)}</dd>
            </div>
            <div>
              <dt>Running total</dt>
              <dd>
                {valueText(current.cumulative)} of {valueText(target)},{' '}
                {formatPercent(progressPercent(current.cumulative, target))}
              </dd>
            </div>
          </dl>
          <span className="kpi-badge kpi-badge--estimate">Estimate</span>
        </div>
      ) : null}
    </section>
  )
}
