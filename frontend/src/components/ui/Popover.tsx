type Placement = 'right' | 'bottom' | 'bottom-end'

type Props = {
  open: boolean
  message: string
  placement?: Placement
}

export function Popover({ open, message, placement = 'bottom' }: Props) {
  if (!open) return null
  return (
    <span className={`popover popover--${placement}`} role="status">
      {message}
    </span>
  )
}
