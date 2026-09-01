/**
 * Numeric stepper used for battery unit count.
 */
import { FIELD_BOUNDS } from '../../constants/validation'
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

/**
 * StepperField
 * @param props.value - Current integer
 * @param props.min - Lower bound; defaults to FIELD_BOUNDS.batteryUnits
 * @returns JSX.Element
 *
 * Plus/minus clamp to min/max so the wizard cannot store an illegal count.
 * Defaults match the validator rather than being hardcoded here.
 */
export function StepperField({
  label,
  hint,
  error,
  info,
  value,
  min = FIELD_BOUNDS.batteryUnits.min,
  max = FIELD_BOUNDS.batteryUnits.max,
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
