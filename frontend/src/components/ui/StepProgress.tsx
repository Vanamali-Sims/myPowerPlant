type Props = {
  step: number
  total: number
}

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
