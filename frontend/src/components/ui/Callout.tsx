/**
 * Inline notice used for tips, last-updated banners, and reset confirmations.
 */
import type { ReactNode } from 'react'

type Tone = 'neutral' | 'success' | 'accent' | 'action'

type Props = {
  tone?: Tone
  icon?: ReactNode
  title?: string
  children: ReactNode
  action?: ReactNode
}

/**
 * Callout
 * @param props.tone - Visual treatment: neutral, success, accent, or action
 * @param props.children - Body copy
 * @returns JSX.Element
 *
 * Optional action slot holds a button (dashboard, reset) on the right.
 * Tone only changes colour — layout stays the same.
 */
export function Callout({ tone = 'neutral', icon, title, children, action }: Props) {
  return (
    <div className={`ui-callout ui-callout--${tone}${action ? ' ui-callout--action' : ''}`}>
      {icon}
      <div>
        {title ? <p className="ui-callout__title">{title}</p> : null}
        <div className="ui-callout__body">{children}</div>
      </div>
      {action}
    </div>
  )
}
