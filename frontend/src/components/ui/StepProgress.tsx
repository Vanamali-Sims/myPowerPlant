/**
 * Progress for the setup wizard: which step, how many answers in, how long left.
 *
 * The bar is driven by answers rather than by step index. The steps hold
 * 15 / 4 / 4 / 4 / 1 fields, so a step-based bar told people who had finished
 * over half the form that they were a fifth of the way through, and then gave
 * the final fifth of the bar to a single question.
 */

type Props = {
  step: number
  total: number
  /** Applicable fields answered so far. */
  answered: number
  /** Applicable fields in total — fewer than 28 when questions are hidden. */
  fields: number
  percent: number
  minutesLeft: number
}

/**
 * StepProgress
 * @param props.step - Current 1-based step index
 * @param props.percent - Share of applicable questions answered
 * @returns JSX.Element
 *
 * The progressbar reports the answer-based percentage to assistive tech, so
 * what a screen reader hears matches what the bar shows.
 */
export function StepProgress({ step, total, answered, fields, percent, minutesLeft }: Props) {
  return (
    <div className="ui-progress">
      <span className="ui-progress__label">
        <span>
          Step {step} of {total}
        </span>
        <span className="ui-progress__count">
          {answered} of {fields} answered
          {minutesLeft > 0 ? ` · about ${minutesLeft} min left` : ' · all done'}
        </span>
      </span>
      <div
        className="ui-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`${answered} of ${fields} questions answered`}
      >
        <div className="ui-progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
