/**
 * Get Reminded tab: the next best day and the solar forecast on the left, the
 * recommended days to add to a calendar on the right.
 *
 * Everything it uses — location, panels, direction, battery reserve — comes
 * from the saved profile.
 */
import { useEffect, useMemo, useState } from 'react'
import { REMINDER_PERIOD_OPTIONS, TIMEFRAMES } from '../../constants'
import { DEFAULT_RESERVE_PERCENT, FIELD_BOUNDS, clampNumber } from '../../constants/validation'
import { coordsFromPostcode, locationFromPostcode } from '../../data/profileOptions'
import { buildIcsFile, downloadIcsFile } from '../../lib/calendarExport'
import { formatKwh, panelWattsOrTypical, parseCount } from '../../lib/kpis'
import { fetchMethodology, type MethodologyBundle } from '../../lib/methodologyApi'
import { buildReminderRecommendations, emptyStateMessage, type ReminderRecommendation } from '../../lib/reminderForecast'
import { addReminders, loadReminders, reminderKey, removeReminder, type SavedReminder } from '../../lib/reminderStorage'
import {
  fetchSolarForecast,
  pointsForView,
  type ForecastView,
  type SolarForecast,
  type SolarInputs,
} from '../../lib/solarForecast'
import type { ProfileData } from '../../types/profile'
import type { EventType } from '../../types/reminders'
import { Button } from '../ui/Button'
import { BoltIcon, CalendarIcon, DownloadIcon } from '../ui/icons'
import { ReminderChart } from './ReminderChart'

/** Used for the forecast when no postcode is set, matching the solar forecast fallback. */
const DEFAULT_LOCATION_PLACE = 'Melbourne, VIC'

const EVENT_CHOICES: { value: EventType; label: string }[] = [
  { value: 'discharge', label: 'Discharge' },
  { value: 'opt_out', label: 'Opt-out' },
]

type Props = {
  profile: ProfileData
  onLogoClick: () => void
  eventType: EventType
  onEventType: (next: EventType) => void
  reminderPeriodDays: string
  onReminderPeriodDays: (next: string) => void
}

function keysOf(rows: SavedReminder[]): Set<string> {
  return new Set(rows.map((row) => reminderKey(row.eventType, row.date)))
}

function percentFrom(value: number, base: number): number {
  return base > 0 ? Math.round((Math.abs(value - base) / base) * 100) : 0
}

/**
 * nextDayDetail
 * @param entry - The soonest recommended day
 * @param eventType - Discharge (above typical) or opt-out (below typical)
 * @returns One line under the next best day, from figures the list already has
 */
function nextDayDetail(entry: ReminderRecommendation, eventType: EventType): string {
  const kwh = formatKwh(entry.forecastKwh)
  if (entry.typicalKwh <= 0) return `${kwh} forecast`
  const direction = eventType === 'discharge' ? 'above' : 'below'
  return `${kwh} forecast · ${percentFrom(entry.forecastKwh, entry.typicalKwh)}% ${direction} a typical day`
}

function recommendedLede(count: number): string {
  if (count === 0) return 'No recommended days in this period.'
  if (count === 1) return 'Here is the 1 recommended day.'
  return `Here are the ${count} recommended days.`
}

function dayBadge(date: string): { weekday: string; day: string } {
  const value = new Date(`${date}T00:00:00`)
  return {
    weekday: value.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase(),
    day: String(value.getDate()),
  }
}

type PillToggleProps<T extends string> = {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  tone?: 'light' | 'dark'
}

