import type { ReactNode } from 'react'
import { AlertIcon, InfoIcon } from './icons'

type Props = {
  label: string
  hint?: string
  error?: string
  info?: string
  children: ReactNode
}

export function Field({ label, hint, error, info, children }: Props) {
  return (
    <div className="ui-field">
      <div className="ui-field__label-row">
        <span className="ui-field__label">{label}</span>
        {info ? (
          <span title={info} aria-label={info}>
            <InfoIcon width={15} height={15} />
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="ui-field__error" role="alert">
          <AlertIcon width={15} height={15} />
          <span>{error}</span>
        </p>
      ) : null}
      {hint ? <p className="ui-field__hint">{hint}</p> : null}
    </div>
  )
}
