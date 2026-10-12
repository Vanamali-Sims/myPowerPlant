/**
 * Labelled text input with optional prefix, suffix, and trailing icon.
 */
import { useId, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { fieldMessageIds } from '../../lib/fieldIds'
import { Field } from './Field'

type NumericMode = 'integer' | 'decimal'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  label: string
  hint?: string
  error?: string
  info?: string
  prefix?: string
  suffix?: string
  icon?: ReactNode
  /** Strip letters as the user types. `inputMode` only affects mobile keyboards. */
  numeric?: NumericMode
}

/**
 * filterNumeric
 * @param value - Raw input value
 * @param mode - Digits only, or digits with a single decimal point
 * @returns The same string with letters and extra punctuation removed
 */
function filterNumeric(value: string, mode: NumericMode): string {
  if (mode === 'integer') return value.replace(/[^\d]/g, '')
  const cleaned = value.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, '')}`
}

/**
 * TextField
 * @param props - Native input props plus Field chrome
 * @returns JSX.Element
 *
 * Prefix/suffix sit inside the input so units like $ or % stay attached.
 * Spreads remaining input attributes through to the native control.
 * The visible label, hint, and error are always linked to the input; an id
 * is made up when none is passed.
 */
export function TextField({
  label,
  hint,
  error,
  info,
  prefix,
  suffix,
  icon,
  className = '',
  numeric,
  onChange,
  id: givenId,
  ...props
}: Props) {
  const autoId = useId()
  const id = givenId ?? autoId
  const ids = fieldMessageIds(id)
  const describedBy = [error ? ids.error : '', hint ? ids.hint : ''].filter(Boolean).join(' ') || undefined

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (numeric) {
      event.target.value = filterNumeric(event.target.value, numeric)
    }
    onChange?.(event)
  }

  return (
    <Field label={label} hint={hint} error={error} info={info} inputId={id}>
      <div
        className={`ui-input-wrap${prefix ? ' ui-input-wrap--prefix' : ''}`}
      >
        {prefix ? <span className="ui-input__affix ui-input__affix--prefix">{prefix}</span> : null}
        <input
          className={`ui-input${error ? ' ui-input--error' : ''} ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
          id={id}
          onChange={handleChange}
        />
        {suffix ? <span className="ui-input__affix ui-input__affix--suffix">{suffix}</span> : null}
        {icon ? <span className="ui-input__icon">{icon}</span> : null}
      </div>
    </Field>
  )
}
