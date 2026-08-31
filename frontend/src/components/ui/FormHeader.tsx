import { BoltIcon } from './icons'
import { LocationControl } from './LocationControl'

type Props = {
  postcode: string
  onPostcodeChange: (postcode: string) => void
  onLogoClick: () => void
}

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
