/**
 * Setup-wizard header: wordmark plus the postcode location control.
 */
import { BoltIcon } from './icons'
import { LocationControl } from './LocationControl'

type Props = {
  postcode: string
  onPostcodeChange: (postcode: string) => void
  onLogoClick: () => void
}

/**
 * FormHeader
 * @param props.postcode - Current household postcode
 * @param props.onLogoClick - Return to the welcome screen
 * @returns JSX.Element
 *
 * The logo is a button so keyboard users can leave setup without the rail.
 * Location sits on the right to match the logged-in header pattern.
 */
export function FormHeader({ postcode, onPostcodeChange, onLogoClick }: Props) {
  return (
    <header className="form-header">
      <button
        type="button"
        className="brand brand--button"
        onClick={onLogoClick}
        aria-label="MyPowerPlant home"
      >
        <span className="brand__mark">
          <BoltIcon width={14} height={14} />
        </span>
        MyPowerPlant
      </button>
      <LocationControl postcode={postcode} onPostcodeChange={onPostcodeChange} />
    </header>
  )
}
