/**
 * Get Reminded tab: choose a reminder period and see recommended days to
 * join a discharge event or opt out of one, based on the solar forecast.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_EVENT_TYPE,
  DEFAULT_REMINDER_PERIOD_DAYS,
  EVENT_TYPE_OPTIONS,
  EVENT_TYPE_RESULTS_HEADING,
  REMINDER_PERIOD_OPTIONS,
} from '../../constants'
import { DEFAULT_RESERVE_PERCENT, FIELD_BOUNDS, clampNumber } from '../../constants/validation'
import { coordsFromPostcode, locationFromPostcode } from '../../data/profileOptions'
import { formatKwh, parseCount } from '../../lib/kpis'
import { fetchMethodology, type MethodologyBundle } from '../../lib/methodologyApi'
import {
  buildReminderRecommendations,
  emptyStateMessage,
  resultsCaption,
  type ReminderRecommendation,
} from '../../lib/reminderForecast'
import {
  fetchSolarForecast,
  pointsForView,
  type SolarForecast,
  type SolarInputs,
} from '../../lib/solarForecast'
import type { ProfileData } from '../../types/profile'
import type { EventType } from '../../types/reminders'
import { Callout } from '../ui/Callout'
import { AlertIcon, BoltIcon, ChevronIcon } from '../ui/icons'
import { LocationControl } from '../ui/LocationControl'
import { SegmentedToggle } from '../ui/SegmentedToggle'
import { SelectField } from '../ui/SelectField'

/** Shown alongside the forecast when no postcode is set, matching the solar forecast fallback. */
const DEFAULT_LOCATION_PLACE = 'Melbourne, VIC'

type Props = {
  profile: ProfileData
  onLogoClick: () => void
}

/**
 * RemindersView
 * @param props.profile - Saved household profile, used to seed the starting location and system size
 * @param props.onLogoClick - Return to the home screen from the wordmark
 * @returns JSX.Element
 *
 * The reminder period and event type chosen here filter and switch between
 * the discharge and opt-out day lists. The postcode starts from the saved
 * profile but can be changed on this page alone, to preview a different
 * location's forecast without editing the profile. The opt-out list is
 * wired up separately; this only renders the discharge side for now.
 */
export function RemindersView({ profile, onLogoClick }: Props) {
  const [reminderPeriodDays, setReminderPeriodDays] = useState(DEFAULT_REMINDER_PERIOD_DAYS)
  const [eventType, setEventType] = useState<EventType>(DEFAULT_EVENT_TYPE)
  const [postcode, setPostcode] = useState(profile.postcode)
  const [openDate, setOpenDate] = useState<string | null>(null)

  const [bundle, setBundle] = useState<MethodologyBundle | null>(null)
  const [bundleError, setBundleError] = useState('')
  const [forecast, setForecast] = useState<SolarForecast | null>(null)
  const [forecastError, setForecastError] = useState('')

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
      ? (parseCount(profile.panelCount) * parseCount(profile.panelWatts)) / 1000
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
  }, [bundle, hasOwnSolar, profile.panelCount, profile.panelWatts, profile.solarDirection, postcode])

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

  const loading = Boolean(solarInputs) && !bundleError && !forecastError && forecast === null
  const resultsHeading = EVENT_TYPE_RESULTS_HEADING[eventType]
  const caption = resultsCaption(eventType, reservePercent)
  const emptyMessage = emptyStateMessage(eventType, reservePercent)

  function toggleRow(date: string) {
    setOpenDate((current) => (current === date ? null : date))
  }

  return (
    <div className="reminders">
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
        <LocationControl postcode={postcode} onPostcodeChange={setPostcode} />
      </header>

      <div className="reminders__intro">
        <h1>Get Reminded</h1>
        <p>
          Pick how far ahead to look, then switch between discharge and opt-out events to see
          the days that fit your solar forecast.
        </p>
      </div>

      {usingDefaultLocation ? (
        <Callout tone="neutral" icon={<AlertIcon />} title={`Using a default location: ${place}`}>
          No postcode is set yet, so this forecast uses a default location. Enter a postcode
          above to preview your own area, or set it in your profile to use it everywhere.
        </Callout>
      ) : null}

      <div className="reminders__controls">
        <div className="reminders__period">
          <SelectField
            label="Reminder period"
            value={reminderPeriodDays}
            options={REMINDER_PERIOD_OPTIONS}
            onChange={setReminderPeriodDays}
          />
        </div>
        <SegmentedToggle
          label="Alert type"
          value={eventType}
          options={EVENT_TYPE_OPTIONS}
          onChange={setEventType}
        />
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

      {eventType === 'discharge' && !loading && !bundleError && !forecastError ? (
        <section className="reminder-results" aria-labelledby="reminder-results-heading">
          <h2 id="reminder-results-heading">{resultsHeading}</h2>
          <p className="reminder-results__caption">{caption}</p>
          {recommendations.length === 0 ? (
            <Callout tone="neutral" icon={<AlertIcon />} title="No days to show yet">
              {emptyMessage}
            </Callout>
          ) : (
            <ul className="reminder-list">
              {recommendations.map((entry) => {
                const isOpen = openDate === entry.date
                const detailId = `reminder-detail-${entry.date}`
                return (
                  <li key={entry.date} className="reminder-row">
                    <button
                      type="button"
                      className="reminder-row__summary"
                      aria-expanded={isOpen}
                      aria-controls={detailId}
                      onClick={() => toggleRow(entry.date)}
                    >
                      <span className="reminder-row__date">{entry.dayLabel}</span>
                      <span className="reminder-row__meta">
                        <span className="reminder-row__estimate-inline">
                          {formatKwh(entry.forecastKwh)}
                          <span className="kpi-badge kpi-badge--estimate">Estimate</span>
                        </span>
                        <ChevronIcon
                          className={`reminder-row__chevron${isOpen ? ' is-open' : ''}`}
                          width={16}
                          height={16}
                        />
                      </span>
                    </button>
                    {isOpen ? (
                      <div id={detailId} className="reminder-row__detail">
                        <p className="reminder-row__reason">{entry.reason}</p>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}
