/**
 * Preview of estimated savings and carbon from an uploaded file, before saving.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { EMISSIONS_FACTOR_SOURCE, GOAL_LABELS, TYPICAL_RATE_SOURCE } from '../../constants/goals'
import type { CalculationContext, PreviewTotals } from '../../lib/goals/calculate'
import {
  formatDayLabel,
  formatEnergy,
  formatGoalAud,
  formatGoalKg,
  formatRate,
} from '../../lib/goals/goalFormat'
import { GOAL_KINDS, type GoalEntry, type GoalKind } from '../../types/goals'
import type { MessageCode } from '../../constants/goalMessages'
import { Button } from '../ui/Button'
import { GoalMessage } from './GoalMessage'
import { GoalProgress } from './GoalProgress'

type Props = {
  preview: PreviewTotals
  context: CalculationContext
  goals: Record<GoalKind, GoalEntry>
  /** Running totals already saved, before this file. */
  savedTotals: Record<GoalKind, number>
  /** Days in the file that were already counted and are left as they were. */
  skippedCount: number
  /** Why the device refused the save, or null; the preview stays open. */
  saveError: MessageCode | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * rateLabel
 * @returns Plain words for the rate behind the savings figure
 *
 * 'from_you' is the usage rate the person entered; anything else is the typical
 * Victorian rate. The number is the rate actually used.
 */
function rateLabel(context: CalculationContext): string {
  if (context.rateKind === 'from_you') return `your usage rate (${formatRate(context.rate)})`
  return `the typical Victorian rate (about ${formatRate(context.rate)}), because no rate was entered`
}

function dayWord(count: number): string {
  return count === 1 ? '1 day' : `${count} days`
}

/**
 * UploadPreview
 * @param props.preview - Totals for the days in the file
 * @param props.context - Rate and emissions factor, the same ones the dashboard uses
 * @returns Estimated figures, energy breakdown, projected progress, and Confirm / Cancel
 *
 * Nothing here is saved. Focus moves to the heading when the preview opens.
 */
export function UploadPreview({
  preview,
  context,
  goals,
  savedTotals,
  skippedCount,
  saveError,
  onConfirm,
  onCancel,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const added: Record<GoalKind, number> = { savings: preview.savingsAud, carbon: preview.carbonKg }

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section className="dashboard-card goals-preview" aria-labelledby="goals-preview-title">
      <div className="goals-preview__head">
        <h2 id="goals-preview-title" ref={headingRef} tabIndex={-1}>
          Estimated savings and carbon
        </h2>
        <span className="goals-preview__unsaved">Not saved yet</span>
      </div>
      <p className="dashboard-card__lede">
        {formatDayLabel(preview.firstDate)} to {formatDayLabel(preview.lastDate)},{' '}
        {dayWord(preview.dayCount)} not counted before.
      </p>
      {skippedCount ? (
        <p className="goals-preview__note">
          {dayWord(skippedCount)} in this file {skippedCount === 1 ? 'was' : 'were'} already
          counted and skipped.
        </p>
      ) : null}

      <div className="goals-preview__figures">
        <div className="goals-preview__figure">
          <p className="eyebrow">Estimated savings</p>
          <p className="goals-preview__value">
            {formatGoalAud(preview.savingsAud)}
            <span className="kpi-badge kpi-badge--estimate">Estimate</span>
          </p>
          <p className="goals-preview__note">Not a bill or metered result.</p>
        </div>
        <div className="goals-preview__figure">
          <p className="eyebrow">Estimated carbon avoided</p>
          <p className="goals-preview__value">
            {formatGoalKg(preview.carbonKg)}
            <span className="kpi-badge kpi-badge--estimate">Estimate</span>
          </p>
          <p className="goals-preview__note">Not a bill or metered result.</p>
        </div>
      </div>

      <h3 className="goals-preview__subtitle">Battery energy counted</h3>
      <dl className="goals-preview__breakdown">
        <div>
          <dt>Discharge (energy given out)</dt>
          <dd>{formatEnergy(preview.dischargeKwh)}</dd>
        </div>
      </dl>
      <p className="goals-preview__note">
        Only energy your battery gave out is counted. Energy it took in is not.
      </p>
      <p className="goals-preview__note">Savings use {rateLabel(context)}.</p>

      <div className="vpp-example goals-examples">
        <Button
          variant="outline-accent"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((state) => !state)}
        >
          How was this calculated?
        </Button>
        {open ? (
          <div id={panelId} className="vpp-example__panel goals-examples__panel">
            <p className="vpp-example__label">The same rules as the rest of MyPowerPlant</p>
            <ol className="goals-examples__list">
              <li>
                Battery energy counted = discharge only. Energy the battery takes in is not
                counted.
              </li>
              <li>
                Estimated savings = discharge × {rateLabel(context)}. Here:{' '}
                {formatEnergy(preview.energyKwh)} × {formatRate(context.rate)} ={' '}
                {formatGoalAud(preview.savingsAud)}.
              </li>
              <li>
                Estimated carbon avoided = discharge × the Victorian grid emissions factor (
                {context.factor} kg CO2e per kWh). Here: {formatEnergy(preview.energyKwh)} ×{' '}
                {context.factor} = {formatGoalKg(preview.carbonKg)}.
              </li>
            </ol>
            <p className="vpp-term__meta">
              <span>Emissions factor: {EMISSIONS_FACTOR_SOURCE.label}</span>
              <span>Last verified: {EMISSIONS_FACTOR_SOURCE.lastVerified}</span>
            </p>
            {context.rateKind === 'from_you' ? (
              <p className="vpp-term__meta">
                <span>Rate: the usage rate you entered from your bill or contract</span>
              </p>
            ) : (
              <p className="vpp-term__meta">
                <span>Typical rate: {TYPICAL_RATE_SOURCE.label}</span>
                <span>Last verified: {TYPICAL_RATE_SOURCE.lastVerified}</span>
              </p>
            )}
          </div>
        ) : null}
      </div>

      <h3 className="goals-preview__subtitle">Your progress if you confirm</h3>
      <div className="goals-preview__progress">
        {GOAL_KINDS.map((kind) => (
          <div key={kind}>
            <p className="eyebrow">{GOAL_LABELS[kind].title}</p>
            <GoalProgress
              kind={kind}
              total={savedTotals[kind] + added[kind]}
              target={goals[kind].target}
            />
          </div>
        ))}
      </div>

      <p className="goals-preview__note">Not saved yet. Nothing is added until you confirm.</p>
      {saveError ? <GoalMessage code={saveError} /> : null}
      <div className="goals-preview__actions">
        <Button variant="primary" onClick={onConfirm}>
          Confirm and save
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </section>
  )
}
