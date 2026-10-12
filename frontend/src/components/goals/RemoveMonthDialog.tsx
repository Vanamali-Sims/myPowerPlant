/**
 * Confirmation before removing one month from the history.
 */
import { useEffect, useRef } from 'react'
import { formatMonthLabel } from '../../lib/goals/goalFormat'
import { Button } from '../ui/Button'
import { AlertIcon } from '../ui/icons'

type Props = {
  /** YYYY-MM being removed, or null when the dialog is closed. */
  month: string | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * RemoveMonthDialog
 * @param props.month - Month to remove; the dialog shows while this is set
 * @returns A native modal dialog, same pattern as ClearGoalsDialog
 *
 * Cancel takes focus first so the safe choice is the default.
 */
export function RemoveMonthDialog({ month, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const open = month !== null

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return
    if (open) {
      if (!node.open) node.showModal()
      cancelRef.current?.focus()
    } else if (node.open) {
      node.close()
    }
  }, [open])

  const label = month ? formatMonthLabel(month) : ''

  return (
    <dialog
      ref={dialogRef}
      className="vpp-dialog goals-clear-dialog"
      aria-labelledby="goals-remove-title"
      aria-describedby="goals-remove-body"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onCancel()
      }}
    >
      {open ? (
        <div className="vpp-dialog__panel">
          <header className="vpp-dialog__header">
            <h3 id="goals-remove-title">Remove {label} from your history?</h3>
          </header>
          <div className="vpp-dialog__body">
            <p id="goals-remove-body" className="goals-clear-dialog__body">
              <AlertIcon width={16} height={16} />
              <span>
                This takes the figures for {label} out of your totals, graph, and history on this
                device. Goals you have already reached stay on record. You can add the month back
                by uploading its file again.
              </span>
            </p>
          </div>
          <footer className="vpp-dialog__footer goals-clear-dialog__footer">
            <button ref={cancelRef} type="button" className="ui-btn ui-btn--secondary" onClick={onCancel}>
              Cancel
            </button>
            <Button variant="danger" onClick={onConfirm}>
              Remove {label}
            </Button>
          </footer>
        </div>
      ) : null}
    </dialog>
  )
}
