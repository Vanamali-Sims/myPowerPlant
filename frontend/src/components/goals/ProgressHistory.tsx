/**
 * Progress history: a month-by-month bar chart of each goal's share, and the
 * table of every counted month with a running total. Can be hidden.
 */
import { useId, useState } from 'react'
import { formatDayLabel, formatGoalAud, formatGoalKgAmount } from '../../lib/goals/goalFormat'
import { historyRows, lastCountedDate } from '../../lib/goals/history'
import type { GoalEntry, GoalKind, MonthRecord } from '../../types/goals'
import { Button } from '../ui/Button'
import { ChevronIcon } from '../ui/icons'

type Props = {
  months: MonthRecord[]
  goals: Record<GoalKind, GoalEntry>
  onUpload: () => void
  onRemove: (month: string) => void
}

function shortMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-AU', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function percentText(value: number): string {
  return `${value.toFixed(1)}%`
}

const CHART = { height: 240, top: 30, bottom: 40, left: 44, right: 16, bar: 56, gap: 8, minGroup: 150 }

/** Grouped bars: each month's savings and carbon as a share of the goal; partial months hatched. */
function HistoryBars({ months, goals }: { months: MonthRecord[]; goals: Record<GoalKind, GoalEntry> }) {
  const rows = historyRows(months)
  const share = (value: number, target: number) => (target > 0 ? (value / target) * 100 : 0)
  const highest = Math.max(
    10,
    ...rows.map((row) => Math.max(share(row.savingsAud, goals.savings.target), share(row.carbonKg, goals.carbon.target))),
  )
  const step = highest > 60 ? 20 : 10
  const yMax = Math.ceil((highest * 1.15) / step) * step
  const width = Math.max(760, CHART.left + CHART.right + rows.length * CHART.minGroup)
  const group = (width - CHART.left - CHART.right) / rows.length
  const plot = CHART.height - CHART.top - CHART.bottom
  const y = (percent: number) => CHART.top + plot - (percent / yMax) * plot
  const ticks = Array.from({ length: yMax / step + 1 }, (_, index) => index * step)

  return (
    <div className="history-bars">
      <svg
        viewBox={`0 0 ${width} ${CHART.height}`}
        style={{ minWidth: rows.length > 4 ? width * 0.8 : undefined }}
        role="img"
        aria-label={`Share of each goal by month. ${rows
          .map(
            (row) =>
              `${shortMonth(row.month)}${row.partial ? ' partial' : ''}: savings ${percentText(
                share(row.savingsAud, goals.savings.target),
              )}, carbon ${percentText(share(row.carbonKg, goals.carbon.target))}`,
          )
          .join('; ')}.`}
      >
        <defs>
          <pattern id="history-hatch-savings" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" className="history-bars__hatch-bg history-bars__hatch-bg--savings" />
            <line x1="0" y1="0" x2="0" y2="8" className="history-bars__hatch history-bars__hatch--savings" />
          </pattern>
          <pattern id="history-hatch-carbon" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" className="history-bars__hatch-bg history-bars__hatch-bg--carbon" />
            <line x1="0" y1="0" x2="0" y2="8" className="history-bars__hatch history-bars__hatch--carbon" />
          </pattern>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="history-bars__grid" x1={CHART.left} x2={width - CHART.right} y1={y(tick)} y2={y(tick)} />
            <text className="history-bars__tick" x={CHART.left - 10} y={y(tick) + 4} textAnchor="end">
              {tick}%
            </text>
          </g>
        ))}
        {rows.map((row, index) => {
          const centre = CHART.left + group * (index + 0.5)
          const bars: { kind: GoalKind; percent: number; value: string; x: number }[] = [
            {
              kind: 'savings',
              percent: share(row.savingsAud, goals.savings.target),
              value: formatGoalAud(row.savingsAud),
              x: centre - CHART.gap / 2 - CHART.bar,
            },
            {
              kind: 'carbon',
              percent: share(row.carbonKg, goals.carbon.target),
              value: formatGoalKgAmount(row.carbonKg),
              x: centre + CHART.gap / 2,
            },
          ]
          return (
            <g key={row.month}>
              {bars.map((bar) => {
                const top = y(Math.min(bar.percent, yMax))
                return (
                  <g key={bar.kind}>
                    <rect
                      className={`history-bars__bar history-bars__bar--${bar.kind}${row.partial ? ' is-partial' : ''}`}
                      x={bar.x}
                      y={top}
                      width={CHART.bar}
                      height={Math.max(0, CHART.top + plot - top)}
                      rx={4}
                      fill={row.partial ? `url(#history-hatch-${bar.kind})` : undefined}
                    />
                    <text className="history-bars__amount" x={bar.x + CHART.bar / 2} y={top - 8} textAnchor="middle">
                      {bar.value}
                    </text>
                  </g>
                )
              })}
              <text className="history-bars__month" x={centre} y={CHART.height - 12} textAnchor="middle">
                {shortMonth(row.month)}
                {row.partial ? ' · Partial' : ''}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/**
 * ProgressHistory
 * @param props.months - Stored monthly records
 * @param props.goals - Both goals, for each month's share
 * @returns Summary line, Hide toggle, bar chart, and the month table
 */
export function ProgressHistory({ months, goals, onUpload, onRemove }: Props) {
  const panelId = useId()
  const [open, setOpen] = useState(true)
  const rows = historyRows(months)
  const last = lastCountedDate(months)
  // Running totals after each month, oldest first.
  const running = rows.reduce<{ savings: number; carbon: number }[]>((list, row) => {
    const previous = list[list.length - 1] ?? { savings: 0, carbon: 0 }
    return [...list, { savings: previous.savings + row.savingsAud, carbon: previous.carbon + row.carbonKg }]
  }, [])
  const totals = running[running.length - 1] ?? { savings: 0, carbon: 0 }

  return (
    <section className="goals-history-panel" aria-labelledby="goals-history-title">
      <div className="goals-history-panel__head">
        <div>
          <h2 id="goals-history-title">Progress history</h2>
          <p className="goals-history-panel__summary">
            {rows.length
              ? `${rows.length === 1 ? '1 month' : `${rows.length} months`} tracked · ${formatGoalAud(
                  totals.savings,
                )} saved · ${formatGoalKgAmount(totals.carbon)} CO₂e avoided${last ? ` · counted to ${formatDayLabel(last)}` : ''}`
              : 'No months counted yet.'}
          </p>
        </div>
        <button
          type="button"
          className="goals-history-panel__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((state) => !state)}
        >
          {open ? 'Hide' : 'Show'}
          <span className={`goals-history-panel__chevron${open ? ' is-open' : ''}`} aria-hidden="true">
            <ChevronIcon width={14} height={14} />
          </span>
        </button>
      </div>

      {open ? (
        <div id={panelId} className="goals-history-panel__body">
          {rows.length === 0 ? (
            <div className="goals-history__empty">
              <p>Upload your first battery file to start counting.</p>
              <Button variant="secondary" onClick={onUpload}>
                Upload a file
              </Button>
            </div>
          ) : (
            <>
              <ul className="history-legend" aria-label="Chart key">
                <li>
                  <span className="history-legend__swatch history-legend__swatch--savings" aria-hidden="true" />
                  Savings · % of {formatGoalAud(goals.savings.target)}
                </li>
                <li>
                  <span className="history-legend__swatch history-legend__swatch--carbon" aria-hidden="true" />
                  Carbon · % of {formatGoalKgAmount(goals.carbon.target)}
                </li>
                <li>
                  <span className="history-legend__swatch history-legend__swatch--partial" aria-hidden="true" />
                  Partial month
                </li>
              </ul>
              <HistoryBars months={months} goals={goals} />
              <div className="goals-history__scroll">
                <table className="goals-history__table">
                  <caption className="visually-hidden">Estimated savings and carbon avoided by month</caption>
                  <thead>
                    <tr>
                      <th scope="col">Month</th>
                      <th scope="col">Days counted</th>
                      <th scope="col">Saved</th>
                      <th scope="col">Carbon avoided</th>
                      <th scope="col">Running total</th>
                      <th scope="col">
                        <span className="visually-hidden">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      return (
                        <tr key={row.month}>
                          <th scope="row">
                            {shortMonth(row.month)}
                            {row.revisedOn ? (
                              <span className="goals-history__revised">Revised {formatDayLabel(row.revisedOn)}</span>
                            ) : null}
                          </th>
                          <td>
                            {row.partial ? (
                              <span className="goals-history__partial">
                                {row.daysCounted} of {row.daysInMonth} · Partial
                              </span>
                            ) : (
                              `${row.daysCounted} of ${row.daysInMonth}`
                            )}
                          </td>
                          <td>{formatGoalAud(row.savingsAud)}</td>
                          <td>{formatGoalKgAmount(row.carbonKg)}</td>
                          <td>
                            {formatGoalAud(running[index].savings)} · {formatGoalKgAmount(running[index].carbon)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="goals-history__remove"
                              aria-label={`Remove ${shortMonth(row.month)}`}
                              onClick={() => onRemove(row.month)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="goals-history__note">All figures are estimates, not a bill or metered result.</p>
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
