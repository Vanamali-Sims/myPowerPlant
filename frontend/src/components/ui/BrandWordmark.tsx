import logoOnDark from '../../assets/MyPowerPlant_logo_darkmode.png'
import logoOnLight from '../../assets/MyPowerPlant_wordmark.png'

type Props = {
  /** `on-light` for cream/white headers; `on-dark` for deep surfaces. */
  variant?: 'on-light' | 'on-dark'
  className?: string
}

const SRC = {
  'on-light': logoOnLight,
  'on-dark': logoOnDark,
} as const

/**
 * BrandWordmark
 * @param props.variant - Which lockup to use against the surrounding surface
 * @returns Full MyPowerPlant logo image
 *
 * Decorative next to an aria-labelled home button — alt stays empty.
 */
export function BrandWordmark({ variant = 'on-light', className = 'brand__logo' }: Props) {
  return <img src={SRC[variant]} alt="" className={className} />
}
