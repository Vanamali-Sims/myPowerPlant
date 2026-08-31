import { useState } from 'react'
import { locationFromPostcode } from '../../data/profileOptions'
import { postcodeFromDevice } from '../../lib/geolocation'
import { PinIcon } from './icons'

type Props = {
  postcode: string
  onPostcodeChange: (postcode: string) => void
}

export function LocationControl({ postcode, onPostcodeChange }: Props) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const place = locationFromPostcode(postcode)

  async function locateMe() {
    setError('')
    setLocating(true)
    try {
      const next = await postcodeFromDevice()
      onPostcodeChange(next)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not get your location.')
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="location-control-wrap">
      <div className="location-control">
        <span className="location-pill__dot" />
        <input
          className="location-control__input"
          inputMode="numeric"
          maxLength={4}
          placeholder="Postcode"
          value={postcode}
          aria-label="Postcode"
          onChange={(event) => {
            setError('')
            onPostcodeChange(event.target.value.replace(/\D/g, '').slice(0, 4))
          }}
        />
        {place ? <span className="location-control__place">{place}</span> : null}
        <button
          type="button"
          className="location-control__locate"
          onClick={() => void locateMe()}
          disabled={locating}
          aria-label="Use my location"
          title="Use my location"
        >
          <PinIcon width={14} height={14} />
        </button>
      </div>
      {error ? (
        <p className="location-control__error" role="alert">
          {error}
        </p>
      ) : null}
      {locating ? <p className="location-control__hint">Finding your postcode…</p> : null}
    </div>
  )
}
