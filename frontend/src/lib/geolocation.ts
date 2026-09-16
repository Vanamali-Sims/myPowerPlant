/**
 * Browser geolocation helper used by the postcode “use my location” control.
 *
 * GPS stays on this device. The nearest mapped Victorian postcode is chosen
 * from the in-app suburb table — nothing is sent to a reverse-geocode host.
 */
import { GEO_TIMEOUT_MS } from '../constants/api'
import { GEO_MAX_MATCH_KM, isInVictoria } from '../constants/validation'
import { nearestMappedPostcode } from '../data/profileOptions'
import { isVictorianPostcode } from './validateProfile'

/**
 * postcodeFromDevice
 * @returns A 4-digit Victorian postcode from the device location
 *
 * Asks the browser for a coarse position, then snaps to a known suburb.
 * High accuracy is off so the prompt is faster and less battery-heavy.
 */
export async function postcodeFromDevice(): Promise<string> {
  const position = await readPosition()
  const { latitude, longitude } = position.coords
  if (!isInVictoria(latitude, longitude)) {
    throw new Error('Please enter a Victorian postcode, or try again from Victoria.')
  }
  const postcode = nearestMappedPostcode(latitude, longitude, GEO_MAX_MATCH_KM)
  if (!postcode || !isVictorianPostcode(postcode)) {
    throw new Error('We found you in Victoria. Enter your postcode to continue.')
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
