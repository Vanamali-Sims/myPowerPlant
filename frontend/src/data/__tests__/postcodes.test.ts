/**
 * Postcode labels, forecast points and the on-device nearest-postcode match,
 * across Greater Melbourne and the regional centres.
 */
import { describe, expect, it } from 'vitest'

import { MELBOURNE_POSTCODES } from '../melbournePostcodes'
import { coordsFromPostcode, locationFromPostcode, nearestMappedPostcode } from '../profileOptions'

describe('locationFromPostcode', () => {
  it.each([
    ['3168', 'Clayton, VIC'],
    ['3169', 'Clarinda, VIC'],
    ['3186', 'Brighton, VIC'],
    ['3204', 'Bentleigh, VIC'],
    ['3165', 'Bentleigh East, VIC'],
    ['3101', 'Kew, VIC'],
    ['3124', 'Camberwell, VIC'],
    ['3128', 'Box Hill, VIC'],
    ['3199', 'Frankston, VIC'],
    ['3175', 'Dandenong, VIC'],
    ['3030', 'Werribee, VIC'],
    ['3977', 'Cranbourne, VIC'],
    ['3810', 'Pakenham, VIC'],
    ['3429', 'Sunbury, VIC'],
    ['3220', 'Geelong, VIC'],
  ])('names %s as %s', (postcode, label) => {
    expect(locationFromPostcode(postcode)).toBe(label)
  })

  it('falls back to the state for other Victorian codes, and nothing elsewhere', () => {
    expect(locationFromPostcode('3909')).toBe('VIC')
    expect(locationFromPostcode('2000')).toBe('')
  })
})

describe('nearestMappedPostcode', () => {
  it.each([
    [-37.9134, 145.1267, '3168'],
    [-37.9451, 145.1153, '3169'],
    [-37.917, 145.0368, '3204'],
    [-37.8074, 145.0366, '3101'],
  ])('matches %f, %f to %s', (lat, lon, postcode) => {
    expect(nearestMappedPostcode(lat, lon, 25)).toBe(postcode)
  })

  it('finds nothing far from Victoria', () => {
    expect(nearestMappedPostcode(-33.8688, 151.2093, 25)).toBeNull()
  })
})

describe('Melbourne postcode data', () => {
  it('has each postcode once, with a name and a point in Greater Melbourne', () => {
    const codes = MELBOURNE_POSTCODES.map(([postcode]) => postcode)
    expect(codes.length).toBeGreaterThan(250)
    expect(new Set(codes).size).toBe(codes.length)
    for (const [postcode, suburb, lat, lon] of MELBOURNE_POSTCODES) {
      expect(postcode).toMatch(/^3\d{3}$/)
      expect(suburb.trim()).not.toBe('')
      expect(lat).toBeGreaterThan(-38.6)
      expect(lat).toBeLessThan(-37.1)
      expect(lon).toBeGreaterThan(144.2)
      expect(lon).toBeLessThan(146.2)
    }
  })

  it('gives the forecast a suburb point, and Melbourne for unknown codes', () => {
    expect(coordsFromPostcode('3168')).toEqual({ lat: -37.9134, lon: 145.1267 })
    expect(coordsFromPostcode('3909')).toEqual({ lat: -37.8136, lon: 144.9631 })
  })
})
