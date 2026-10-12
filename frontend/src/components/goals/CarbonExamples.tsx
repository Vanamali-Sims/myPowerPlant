/**
 * "How is carbon calculated?" disclosure with worked examples.
 */
import { useId, useState } from 'react'
import { EMISSIONS_FACTOR_SOURCE } from '../../constants/goals'
import { buildCarbonExamples } from '../../lib/goals/goalSetup'
import { formatExampleKwh, formatGoalKg } from '../../lib/goals/goalFormat'
import { Button } from '../ui/Button'

type Props = {
  /** kg CO2e per kWh, from the same methodology field buildKpiReport reads. */
  factor: number
  suggestedKg: number | null
}

/**
 * CarbonExamples
 * @param props.factor - Victorian grid emissions factor
 * @param props.suggestedKg - Suggested carbon goal, used for the last example
 * @returns Toggle button plus a panel of worked examples and the factor's source
 */
export function CarbonExamplesPanel({ factor, suggestedKg }: Props) {
  const examples = buildCarbonExamples(factor, suggestedKg)
  return (
    <div className="vpp-example__panel goals-examples__panel">
          <p className="vpp-example__label">Worked examples, not your results</p>
          <p>
            Carbon avoided = battery energy (kWh) × the Victorian grid emissions factor (
            {factor} kg CO2e per kWh).
          </p>
          <ul className="goals-examples__list">
            {examples.map((example) => (
              <li key={`${example.kwh}-${example.nearSuggestion}`}>
                {formatExampleKwh(example.kwh)} × {factor} = {formatGoalKg(example.kg)}
                {example.nearSuggestion && suggestedKg ? (
                  <>
                    {' '}
                    <span className="goals-examples__near">
                      (close to your suggested carbon goal of {formatGoalKg(suggestedKg)})
                    </span>{' '}
                    <span className="kpi-badge kpi-badge--estimate">Estimate</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
      <p className="vpp-term__meta">
        <span>Victorian grid emissions factor: {factor} kg CO2e per kWh</span>
        <span>{EMISSIONS_FACTOR_SOURCE.label}</span>
        <span>Last verified: {EMISSIONS_FACTOR_SOURCE.lastVerified}</span>
      </p>
    </div>
  )
}

export function CarbonExamples({ factor, suggestedKg }: Props) {
  const panelId = useId()
  const [open, setOpen] = useState(false)

  return (
    <div className="vpp-example goals-examples">
      <Button
        variant="outline-accent"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((state) => !state)}
      >
        How is carbon calculated?
      </Button>
      {open ? (
        <div id={panelId}>
          <CarbonExamplesPanel factor={factor} suggestedKg={suggestedKg} />
        </div>
      ) : null}
    </div>
  )
}