/** Compact segmented control with no visible label; the label names the group for screen readers. */
function PillToggle<T extends string>({ label, value, options, onChange, tone = 'light' }: PillToggleProps<T>) {
  return (
    <div className={`reminders-pill reminders-pill--${tone}`} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={`reminders-pill__option${value === option.value ? ' is-selected' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * RemindersView
 * @param props.profile - Saved household profile: postcode, panels, direction, and reserve
 * @param props.onLogoClick - Return to the home screen from the wordmark
 * @returns JSX.Element
 *
 * The reminder period and event type choose which days are recommended. A
 * switch beside each day selects it; the download button (counting the
 * selected days) or "Download all" saves them as one calendar file and
 * remembers them on this device for the profile list.
 */
export function RemindersView({
  profile,
  onLogoClick,
  eventType,
  onEventType,
  reminderPeriodDays,
  onReminderPeriodDays,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => keysOf(loadReminders()))
  const [status, setStatus] = useState('')
  const [forecastView, setForecastView] = useState<ForecastView>('weekly')

  const [bundle, setBundle] = useState<MethodologyBundle | null>(null)
  const [bundleError, setBundleError] = useState('')
  const [forecast, setForecast] = useState<SolarForecast | null>(null)
  const [forecastError, setForecastError] = useState('')

  const postcode = profile.postcode
  const usingDefaultLocation = postcode.trim() === ''
  const place = locationFromPostcode(postcode) || DEFAULT_LOCATION_PLACE

  useEffect(() => {
    let cancelled = false
    void fetchMethodology().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setBundle(result.data)
        setBundleError('')
      } else {
        setBundleError(result.error)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const hasOwnSolar = profile.hasSolar === 'yes'

  const solarInputs: SolarInputs | null = useMemo(() => {
    if (!bundle) return null
    const systemKw = hasOwnSolar
      ? (parseCount(profile.panelCount) * panelWattsOrTypical(profile)) / 1000
      : bundle.methodology.typicalPotentialKw
    const orientationFactor =
      bundle.orientationFactors[profile.solarDirection] ?? bundle.orientationFactors.not_sure ?? 1
    const { lat, lon } = coordsFromPostcode(postcode)
    return {
      lat,
      lon,
      systemKw,
      orientationFactor,
      performanceRatio: bundle.methodology.solarPerformanceRatio,
    }
  }, [bundle, hasOwnSolar, profile, postcode])

  useEffect(() => {
    if (!solarInputs) return
    let cancelled = false
    fetchSolarForecast(solarInputs)
      .then((result) => {
        if (cancelled) return
        setForecast(result)
        setForecastError('')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setForecast(null)
        setForecastError(err instanceof Error ? err.message : 'Could not load the solar forecast.')
      })
    return () => {
      cancelled = true
    }
  }, [solarInputs])

  const typicalDailyKwh = useMemo(() => {
    if (!bundle || !solarInputs) return 0
    return (
      solarInputs.systemKw *
      bundle.methodology.melbournePeakSunHours *
      bundle.methodology.solarPerformanceRatio *
      solarInputs.orientationFactor
    )
  }, [bundle, solarInputs])

  const periodDays = Number.parseInt(reminderPeriodDays, 10)
  const dailyPoints = useMemo(() => {
    if (!forecast) return []
    return pointsForView(forecast, 'fortnightly').slice(0, periodDays)
  }, [forecast, periodDays])

  const reservePercent = clampNumber(
    Number.parseInt(profile.reservePercent || DEFAULT_RESERVE_PERCENT, 10),
    FIELD_BOUNDS.reservePercent.min,
    FIELD_BOUNDS.reservePercent.max,
  )

  const recommendations: ReminderRecommendation[] = useMemo(
    () => buildReminderRecommendations(dailyPoints, typicalDailyKwh, eventType, reservePercent),
    [dailyPoints, typicalDailyKwh, eventType, reservePercent],
  )

  // The same line buildReminderRecommendations uses: typical day ± the reserve margin.
  const target =
    typicalDailyKwh > 0
      ? typicalDailyKwh * (eventType === 'discharge' ? 1 + reservePercent / 100 : 1 - reservePercent / 100)
      : null
  const chartPoints = forecast ? pointsForView(forecast, forecastView) : []
  const recommendedDates = new Set(recommendations.map((entry) => entry.date))
  const loading = Boolean(solarInputs) && !bundleError && !forecastError && forecast === null
  const ready = !loading && !bundleError && !forecastError && Boolean(forecast)
  const nextEntry = recommendations[0] ?? null
  const chosen = recommendations.filter((entry) => selected.has(reminderKey(eventType, entry.date)))

  /**
   * toggleDay
   * Selects or clears a day. Clearing a day that was downloaded before also
   * takes it off the device list (the calendar file itself is untouched).
   */
  function toggleDay(entry: ReminderRecommendation) {
    const key = reminderKey(eventType, entry.date)
    setStatus('')
    if (selected.has(key)) {
      const saved = removeReminder(eventType, entry.date)
      setSelected((current) => {
        const next = new Set(current)
        next.delete(key)
        for (const savedKey of keysOf(saved)) next.add(savedKey)
        return next
      })
      return
    }
    setSelected((current) => new Set(current).add(key))
  }

  /** Saves these days as one calendar file and remembers them on this device. */
  function download(entries: ReminderRecommendation[]) {
    if (!entries.length) return
    const content = buildIcsFile(entries, eventType)
    downloadIcsFile(`mypowerplant-${eventType.replace('_', '-')}-reminders.ics`, content)
    const saved = addReminders(entries.map((entry) => ({ date: entry.date, eventType })))
    setSelected((current) => new Set([...current, ...keysOf(saved)]))
    setStatus(`${entries.length === 1 ? '1 day' : `${entries.length} days`} saved to your calendar file.`)
  }

  return (
    <div className="reminders reminders-page">
      <header className="reminders__top">
        <button
          type="button"
          className="brand brand--button brand--desktop-hidden"
          onClick={onLogoClick}
          aria-label="MyPowerPlant home"
        >
          <span className="brand__mark">
            <BoltIcon width={14} height={14} />
          </span>
          MyPowerPlant
        </button>
      </header>

      <div className="reminders-page__head">
        <div>
          <h1 className="reminders-page__title">Get Reminded</h1>
          <p className="reminders-page__lede">Know when to share or keep.</p>
        </div>
        <div className="reminders-page__toolbar">
          <label className="reminders-period">
            <CalendarIcon width={16} height={16} />
            <span>Reminder period</span>
            <select value={reminderPeriodDays} onChange={(event) => onReminderPeriodDays(event.target.value)}>
              {REMINDER_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <PillToggle label="Event type" value={eventType} options={EVENT_CHOICES} onChange={onEventType} tone="dark" />
        </div>
      </div>

      {bundleError ? (
        <p className="app-notice" role="status">
          Reminders could not be loaded. {bundleError}
        </p>
      ) : null}
      {forecastError ? (
        <p className="app-notice" role="status">
          {forecastError}
        </p>
      ) : null}
      {loading ? (
        <p className="app-notice" role="status">
          Loading the solar forecast…
        </p>
      ) : null}

      {ready ? (
        <section className="reminders-board" aria-label="Reminders">
          <div className="reminders-board__forecast">
            <p className="eyebrow reminders-board__eyebrow">Next best day</p>
            <h2 className="reminders-board__day">{nextEntry ? nextEntry.dayLabel : 'No day in this period'}</h2>
            <p className="reminders-board__detail">
              {nextEntry ? nextDayDetail(nextEntry, eventType) : emptyStateMessage(eventType, reservePercent)}
            </p>

            <div className="reminders-board__chart-head">
              <div className="reminders-board__chart-title">
                <h3 className="eyebrow reminders-board__eyebrow">
                  {hasOwnSolar ? 'Predicted solar generation' : 'Predicted solar potential'}
                </h3>
                {forecastView === 'daily' ? null : (
                  <span className="reminders-board__legend">
                    <span className="reminders-board__swatch" aria-hidden="true" />
                    Recommended day
                  </span>
                )}
              </div>
              <PillToggle
                label="Forecast range"
                value={forecastView}
                options={TIMEFRAMES}
                onChange={setForecastView}
                tone="dark"
              />
            </div>

            <ReminderChart
              points={chartPoints}
              target={target}
              recommended={recommendedDates}
              hourly={forecastView === 'daily'}
            />

            <p className="reminders-board__note">
              {forecastView === 'daily' ? 'kWh/hour, today' : 'kWh/day'} · Open-Meteo forecast for {place} — not a
              meter reading.
              {usingDefaultLocation ? ' Add your postcode to your profile to use your own area.' : ''}
            </p>
            {target !== null ? (
              <p className="reminders-board__note">
                Target = a typical day for this system ({formatKwh(typicalDailyKwh)})
                {eventType === 'discharge' ? ' plus' : ' minus'} your {reservePercent}% battery reserve.
              </p>
            ) : null}
          </div>

          <div className="reminders-board__list">
            <div className="reminders-board__list-inner">
              <h2 className="reminders-board__list-title">Remind me</h2>
              <p className="reminders-board__list-lede">{recommendedLede(recommendations.length)}</p>
              {recommendations.length === 0 ? (
                <p className="reminders-board__empty">{emptyStateMessage(eventType, reservePercent)}</p>
              ) : (
                <ul className="reminder-days">
                  {recommendations.map((entry) => {
                    const badge = dayBadge(entry.date)
                    const on = selected.has(reminderKey(eventType, entry.date))
                    const pct = target ? percentFrom(entry.forecastKwh, target) : 0
                    const direction = eventType === 'discharge' ? 'above' : 'below'
                    return (
                      <li key={entry.date} className="reminder-day">
                        <span className="reminder-day__badge" aria-hidden="true">
                          <span>{badge.weekday}</span>
                          <strong>{badge.day}</strong>
                        </span>
                        <span className="reminder-day__copy">
                          <span className="reminder-day__kwh">
                            {entry.forecastKwh.toFixed(1)} <small>kWh</small>
                          </span>
                          <span className="reminder-day__meta">
                            Forecast ·{' '}
                            <b>
                              {eventType === 'discharge' ? '+' : '−'}
                              {pct}% {direction} target
                            </b>
                          </span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={`Remind me on ${entry.dayLabel}`}
                          className={`reminder-switch${on ? ' is-on' : ''}`}
                          onClick={() => toggleDay(entry)}
                        >
                          <span className="reminder-switch__knob" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <Button
                variant="primary"
                className="reminders-board__download"
                disabled={!chosen.length}
                onClick={() => download(chosen)}
              >
                <DownloadIcon width={16} height={16} />
                {chosen.length ? `Download selected - ${chosen.length}` : 'Download selected'}
              </Button>
              {recommendations.length ? (
                <button
                  type="button"
                  className="reminders-board__download-all"
                  onClick={() => download(recommendations)}
                >
                  Download all
                </button>
              ) : null}
              <p className="reminders-board__privacy">Saved to your calendar only — nothing is uploaded.</p>
              <p className="reminders-board__status" role="status">
                {status}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
