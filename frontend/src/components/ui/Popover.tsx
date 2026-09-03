/**
 * Small status bubble for locked nav items and “coming soon” buttons.
 */

type Placement = 'right' | 'bottom' | 'bottom-end'

type Props = {
  open: boolean
  message: string
  placement?: Placement
}

/**
 * Popover
 * @param props.open - Whether the bubble is visible
 * @param props.message - Short explanation to show
 * @returns JSX.Element | null
 *
 * Renders nothing when closed so it does not take layout space.
 * role="status" announces the message without moving focus.
 */
export function Popover({ open, message, placement = 'bottom' }: Props) {
  if (!open) return null
  return (
    <span className={`popover popover--${placement}`} role="status">
      {message}
    </span>
  )
}
