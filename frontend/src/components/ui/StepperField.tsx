import { Field } from './Field'
import { BatteryIcon } from './icons'

type Props = {
  label: string
  hint?: string
  error?: string
  info?: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

export function StepperField({
  label,
  hint,
  error,
  info,
  value,
  min = 1,
  max = 8,
  onChange,
}: Props) {
  return (
    <Field label={label} hint={hint} error={error} info={info}>
      <div className="ui-stepper">
        <button
          type="button"
          className="ui-stepper__btn"
          aria-label="Decrease"
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span className="ui-stepper__value">{value}</span>
        <button
          type="button"
          className="ui-stepper__btn"
          aria-label="Increase"
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
        <BatteryIcon />
      </div>
    </Field>
  )
}
