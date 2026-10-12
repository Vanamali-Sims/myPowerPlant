/**
 * What was read from a battery file, before anything is calculated or saved.
 */
import { useEffect, useRef } from 'react'
import type { ReadResult } from '../../lib/goals/adapters/types'
import { formatDayLabel } from '../../lib/goals/goalFormat'
import { Button } from '../ui/Button'
import { GoalMessage } from './GoalMessage'
import { ProblemList } from './ProblemList'

type Props = {
  result: Extract<ReadResult, { ok: true }>
  onContinue: () => void
  onCancel: () => void
}

function dayCount(count: number): string {
  return count === 1 ? '1 day' : `${count} days`
}

/**
 * ReadSummary
 * @param props.result - Complete days read from the file
 * @returns First and last date and days read, with Continue and Cancel
 *
 * Focus moves to the heading when the summary appears. Nothing here is added
 * to totals or history.
 */
export function ReadSummary({ result, onContinue, onCancel }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const first = result.days[0].date
  const last = result.days[result.days.length - 1].date

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="goals-summary">
      <h3 ref={headingRef} tabIndex={-1}>
        File read
      </h3>
      <dl className="goals-summary__facts">
        <div>
          <dt>First day</dt>
          <dd>{formatDayLabel(first)}</dd>
        </div>
        <div>
          <dt>Last day</dt>
          <dd>{formatDayLabel(last)}</dd>
        </div>
        <div>
          <dt>Complete days read</dt>
          <dd>{result.days.length}</dd>
        </div>
      </dl>
      {result.incompleteDays.length ? (
        <p className="goals-summary__note">
          {dayCount(result.incompleteDays.length)} left out because some intervals are missing.
          They can be counted when a later file has the rest.
        </p>
      ) : null}
      {result.rowProblemCount ? (
        <GoalMessage
          code="invalid_rows"
          details={
            <>
              <ProblemList problems={result.rowProblems} total={result.rowProblemCount} />
              {result.problemDays.length ? (
                <p>
                  Days left out ({result.problemDays.length}):{' '}
                  {result.problemDays.map(formatDayLabel).join(', ')}.
                </p>
              ) : null}
            </>
          }
        />
      ) : null}
      <p className="goals-summary__note">Nothing has been added to your totals yet.</p>
      <div className="goals-summary__actions">
        <Button variant="primary" onClick={onContinue}>
          {result.rowProblemCount ? 'Continue with valid days' : 'Continue'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
