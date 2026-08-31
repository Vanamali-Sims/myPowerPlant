import { Field } from './Field'

type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  label: string
  hint?: string
  error?: string
  info?: string
  value: T | ''
  options: Option<T>[]
  onChange: (value: T) => void
}

export function SegmentedToggle<T extends string>({
  label,
  hint,
  error,
  info,
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <Field label={label} hint={hint} error={error} info={info}>
      <div className="ui-toggle" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={`ui-toggle__option${value === option.value ? ' is-selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Field>
  )
}
