import { Button } from './Button'
import { QuestionIcon } from './icons'

type Props = {
  continueLabel?: string
  onBack?: () => void
  onContinue: () => void
  onSkip?: () => void
  showSkip?: boolean
}

export function FormActions({
  continueLabel = 'Continue',
  onBack,
  onContinue,
  onSkip,
  showSkip = true,
}: Props) {
  return (
    <div className="form-actions">
      <div className="form-actions__row">
        <Button variant="secondary" onClick={onBack} disabled={!onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onContinue}>
          {continueLabel}
        </Button>
      </div>
      {showSkip && onSkip ? (
        <div className="form-actions__skip">
          <Button variant="ghost" onClick={onSkip}>
            <QuestionIcon width={14} height={14} />
            Skip for now
          </Button>
          <p className="form-actions__skip-note">This gives baseline results.</p>
        </div>
      ) : null}
    </div>
  )
}
