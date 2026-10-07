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
import { Button } from '../ui/Button'
import { GoalProgress } from './GoalProgress'

type Props = {
  preview: PreviewTotals
  context: CalculationContext
  goals: Record<GoalKind, GoalEntry>
  /** Running totals already saved, before this file. */
  savedTotals: Record<GoalKind, number>
  onConfirm: () => void
  onCancel: () => void
}

/**
 * rateLabel
 * @returns Plain words for the rate behind the savings figure
 *
 * Uses the report's own rate kind: 'from_you' is the household's rate, and
 * anything else is an estimate. The number is the rate actually used.
 */
function rateLabel(context: CalculationContext): string {
  if (context.rateKind === 'from_you') return `your household's rate (${formatRate(context.rate)})`
  return `an estimated rate (about ${formatRate(context.rate)}, typical for Victoria)`
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
export function UploadPreview({ preview, context, goals, savedTotals, onConfirm, onCancel }: Props) {
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
        {dayWord(preview.dayCount)}.
      </p>

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
        <div>
          <dt>Intake (energy taken in)</dt>
          <dd>{preview.intakeKwh === null ? 'Not in your file' : formatEnergy(preview.intakeKwh)}</dd>
        </div>
        <div>
          <dt>Total battery energy</dt>
          <dd>{formatEnergy(preview.energyKwh)}</dd>
        </div>
      </dl>
      {preview.intakeKwh === null ? (
        <p className="goals-preview__missing" role="status">
          Your file has no battery_charge_kwh column, so intake is missing and only discharge is
          counted. Nothing has been filled in for it.
        </p>
      ) : null}
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
                Battery energy = discharge + intake. Both count: energy the battery takes in and
                later gives out is counted each time.
              </li>
              <li>
                Estimated savings = battery energy × {rateLabel(context)}. Here:{' '}
                {formatEnergy(preview.energyKwh)} × {formatRate(context.rate)} ={' '}
                {formatGoalAud(preview.savingsAud)}.
              </li>
              <li>
                Estimated carbon avoided = battery energy × the Victorian grid emissions factor (
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
                <span>Rate: your monthly bill ÷ your monthly usage, from your profile</span>
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
