/**
 * Frontend API base URL, path helpers, and the public geocode endpoint.
 *
 * VITE_API_BASE_URL stays an env var; this file is the only place the rest of
 * the app should read it from.
 */

export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL as string | undefined

export const API_PATHS = {
  submit: '/api/submit',
  profile: (householdId: string) => `/api/profile/${householdId}`,
  methodology: '/api/methodology',
} as const

export const GEOCODE_ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

export const GEO_TIMEOUT_MS = 12000
