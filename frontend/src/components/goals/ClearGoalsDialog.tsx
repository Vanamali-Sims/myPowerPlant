/**
 * Confirmation before clearing goals and history from this device.
 */
import { useEffect, useRef } from 'react'
import { Button } from '../ui/Button'
import { AlertIcon } from '../ui/icons'

type Props = {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * ClearGoalsDialog
 * @param props.open - Whether the confirmation is showing
 * @returns A native modal dialog, same pattern as the setup intro
 *
 * showModal traps focus until a button, Escape, or the backdrop closes it.
 * Cancel takes focus first so the safe choice is the default.
 */
export function ClearGoalsDialog({ open, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

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

  return (
    <dialog
      ref={dialogRef}
      className="vpp-dialog goals-clear-dialog"
      aria-labelledby="goals-clear-title"
      aria-describedby="goals-clear-body"
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
            <h3 id="goals-clear-title">Clear your goals and history?</h3>
          </header>
          <div className="vpp-dialog__body">
            <p id="goals-clear-body" className="goals-clear-dialog__body">
              <AlertIcon width={16} height={16} />
              <span>
                This removes your goals, your month-by-month history, and any reached goals from
                this device. Your profile is not changed. This cannot be undone.
              </span>
            </p>
          </div>
          <footer className="vpp-dialog__footer goals-clear-dialog__footer">
            <button ref={cancelRef} type="button" className="ui-btn ui-btn--secondary" onClick={onCancel}>
              Cancel
            </button>
            <Button variant="danger" onClick={onConfirm}>
              Clear goals and history
            </Button>
          </footer>
        </div>
      ) : null}
    </dialog>
  )
}
