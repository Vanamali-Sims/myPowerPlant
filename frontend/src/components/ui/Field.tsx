/**
 * Label, optional info tooltip, error, and hint wrapper for form controls.
 */
import type { ReactNode } from 'react'
import { fieldMessageIds } from '../../lib/fieldIds'
import { AlertIcon, InfoIcon } from './icons'

type Props = {
  label: string
  hint?: string
  error?: string
  info?: string
  /** When set, the label is a real <label> for this control and hint/error get ids. */
  inputId?: string
  children: ReactNode
}

/**
 * Field
 * @param props.label - Visible field title
 * @param props.children - The input, select, or toggle
 * @returns JSX.Element
 *
 * Errors use role="alert" so a failed continue is announced.
 * Hint text sits under the control and is not shown as the error.
 * Without inputId the markup is unchanged, so existing forms are unaffected.
 */
export function Field({ label, hint, error, info, inputId, children }: Props) {
  const ids = inputId ? fieldMessageIds(inputId) : null
  return (
    <div className="ui-field">
      <div className="ui-field__label-row">
        {inputId ? (
          <label className="ui-field__label" htmlFor={inputId}>
            {label}
          </label>
        ) : (
          <span className="ui-field__label">{label}</span>
        )}
        {info ? (
          <span title={info} aria-label={info}>
            <InfoIcon width={15} height={15} />
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="ui-field__error" role="alert" id={ids?.error}>
          <AlertIcon width={15} height={15} />
          <span>{error}</span>
        </p>
      ) : null}
      {hint ? (
        <p className="ui-field__hint" id={ids?.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
