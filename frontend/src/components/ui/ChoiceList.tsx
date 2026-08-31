import type { ReactNode } from 'react'
import { Field } from './Field'

type Option<T extends string> = {
  value: T
  label: string
  description: string
  icon: ReactNode
}

type Props<T extends string> = {
  label: string
  error?: string
  value: T | ''
  options: Option<T>[]
  onChange: (value: T) => void
}

export function ChoiceList<T extends string>({
  label,
  error,
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <Field label={label} error={error}>
      <div className="ui-choice-list" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={`ui-choice${value === option.value ? ' is-selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <span className="ui-choice__icon">{option.icon}</span>
            <span>
              <p className="ui-choice__title">{option.label}</p>
              <p className="ui-choice__desc">{option.description}</p>
            </span>
          </button>
        ))}
      </div>
    </Field>
  )
}
