/**
 * Months where a file has different figures for days already counted.
 */
import { useEffect, useRef, useState } from 'react'
import type { MonthRevision } from '../../lib/goals/revisions'
import {
  formatEnergy,
  formatGoalAud,
  formatGoalKg,
  formatMonthLabel,
} from '../../lib/goals/goalFormat'
import { Button } from '../ui/Button'
import { GoalMessage } from './GoalMessage'

type Props = {
  revisions: MonthRevision[]
  onReplace: () => void
}

function intake(value: number | null): string {
  return value === null ? 'Not in file' : formatEnergy(value)
}

/**
 * RevisionPanel
 * @param props.revisions - Months that look revised
 * @returns Saved and new figures side by side, with Replace behind an extra confirmation
 *
 * Saved figures are kept unless "Replace with the new figures" is chosen and
 * then confirmed. Replacing never removes a reached goal.
 */
export function RevisionPanel({ revisions, onReplace }: Props) {
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLParagraphElement>(null)
  const months = revisions.map((revision) => formatMonthLabel(revision.month)).join(', ')

  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
  }, [confirming])

  return (
    <GoalMessage
      code="possibly_revised"
      details={
        <div className="goals-revisions">
          {revisions.map((revision) => (
            <table key={revision.month} className="goals-revisions__table">
              <caption>
                {formatMonthLabel(revision.month)}, the same {revision.saved.daysCounted} days
              </caption>
              <thead>
                <tr>
                  <th scope="col">Figure</th>
                  <th scope="col">Saved now</th>
                  <th scope="col">In this file</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Discharge</th>
                  <td>{formatEnergy(revision.saved.dischargeKwh)}</td>
                  <td>{formatEnergy(revision.file.dischargeKwh)}</td>
                </tr>
                <tr>
                  <th scope="row">Intake</th>
                  <td>{intake(revision.saved.intakeKwh)}</td>
                  <td>{intake(revision.file.intakeKwh)}</td>
                </tr>
                <tr>
                  <th scope="row">Estimated savings</th>
                  <td>{formatGoalAud(revision.saved.savingsAud)}</td>
                  <td>{formatGoalAud(revision.file.savingsAud)}</td>
                </tr>
                <tr>
                  <th scope="row">Estimated carbon avoided</th>
                  <td>{formatGoalKg(revision.saved.carbonKg)}</td>
                  <td>{formatGoalKg(revision.file.carbonKg)}</td>
                </tr>
              </tbody>
            </table>
          ))}
          <p>
            Replacing uses every day this file has for {months} and recalculates the estimates
            at today's rate.
          </p>
        </div>
      }
      actions={
        confirming ? (
          <div className="goals-revisions__confirm">
            <p ref={confirmRef} tabIndex={-1}>
              Replace the saved figures for {months} with the figures from this file? Your goals
              and any reached goals stay as they are.
            </p>
            <div className="goal-message__actions">
              <Button
                variant="primary"
                onClick={() => {
                  setConfirming(false)
                  onReplace()
                }}
              >
                Yes, replace them
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Keep my saved figures
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline-accent" onClick={() => setConfirming(true)}>
            Replace with the new figures
          </Button>
        )
      }
    />
  )
}
