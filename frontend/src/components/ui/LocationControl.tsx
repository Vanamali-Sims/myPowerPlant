/**
 * Compact postcode pill used in the setup header and profile screen.
 */
import { useId, useState } from 'react'
import { FIELD_BOUNDS } from '../../constants/validation'
import { locationFromPostcode } from '../../data/profileOptions'
import { postcodeFromDevice } from '../../lib/geolocation'
import { postcodeError } from '../../lib/validateProfile'
import { PinIcon } from './icons'

type Props = {
  postcode: string
  onPostcodeChange: (postcode: string) => void
  /** A message from the form around it, e.g. after Continue. */
  error?: string
}

function isUsable(postcode: string): boolean {
  return Boolean(postcode) && !postcodeError(postcode)
}

/**
 * LocationControl
 * @param props.postcode - Current postcode string
 * @param props.onPostcodeChange - Called with a Victorian postcode from typing or locating
 * @returns JSX.Element
 *
 * The pill only ever shows a Victorian postcode: while the form holds one that
 * is not (say 1234 typed into the household question), it keeps showing the
 * last good one. What is typed here is held until it is a Victorian postcode,
 * and only then handed to the form; leaving it with anything else says why
 * and keeps the typing so it can be fixed. Leaving it empty goes back.
 */
export function LocationControl({ postcode, onPostcodeChange, error: formError }: Props) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [leftError, setLeftError] = useState('')
  /** What is being typed here, until it is a Victorian postcode; null when not editing. */
  const [draft, setDraft] = useState<string | null>(null)
  const [lastGood, setLastGood] = useState(isUsable(postcode) ? postcode : '')
  // Follow the form whenever it holds a Victorian postcode (updated while rendering, no effect).
  if (isUsable(postcode) && postcode !== lastGood) setLastGood(postcode)
  const shown = draft ?? (isUsable(postcode) ? postcode : lastGood)
  const errorId = useId()
  const place = isUsable(shown) ? locationFromPostcode(shown) : ''
  const message = error || leftError || formError || ''

  async function locateMe() {
    setError('')
    setLocating(true)
    try {
      const next = await postcodeFromDevice()
      setLeftError('')
      setDraft(null)
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
          maxLength={FIELD_BOUNDS.postcodeLength}
          placeholder="Postcode"
          value={shown}
          aria-label="Postcode"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          onBlur={() => {
            if (draft === null) return
            if (!draft) {
              setDraft(null)
              setLeftError('')
              return
            }
            const problem = postcodeError(draft)
            if (problem) setLeftError(problem)
            else setDraft(null)
          }}
          onChange={(event) => {
            setError('')
            setLeftError('')
            const next = event.target.value.replace(/\D/g, '').slice(0, FIELD_BOUNDS.postcodeLength)
            setDraft(next)
            if (isUsable(next)) onPostcodeChange(next)
          }}
        />
        {place ? <span className="location-control__place">{place}</span> : null}
        <button
          type="button"
          className="location-control__locate"
          onClick={() => void locateMe()}
          disabled={locating}
          aria-label="Use my location"
          title="Use my location (stays on this device)"
        >
          <PinIcon width={14} height={14} />
        </button>
      </div>
      {message ? (
        <p id={errorId} className="location-control__error" role="alert">
          {message}
        </p>
      ) : null}
      {locating ? <p className="location-control__hint">Finding your postcode…</p> : null}
    </div>
  )
}
