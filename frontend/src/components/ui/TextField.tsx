import type { InputHTMLAttributes, ReactNode } from 'react'
import { Field } from './Field'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  label: string
  hint?: string
  error?: string
  info?: string
  prefix?: string
  suffix?: string
  icon?: ReactNode
}

export function TextField({
  label,
  hint,
  error,
  info,
  prefix,
  suffix,
  icon,
  className = '',
  ...props
}: Props) {
  return (
    <Field label={label} hint={hint} error={error} info={info}>
      <div
        className={`ui-input-wrap${prefix ? ' ui-input-wrap--prefix' : ''}`}
      >
        {prefix ? <span className="ui-input__affix ui-input__affix--prefix">{prefix}</span> : null}
        <input
          className={`ui-input${error ? ' ui-input--error' : ''} ${className}`}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {suffix ? <span className="ui-input__affix ui-input__affix--suffix">{suffix}</span> : null}
        {icon ? <span className="ui-input__icon">{icon}</span> : null}
      </div>
    </Field>
  )
}
