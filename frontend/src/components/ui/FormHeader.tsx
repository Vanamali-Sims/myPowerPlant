import { BoltIcon } from './icons'
import { LocationControl } from './LocationControl'

type Props = {
  postcode: string
  onPostcodeChange: (postcode: string) => void
}

export function FormHeader({ postcode, onPostcodeChange }: Props) {
  return (
    <header className="form-header">
      <div className="brand">
        <span className="brand__mark">
          <BoltIcon width={14} height={14} />
        </span>
        MyPowerPlant
      </div>
      <LocationControl postcode={postcode} onPostcodeChange={onPostcodeChange} />
    </header>
  )
}
