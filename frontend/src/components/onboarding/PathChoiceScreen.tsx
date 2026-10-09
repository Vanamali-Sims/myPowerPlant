import { PATH_CHOICE } from '../../constants/onboarding'
import { MyPowerPlantMark } from '../ui/MyPowerPlantMark'

type Props = {
  onExplore: () => void
  onImprove: () => void
}

/**
 * Screen 2 — first visit only, before a journey is saved.
 */
export function PathChoiceScreen({ onExplore, onImprove }: Props) {
  return (
    <div className="onboarding onboarding--path">
      <div className="onboarding__inner onboarding__inner--wide">
        <span className="onboarding__mark" aria-hidden="true">
          <MyPowerPlantMark width={36} height={36} />
        </span>
        <h1 className="onboarding__title">{PATH_CHOICE.title}</h1>
        <p className="onboarding__lede">{PATH_CHOICE.lede}</p>
        <div className="path-choice__grid">
          <button type="button" className="path-choice__card" onClick={onExplore}>
            <h2>{PATH_CHOICE.explore.title}</h2>
            <p>{PATH_CHOICE.explore.body}</p>
            <span className="path-choice__cta">{PATH_CHOICE.explore.action} →</span>
          </button>
          <button
            type="button"
            className="path-choice__card path-choice__card--improve"
            onClick={onImprove}
          >
            <h2>{PATH_CHOICE.improve.title}</h2>
            <p>{PATH_CHOICE.improve.body}</p>
            <span className="path-choice__cta">{PATH_CHOICE.improve.action} →</span>
          </button>
        </div>
      </div>
    </div>
  )
}
