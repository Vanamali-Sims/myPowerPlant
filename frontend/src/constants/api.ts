/**
 * Frontend API base URL, path helpers, and public weather endpoint.
 *
 * VITE_API_BASE_URL stays an env var; this file is the only place the rest of
 * the app should read it from. Device location is resolved on-device — there
 * is no third-party geocode host here.
 */

export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL as string | undefined

export const API_PATHS = {
  methodology: '/api/methodology',
  advice: '/api/advice',
} as const

export const GEO_TIMEOUT_MS = 12000

/** Free, keyless solar-irradiance forecast used by the solar generation chart. */
export const WEATHER_FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'
