import { isVictorianPostcode } from './validateProfile'

type GeoResult = {
  postcode?: string
}

export async function postcodeFromDevice(): Promise<string> {
  const position = await readPosition()
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
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
    }, { enableHighAccuracy: false, timeout: 12000 })
  })
}
