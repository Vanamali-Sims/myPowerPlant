import { useEffect, useRef } from 'react'
import { SETUP_INTRO } from '../../constants'
import { Button } from '../ui/Button'
import { LockIcon } from '../ui/icons'

type Props = {
  open: boolean
  onContinue: () => void
  /** Fill every unanswered question with typical values and finish setup. */
  onSkipAll?: () => void
}

/**
 * SetupIntroDialog
 * @param props.open - Whether the pre-step-1 notice is showing
 * @param props.onContinue - Dismiss and reveal household step 1
 * @param props.onSkipAll - Fill every unanswered question with typical values instead
 * @returns Modal explaining local-only answers and why detail helps
 *
 * Native dialog so focus is trapped until Continue, Escape, or the backdrop.
 */
export function SetupIntroDialog({ open, onContinue, onSkipAll }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return
    if (open) {
      if (!node.open) node.showModal()
    } else if (node.open) {
      node.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="vpp-dialog setup-intro"
      aria-labelledby="setup-intro-title"
      aria-modal="true"
      onClose={onContinue}
      onClick={(event) => {
        if (event.target === dialogRef.current) onContinue()
      }}
    >
      {open ? (
        <div className="vpp-dialog__panel">
          <header className="vpp-dialog__header">
            <div>
              <p className="eyebrow">{SETUP_INTRO.eyebrow}</p>
              <h3 id="setup-intro-title">{SETUP_INTRO.title}</h3>
            </div>
          </header>
          <div className="vpp-dialog__body">
            <p className="setup-intro__privacy">
              <LockIcon width={16} height={16} />
              {SETUP_INTRO.privacy}
            </p>
            <p className="vpp-dialog__lede setup-intro__accuracy">{SETUP_INTRO.accuracy}</p>
            {onSkipAll ? <p className="setup-intro__skip-note">{SETUP_INTRO.skipAllNote}</p> : null}
          </div>
          <footer className="vpp-dialog__footer setup-intro__footer">
            {onSkipAll ? (
              <Button variant="secondary" onClick={onSkipAll}>
                {SETUP_INTRO.skipAll}
              </Button>
            ) : null}
            <Button variant="primary" onClick={onContinue}>
              {SETUP_INTRO.action}
            </Button>
          </footer>
        </div>
      ) : null}
    </dialog>
  )
}
