import { useId } from 'react'
import { GOALS_ONBOARDING } from '../../constants/goals'
import type { GoalKind } from '../../types/goals'
import { InfoIcon } from '../ui/icons'

const TIP_BY_KIND: Record<GoalKind, { label: string; text: string }> = {
  savings: {
    label: 'How is the allowed range calculated?',
    text: GOALS_ONBOARDING.rangeTip,
  },
  carbon: {
    label: 'How is carbon calculated?',
    text: GOALS_ONBOARDING.carbonTip,
  },
}

export function GoalsOnboardingInfoTip({ kind }: { kind: GoalKind }) {
  const tip = TIP_BY_KIND[kind]
  const tipId = useId()

  return (
    <span className="goals-panel-tip">
      <span
        className="goals-panel-tip__icon"
        tabIndex={0}
        role="img"
        aria-label={tip.label}
        aria-describedby={tipId}
      >
        <InfoIcon width={12} height={12} aria-hidden />
      </span>
      <span id={tipId} className="goals-panel-tip__line" role="tooltip">
        {tip.text}
      </span>
    </span>
  )
}
