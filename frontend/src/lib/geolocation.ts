/**
 * Browser geolocation helper used by the postcode “use my location” control.
 *
 * Reverse-geocodes via a public client API, then rejects anything that is not
 * a Victorian postcode so the wizard stays in-scope.
 */
import { GEO_TIMEOUT_MS, GEOCODE_ENDPOINT } from '../constants/api'
import { isVictorianPostcode } from './validateProfile'

type GeoResult = {
  postcode?: string
}

/**
 * postcodeFromDevice
 * @returns A 4-digit Victorian postcode from the device location
 *
 * Asks the browser for a coarse position, then looks up the postcode.
 * High accuracy is off so the prompt is faster and less battery-heavy.
 */
export async function postcodeFromDevice(): Promise<string> {
  const position = await readPosition()
  const url = `${GEOCODE_ENDPOINT}?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('We couldn’t read that location. Please enter your postcode.')
  }
  const data = (await response.json()) as GeoResult
  const postcode = (data.postcode ?? '').replace(/\s/g, '')
  if (!isVictorianPostcode(postcode)) {
    throw new Error('Please enter a Victorian postcode, or try again from Victoria.')
  }
  return postcode
}

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location isn’t available in this browser. Enter your postcode instead.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, () => {
      reject(
        new Error('Location permission was declined. You can type your postcode instead.'),
      )
    // Coarse + 12s cap: we only need a suburb-level postcode, not GPS lock.
    }, { enableHighAccuracy: false, timeout: GEO_TIMEOUT_MS })
  })
}
