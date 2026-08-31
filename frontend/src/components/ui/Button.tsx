import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline-accent' | 'danger' | 'edit'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}: Props) {
  return (
    <button type={type} className={`ui-btn ui-btn--${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}
