/**
 * Vertical radio list with an optional hint under each label.
 */
import { Field } from './Field'

type Option<T extends string> = { value: T; label: string; hint?: string }

type Props<T extends string> = {
  label: string
  error?: string
  info?: string
  value: T | ''
  options: Option<T>[]
  onChange: (value: T) => void
}

/**
 * RadioList
 * @param props.value - Selected option, or empty before a choice
 * @param props.options - Value, label, and optional time-window hint
 * @returns JSX.Element
 *
 * Used for peak-period questions where a hint like “6pm – 10pm” helps.
 * Each row is a radio button, not a native input, so styling stays consistent.
 */
export function RadioList<T extends string>({
  label,
  error,
  info,
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <Field label={label} error={error} info={info}>
      <div className="ui-radio-list" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={`ui-radio-list__row${value === option.value ? ' is-selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <span className="ui-radio-list__mark" />
            <span className="ui-radio-list__meta">
              <span className="ui-radio-list__label">{option.label}</span>
              {option.hint ? <span className="ui-radio-list__hint">{option.hint}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </Field>
  )
}
