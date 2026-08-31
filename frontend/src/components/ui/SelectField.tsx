import { Field } from './Field'

type Option = { value: string; label: string }

type Props = {
  label: string
  hint?: string
  error?: string
  info?: string
  value: string
  placeholder?: string
  options: Option[] | string[]
  onChange: (value: string) => void
  suffix?: string
}

export function SelectField({
  label,
  hint,
  error,
  info,
  value,
  placeholder = 'Select',
  options,
  onChange,
  suffix,
}: Props) {
  const normalised = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  )

  return (
    <Field label={label} hint={hint} error={error} info={info}>
      <div className="ui-input-wrap">
        <select
          className={`ui-select${error ? ' ui-select--error' : ''}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {normalised.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {suffix ? <span className="ui-input__affix ui-input__affix--suffix">{suffix}</span> : null}
      </div>
    </Field>
  )
}
