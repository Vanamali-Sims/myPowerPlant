/**
 * Weather-driven solar generation forecast.
 *
 * Pulls predicted solar irradiance from Open-Meteo (free, no API key) and turns
 * it into kWh for this household's array, using system size, roof orientation,
 * and the system performance ratio. Nothing here is a live meter reading — it
 * is a forward estimate from a public weather forecast.
 */
import { WEATHER_FORECAST_ENDPOINT } from '../constants/api'

/** Megajoules per square metre to kilowatt-hours per square metre. */
const MJ_TO_KWH = 1 / 3.6

/** Open-Meteo currently forecasts at most 16 days ahead. */
const FORECAST_DAYS = 16

export type ForecastPoint = {
  /** Short axis label, e.g. "6am" for the daily view or "Tue 9" for others. */
  label: string
  /** Predicted generation for this bucket, in kWh. */
  kwh: number
  /** ISO date (YYYY-MM-DD) this point falls on, for reminders that need a real date. */
  date: string
}

export type SolarForecast = {
  /** One point per hour for the first forecast day (a generation curve). */
  hourlyToday: ForecastPoint[]
  /** One point per day for the whole forecast horizon (up to 14 days). */
  daily: ForecastPoint[]
  /** Where the forecast is centred, for the caption. */
  placeLabel: string
}

export type SolarInputs = {
  lat: number
  lon: number
  /** Array size in kW: (panels × watts) / 1000, or the typical-potential size. */
  systemKw: number
  /** Roof-direction derate from the methodology bundle (N = 1.0, S = 0.55, …). */
  orientationFactor: number
  /** System/inverter losses (seeded performance ratio, ~0.8). */
  performanceRatio: number
}

type OpenMeteoResponse = {
  hourly?: { time: string[]; shortwave_radiation: (number | null)[] }
  daily?: { time: string[]; shortwave_radiation_sum: (number | null)[] }
}

const HOUR_LABELS = (iso: string): string => {
  const hour = Number.parseInt(iso.slice(11, 13), 10)
  const suffix = hour < 12 ? 'am' : 'pm'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}${suffix}`
}

const DAY_LABEL = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`)
  const weekday = date.toLocaleDateString('en-AU', { weekday: 'short' })
  return `${weekday} ${date.getDate()}`
}

/**
 * fetchSolarForecast
 * @param inputs - Location plus this household's array size and derates
 * @returns Hourly (today) and daily generation estimates, or throws on failure
 *
 * Hourly generation = (W/m² ÷ 1000) × kW × performance ratio × orientation.
 * Daily generation  = (MJ/m² ÷ 3.6) × kW × performance ratio × orientation,
 * because MJ/m² ÷ 3.6 is the day's equivalent peak-sun-hours.
 */
export async function fetchSolarForecast(inputs: SolarInputs): Promise<SolarForecast> {
  const { lat, lon, systemKw, orientationFactor, performanceRatio } = inputs
  const derate = performanceRatio * orientationFactor
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: 'shortwave_radiation',
    daily: 'shortwave_radiation_sum',
    forecast_days: FORECAST_DAYS.toString(),
    timezone: 'auto',
  })

  const response = await fetch(`${WEATHER_FORECAST_ENDPOINT}?${params.toString()}`)
  if (!response.ok) {
    throw new Error('The weather service did not respond. Try again shortly.')
  }
  const data = (await response.json()) as OpenMeteoResponse
  if (!data.daily?.time?.length) {
    throw new Error('No solar forecast was available for this location.')
  }

  const firstDay = data.daily.time[0]
  const hourlyToday: ForecastPoint[] = []
  if (data.hourly?.time?.length) {
    for (let i = 0; i < data.hourly.time.length; i += 1) {
      const iso = data.hourly.time[i]
      if (!iso.startsWith(firstDay)) continue
      const watts = data.hourly.shortwave_radiation[i] ?? 0
      hourlyToday.push({
        label: HOUR_LABELS(iso),
        kwh: (watts / 1000) * systemKw * derate,
        date: firstDay,
      })
    }
  }

  const daily: ForecastPoint[] = data.daily.time.map((iso, i) => {
    const mj = data.daily?.shortwave_radiation_sum?.[i] ?? 0
    return {
      label: DAY_LABEL(iso),
      kwh: mj * MJ_TO_KWH * systemKw * derate,
      date: iso,
    }
  })

  return { hourlyToday, daily, placeLabel: '' }
}

export type ForecastView = 'daily' | 'weekly' | 'fortnightly'

/**
 * pointsForView
 * @param forecast - A resolved solar forecast
 * @param view - Daily (today, hourly), weekly (7 days), or fortnightly (14 days)
 * @returns The points to draw for the selected view
 */
export function pointsForView(forecast: SolarForecast, view: ForecastView): ForecastPoint[] {
  if (view === 'daily') return forecast.hourlyToday
  if (view === 'weekly') return forecast.daily.slice(0, 7)
  return forecast.daily.slice(0, 14)
}
