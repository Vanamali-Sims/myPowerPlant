/**
 * Compass grid for rooftop solar facing direction, plus a Not sure row.
 */
import type { SolarDirection } from '../../types/profile'
import { solarDirections } from '../../data/profileOptions'
import { Field } from './Field'
import { QuestionIcon } from './icons'

type Props = {
  label: string
  error?: string
  info?: string
  value: SolarDirection | ''
  onChange: (value: SolarDirection) => void
}

/**
 * DirectionGrid
 * @param props.value - Selected compass point or not_sure
 * @param props.onChange - Called when the user picks a direction
 * @returns JSX.Element
 *
 * Compass labels come from solarDirections so they stay in one place.
 * Not sure is a wide row because it is not a compass point.
 */
export function DirectionGrid({ label, error, info, value, onChange }: Props) {
  return (
    <Field label={label} error={error} info={info}>
      <div className="ui-dir-grid" role="radiogroup" aria-label={label}>
        {solarDirections.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={`ui-dir${value === option.value ? ' is-selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <span className="ui-dir__mark">{option.label}</span>
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={value === 'not_sure'}
          className={`ui-dir ui-dir--wide${value === 'not_sure' ? ' is-selected' : ''}`}
          onClick={() => onChange('not_sure')}
        >
          <QuestionIcon />
          Not sure
        </button>
      </div>
    </Field>
  )
}
