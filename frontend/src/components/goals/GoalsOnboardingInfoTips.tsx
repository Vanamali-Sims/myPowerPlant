import { useId, useState } from 'react'
import { GOALS_ONBOARDING } from '../../constants/goals'
import { InfoIcon } from '../ui/icons'

type TipId = 'range' | 'carbon'

const TIPS: { id: TipId; label: string; text: string }[] = [
  {
    id: 'range',
    label: 'How is the allowed range calculated?',
    text: GOALS_ONBOARDING.rangeTip,
  },
  {
    id: 'carbon',
    label: 'How is carbon calculated?',
    text: GOALS_ONBOARDING.carbonTip,
  },
]

export function GoalsOnboardingInfoTips() {
  const [open, setOpen] = useState<TipId | null>(null)
  const lineId = useId()

  return (
    <div className="goals-panel-form__tips">
      <div className="goals-panel-form__tip-buttons">
        {TIPS.map((tip) => (
          <button
            key={tip.id}
            type="button"
            className={`goals-panel-tip__btn${open === tip.id ? ' goals-panel-tip__btn--on' : ''}`}
            aria-expanded={open === tip.id}
            aria-controls={lineId}
            aria-label={tip.label}
            onClick={() => setOpen((current) => (current === tip.id ? null : tip.id))}
          >
            <InfoIcon width={14} height={14} aria-hidden />
          </button>
        ))}
      </div>
      {open ? (
        <p id={lineId} className="goals-panel-tip__line" role="note">
          {TIPS.find((tip) => tip.id === open)?.text}
        </p>
      ) : null}
    </div>
  )
}
