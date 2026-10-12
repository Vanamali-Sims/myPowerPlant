/**
 * Setup-wizard header: wordmark plus the postcode location control.
 */
import { MyPowerPlantMark } from './MyPowerPlantMark'
import { LocationControl } from './LocationControl'

type Props = {
  postcode: string
  onPostcodeChange: (postcode: string) => void
  onLogoClick: () => void
  /** Postcode message from the form, shown under the postcode. */
  postcodeError?: string
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
export function FormHeader({ postcode, onPostcodeChange, onLogoClick, postcodeError }: Props) {
  return (
    <header className="form-header">
      <button
        type="button"
        className="brand brand--button"
        onClick={onLogoClick}
        aria-label="MyPowerPlant home"
      >
        <span className="brand__mark brand__mark--logo">
          <MyPowerPlantMark width={28} height={28} />
        </span>
        MyPowerPlant
      </button>
      <LocationControl postcode={postcode} onPostcodeChange={onPostcodeChange} error={postcodeError} />
    </header>
  )
}
