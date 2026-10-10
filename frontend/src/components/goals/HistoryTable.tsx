/**
 * Month-by-month history table, the text record of every confirmed upload.
 */
import type { MonthRecord } from '../../types/goals'
import { formatDayLabel, formatGoalAud, formatGoalKg, formatMonthLabel } from '../../lib/goals/goalFormat'
import { historyRows, lastCountedDate } from '../../lib/goals/history'
import { Button } from '../ui/Button'

type Props = {
  months: MonthRecord[]
  /** Moves focus to the upload area from the empty state. */
  onGoToUpload: () => void
  /** Asks to remove one month; the row has no Remove button when omitted. */
  onRemove?: (month: string) => void
}

/**
 * HistoryTable
 * @param props.months - Stored monthly records
 * @returns A real table with headers, or an empty state before any upload
 *
 * A month with missing days says "Partial" in words, not only by style.
 * Each row can be removed, after a confirmation the parent shows.
 */
export function HistoryTable({ months, onGoToUpload, onRemove }: Props) {
  const rows = historyRows(months)
  const last = lastCountedDate(months)

  return (
    <section className="dashboard-card goals-history" aria-labelledby="goals-history-title">
      <h2 id="goals-history-title">Month-by-month history</h2>
      {rows.length === 0 ? (
        <div className="goals-history__empty">
          <p>No history yet. Upload your first battery file to start counting.</p>
          <Button variant="secondary" onClick={onGoToUpload}>
            Go to upload
          </Button>
        </div>
      ) : (
        <>
          {last ? (
            <p className="dashboard-card__lede">Counted up to {formatDayLabel(last)}.</p>
          ) : null}
          <div className="goals-history__scroll">
            <table className="goals-history__table">
              <caption>
                Estimated savings and carbon avoided by month{' '}
                <span className="kpi-badge kpi-badge--estimate">Estimate</span>
              </caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Days counted</th>
                  <th scope="col">Estimated savings</th>
                  <th scope="col">Estimated carbon avoided</th>
                  {onRemove ? (
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.month}>
                    <th scope="row">
                      {formatMonthLabel(row.month)}
                      {row.revisedOn ? (
                        <span className="goals-history__revised">
                          Revised {formatDayLabel(row.revisedOn)}
                        </span>
                      ) : null}
                    </th>
                    <td>
                      {row.partial ? (
                        <span className="goals-history__partial">
                          Partial, {row.daysCounted} of {row.daysInMonth} days
                        </span>
                      ) : (
                        `${row.daysCounted} of ${row.daysInMonth} days`
                      )}
                    </td>
                    <td>{formatGoalAud(row.savingsAud)}</td>
                    <td>{formatGoalKg(row.carbonKg)}</td>
                    {onRemove ? (
                      <td>
                        <Button
                          variant="secondary"
                          className="goals-history__remove"
                          aria-label={`Remove ${formatMonthLabel(row.month)}`}
                          onClick={() => onRemove(row.month)}
                        >
                          Remove
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="goals-history__note">
            All figures are estimates, not a bill or metered result.
          </p>
        </>
      )}
    </section>
  )
}
