/**
 * Horizontal yes/no (or similar) radio group styled as a segmented toggle.
 */
import { useSlidingHighlight } from '../../lib/useSlidingHighlight'
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
  const { setRef, box } = useSlidingHighlight(value || null, '[aria-checked="true"]')

  return (
    <Field label={label} hint={hint} error={error} info={info}>
      <div ref={setRef} className="ui-toggle" role="radiogroup" aria-label={label}>
        <span
          aria-hidden="true"
          className={`ui-toggle__highlight${box.visible ? ' is-visible' : ''}${
            box.ready ? ' is-ready' : ''
          }`}
          style={{
            transform: `translate3d(${box.left}px, ${box.top}px, 0)`,
            width: box.width,
            height: box.height,
          }}
        />
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
