/**
 * Horizontal yes/no (or similar) radio group styled as a segmented toggle.
 */
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

/**
 * SegmentedToggle
 * @param props.value - Selected option, or empty before a choice
 * @param props.options - Value/label pairs for the radios
 * @returns JSX.Element
 *
 * Generic over the option value type so yes/no fields stay typed.
 * Renders as a radiogroup for keyboard and screen-reader support.
 */
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
