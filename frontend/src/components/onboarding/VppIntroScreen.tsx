import { VPP_INTRO } from '../../constants/onboarding'
import { Button } from '../ui/Button'
import { VppIntroAnimation } from './VppIntroAnimation'

type Props = {
  onComplete: () => void
}

/**
 * Screen 1 — VPP concept animation shown at the start of every visit.
 */
export function VppIntroScreen({ onComplete }: Props) {
  return (
    <div className="onboarding onboarding--intro">
      <div className="onboarding__inner">
        <p className="eyebrow onboarding__eyebrow">{VPP_INTRO.eyebrow}</p>
        <h1 className="onboarding__title">{VPP_INTRO.title}</h1>
        <p className="onboarding__lede">{VPP_INTRO.lede}</p>
        <div className="onboarding__art">
          <VppIntroAnimation />
        </div>
        <div className="onboarding__actions">
          <Button variant="ghost" type="button" onClick={onComplete}>
            {VPP_INTRO.skip}
          </Button>
          <Button variant="primary" type="button" onClick={onComplete}>
            {VPP_INTRO.continue}
          </Button>
        </div>
      </div>
    </div>
  )
}
