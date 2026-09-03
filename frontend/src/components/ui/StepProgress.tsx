/**
 * “Step N of M” label and amber progress bar for the setup wizard.
 */

type Props = {
  step: number
  total: number
}

/**
 * StepProgress
 * @param props.step - Current 1-based step index
 * @param props.total - Number of wizard steps
 * @returns JSX.Element
 *
 * Fill width is a percentage so CSS does not need a step-specific class.
 * The progressbar exposes the same percentage to assistive tech.
 */
export function StepProgress({ step, total }: Props) {
  const percent = Math.round((step / total) * 100)
  return (
    <div className="ui-progress">
      <span className="ui-progress__label">
        Step {step} of {total}
      </span>
      <div
        className="ui-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Step ${step} of ${total}`}
      >
        <div className="ui-progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
