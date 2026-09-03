/**
 * Pill-shaped brand button used across setup, profile, and the home page.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline-accent' | 'danger' | 'edit'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

/**
 * Button
 * @param props - Native button props plus a visual variant
 * @returns JSX.Element
 *
 * Defaults to type="button" so it never submits a parent form by accident.
 * Variant maps to the shared ui-btn class names in styles/ui.css.
 */
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
