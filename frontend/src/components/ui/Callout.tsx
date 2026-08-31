import type { ReactNode } from 'react'

type Tone = 'neutral' | 'success' | 'accent' | 'action'

type Props = {
  tone?: Tone
  icon?: ReactNode
  title?: string
  children: ReactNode
  action?: ReactNode
}

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
