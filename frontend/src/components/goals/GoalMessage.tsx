/**
 * Shared message for every Goals upload and save outcome.
 */
import type { ReactNode } from 'react'
import { GOAL_MESSAGES, SEVERITY_LABELS, type MessageCode } from '../../constants/goalMessages'
import { AlertIcon, InfoIcon } from '../ui/icons'

type Props = {
  code: MessageCode
  /** Specifics for this case, such as missing columns or the days left out. */
  details?: ReactNode
  /** Buttons for the next step. */
  actions?: ReactNode
}

/**
 * GoalMessage
 * @param props.code - Fixed code from the message catalogue
 * @returns Severity icon and label, plain title, details, the next step, and actions
 *
 * Errors use role="alert"; warnings and information use role="status". The
 * severity is written out next to the icon, so colour is never the only signal.
 */
export function GoalMessage({ code, details, actions }: Props) {
  const spec = GOAL_MESSAGES[code]
  const Icon = spec.severity === 'info' ? InfoIcon : AlertIcon
  return (
    <div
      className={`goal-message goal-message--${spec.severity}`}
      role={spec.severity === 'error' ? 'alert' : 'status'}
      data-code={code}
    >
      <Icon width={18} height={18} />
      <div className="goal-message__content">
        <p className="goal-message__title">
          <span className="goal-message__severity">{SEVERITY_LABELS[spec.severity]}:</span>{' '}
          {spec.title}
        </p>
        {details ? <div className="goal-message__details">{details}</div> : null}
        <p className="goal-message__next">
          <span className="goal-message__next-label">What to do next:</span> {spec.nextStep}
        </p>
        {actions ? <div className="goal-message__actions">{actions}</div> : null}
      </div>
    </div>
  )
}
