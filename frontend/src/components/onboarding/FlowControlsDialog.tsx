import { useEffect, useRef, type ReactNode } from 'react'
import { FLOW_CONTROLS } from '../../constants/onboarding'
import { Button } from '../ui/Button'
import { CloseIcon } from '../ui/icons'

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * Modal shell for path / reset actions (Rain rail and similar).
 */
export function FlowControlsDialog({ open, onClose, children }: Props) {
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
      className="vpp-dialog flow-controls-dialog"
      aria-labelledby="flow-controls-dialog-title"
      aria-modal="true"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      {open ? (
        <div className="vpp-dialog__panel flow-controls-dialog__panel">
          <header className="vpp-dialog__header">
            <h3 id="flow-controls-dialog-title">{FLOW_CONTROLS.title}</h3>
            <Button type="button" className="vpp-dialog__close" variant="edit" onClick={onClose}>
              <CloseIcon width={16} height={16} />
              <span className="visually-hidden">Close</span>
            </Button>
          </header>
          <div className="vpp-dialog__body flow-controls-dialog__body">{children}</div>
        </div>
      ) : null}
    </dialog>
  )
}
