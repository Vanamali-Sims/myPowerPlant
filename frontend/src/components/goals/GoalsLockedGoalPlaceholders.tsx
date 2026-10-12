import { GOAL_LABELS, GOALS_ONBOARDING } from '../../constants/goals'
import { GOAL_KINDS } from '../../types/goals'

export function GoalsLockedGoalPlaceholders() {
  return (
    <div className="goals-panel-form__fields-wrap" inert>
      <div className="goals-panel-form__fields goals-panel-form__fields--placeholder" aria-hidden="true">
        {GOAL_KINDS.map((kind) => (
          <div key={kind} className="goals-panel-placeholder">
            <span className="goals-panel-field__label">
              {GOAL_LABELS[kind].title} ({GOAL_LABELS[kind].unitLabel})
            </span>
            <div className="goals-panel-placeholder__box" />
            <div className="goals-panel-placeholder__bar" />
            <div className="goals-panel-placeholder__bar goals-panel-placeholder__bar--short" />
          </div>
        ))}
      </div>
      <div className="goals-panel-form__callout" role="status">
        <span className="goals-panel-form__callout-icon" aria-hidden>←</span>
        <p className="goals-panel-form__callout-title">{GOALS_ONBOARDING.lockedTitle}</p>
        <p className="goals-panel-form__callout-body">{GOALS_ONBOARDING.lockedBody}</p>
      </div>
    </div>
  )
}
