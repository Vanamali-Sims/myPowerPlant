import type { CalculationContext } from '../../lib/goals/calculate'
import type { GoalSuggestions } from '../../lib/goals/goalSetup'
import type { GoalBaseline } from '../../types/goals'
import { ChevronIcon } from '../ui/icons'
import { CarbonExamplesPanel } from './CarbonExamples'
import { RangeExplainerPanel } from './RangeExplainer'

type RangeProps = {
  suggestions: GoalSuggestions
  baseline: Pick<GoalBaseline, 'month' | 'days' | 'monthly'>
  context: CalculationContext
}

export function GoalsRangeExplainerDetails({ suggestions, baseline, context }: RangeProps) {
  return (
    <details className="goals-panel-details">
      <summary className="goals-panel-details__summary">
        How is the allowed range calculated?
        <ChevronIcon className="goals-panel-details__chevron" width={18} height={18} aria-hidden />
      </summary>
      <div className="goals-panel-details__body">
        <RangeExplainerPanel suggestions={suggestions} baseline={baseline} context={context} />
      </div>
    </details>
  )
}

type CarbonProps = {
  factor: number
  suggestedKg: number | null
}

export function GoalsCarbonExplainerDetails({ factor, suggestedKg }: CarbonProps) {
  return (
    <details className="goals-panel-details">
      <summary className="goals-panel-details__summary">
        How is carbon calculated?
        <ChevronIcon className="goals-panel-details__chevron" width={18} height={18} aria-hidden />
      </summary>
      <div className="goals-panel-details__body">
        <CarbonExamplesPanel factor={factor} suggestedKg={suggestedKg} />
      </div>
    </details>
  )
}
