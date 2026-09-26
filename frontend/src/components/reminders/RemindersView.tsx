/**
 * Get Reminded tab: choose a reminder period and see recommended days to
 * join a discharge event or opt out of one, based on the solar forecast.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  EVENT_TYPE_OPTIONS,
  EVENT_TYPE_RESULTS_HEADING,
  REMINDER_PERIOD_OPTIONS,
  TIMEFRAMES,
} from '../../constants'
import { DEFAULT_RESERVE_PERCENT, FIELD_BOUNDS, clampNumber } from '../../constants/validation'
import { buildIcsFile, downloadIcsFile } from '../../lib/calendarExport'
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
  type ForecastView,
  type SolarForecast,
  type SolarInputs,
} from '../../lib/solarForecast'
import type { ProfileData } from '../../types/profile'
import type { EventType } from '../../types/reminders'
import { SolarForecastChart } from '../dashboard/SolarForecastChart'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { AlertIcon, BoltIcon, CheckIcon, ChevronIcon, DownloadIcon, LockIcon } from '../ui/icons'
import { LocationControl } from '../ui/LocationControl'
import { SegmentedToggle } from '../ui/SegmentedToggle'

/** Shown alongside the forecast when no postcode is set, matching the solar forecast fallback. */
const DEFAULT_LOCATION_PLACE = 'Melbourne, VIC'

type Props = {
  profile: ProfileData
  onLogoClick: () => void
  eventType: EventType
  onEventType: (next: EventType) => void
  reminderPeriodDays: string
  onReminderPeriodDays: (next: string) => void
}

/**
 * nextDayDetail
 * @param entry - The soonest recommended day already on the results list
 * @param eventType - Discharge (above typical) or opt-out (below typical)
 * @returns One-line copy for the next-up card, using figures the list already has
 *
 * Formats existing forecast/typical kWh for display. Does not decide whether
 * a day qualifies — that still comes from buildReminderRecommendations.
 */
function nextDayDetail(entry: ReminderRecommendation, eventType: EventType): string {
  const kwh = formatKwh(entry.forecastKwh)
  if (entry.typicalKwh <= 0) return `${kwh} forecast`
  const pct = Math.round((Math.abs(entry.forecastKwh - entry.typicalKwh) / entry.typicalKwh) * 100)
  const direction = eventType === 'discharge' ? 'above' : 'below'
  return `${kwh} forecast — about ${pct}% ${direction} a typical day for this system`
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
 * location's forecast without editing the profile.
 */
export function RemindersView({
  profile,
  onLogoClick,
  eventType,
  onEventType,
  reminderPeriodDays,
  onReminderPeriodDays,
}: Props) {
  const [postcode, setPostcode] = useState(profile.postcode)
  const [openDate, setOpenDate] = useState<string | null>(null)
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set())
  const [remindedKeys, setRemindedKeys] = useState<Set<string>>(new Set())
  const [forecastView, setForecastView] = useState<ForecastView>('weekly')

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

  // Keyed by event type so dismissing a day on one list never hides it on the other.
  const visibleRecommendations = useMemo(
    () => recommendations.filter((entry) => !dismissedKeys.has(`${eventType}:${entry.date}`)),
    [recommendations, dismissedKeys, eventType],
  )

  const loading = Boolean(solarInputs) && !bundleError && !forecastError && forecast === null
  const resultsHeading = EVENT_TYPE_RESULTS_HEADING[eventType]
  const caption = resultsCaption(eventType, reservePercent)
  const emptyMessage = emptyStateMessage(eventType, reservePercent)
  // Same list, soonest first — recommendations already follow forecast date order.
  const nextEntry = visibleRecommendations[0] ?? null

  function toggleRow(date: string) {
    setOpenDate((current) => (current === date ? null : date))
  }

  /**
   * dismissEntry
   * @param date - ISO date of the row to hide
   *
   * Only hides the row from the list currently on screen. Nothing is saved
   * anywhere, so a page reload or switching back to this list later brings
   * it back.
   */
  function dismissEntry(date: string) {
    setDismissedKeys((current) => {
      const next = new Set(current)
      next.add(`${eventType}:${date}`)
      return next
    })
  }

  /**
   * downloadEntry
   * @param entry - The single row to save as a calendar file
   *
   * Builds a one-event .ics file for just this day.
   */
  function downloadEntry(entry: ReminderRecommendation) {
    const content = buildIcsFile([entry], eventType)
    downloadIcsFile(`mypowerplant-${eventType.replace('_', '-')}-${entry.date}.ics`, content)
  }

  function isReminded(date: string) {
    return remindedKeys.has(`${eventType}:${date}`)
  }

  /**
   * toggleReminder
   * @param entry - The day to add or clear as a local "reminder set" mark
   *
   * Setting a reminder still uses the existing .ics download. The checked
   * state is only remembered in this page session, same as dismiss — there
   * is no reminders API or saved store.
   */
  function toggleReminder(entry: ReminderRecommendation) {
    const key = `${eventType}:${entry.date}`
    if (remindedKeys.has(key)) {
      setRemindedKeys((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
      return
    }
    downloadEntry(entry)
    setRemindedKeys((current) => {
      const next = new Set(current)
      next.add(key)
      return next
    })
  }

  /**
   * downloadAllEntries
   *
   * Bundles every row currently on screen (so anything already dismissed is
   * left out) into a single .ics file.
   */
  function downloadAllEntries() {
    const content = buildIcsFile(visibleRecommendations, eventType)
    downloadIcsFile(`mypowerplant-${eventType.replace('_', '-')}-reminders.ics`, content)
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

      {!loading && !bundleError && !forecastError && nextEntry ? (
        <article className="reminder-next">
          <div className="reminder-next__copy">
            <p className="eyebrow">Next recommended day</p>
            <h2 className="reminder-next__date">{nextEntry.dayLabel}</h2>
            <p className="reminder-next__detail">
              {nextDayDetail(nextEntry, eventType)}
              <span className="kpi-badge kpi-badge--estimate">Estimate</span>
            </p>
          </div>
          <Button
            variant="primary"
            className="reminder-next__cta"
            aria-pressed={isReminded(nextEntry.date)}
            onClick={() => toggleReminder(nextEntry)}
          >
            {isReminded(nextEntry.date) ? (
              <>
                <CheckIcon width={14} height={14} />
                Reminder set
              </>
            ) : (
              'Remind me'
            )}
          </Button>
        </article>
      ) : null}

      <div className="reminders__controls">
        <div className="reminders__period">
          <SegmentedToggle
            label="Reminder period"
            value={reminderPeriodDays}
            options={REMINDER_PERIOD_OPTIONS}
            onChange={onReminderPeriodDays}
          />
        </div>
        <SegmentedToggle
          label="Alert type"
          value={eventType}
          options={EVENT_TYPE_OPTIONS}
          onChange={onEventType}
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

      {solarInputs ? (
        <section className="dashboard-card reminders-forecast" aria-labelledby="reminders-forecast-heading">
          <p className="eyebrow">
            {hasOwnSolar ? 'Roof' : 'Roof potential'} · closer look
          </p>
          <h2 id="reminders-forecast-heading">Predicted solar generation</h2>
          <SegmentedToggle
            label="Forecast range"
            value={forecastView}
            options={TIMEFRAMES}
            onChange={setForecastView}
          />
          <SolarForecastChart
            inputs={solarInputs}
            view={forecastView}
            isPotential={!hasOwnSolar}
            placeLabel={place}
          />
        </section>
      ) : null}

      {!loading && !bundleError && !forecastError ? (
        <section className="reminder-results" aria-labelledby="reminder-results-heading">
          <h2 id="reminder-results-heading">{resultsHeading}</h2>
          <p className="reminder-results__caption">{caption}</p>
          {visibleRecommendations.length === 0 ? (
            <Callout tone="neutral" icon={<AlertIcon />} title="No days to show yet">
              {emptyMessage}
            </Callout>
          ) : (
            <ul className="reminder-list">
              {visibleRecommendations.map((entry) => {
                const isOpen = openDate === entry.date
                const detailId = `reminder-detail-${entry.date}`
                const set = isReminded(entry.date)
                return (
                  <li key={entry.date} className="reminder-row">
                    <div className="reminder-row__bar">
                      <div className="reminder-row__main">
                        <span className="reminder-row__date">{entry.dayLabel}</span>
                        <span className="reminder-row__estimate-inline">
                          {formatKwh(entry.forecastKwh)}
                          <span className="kpi-badge kpi-badge--estimate">Estimate</span>
                        </span>
                      </div>
                      <div className="reminder-row__actions">
                        <button
                          type="button"
                          className="reminder-row__details"
                          aria-expanded={isOpen}
                          aria-controls={detailId}
                          onClick={() => toggleRow(entry.date)}
                        >
                          Details
                          <ChevronIcon
                            className={`reminder-row__chevron${isOpen ? ' is-open' : ''}`}
                            width={14}
                            height={14}
                          />
                        </button>
                        <button
                          type="button"
                          className="reminder-row__dismiss"
                          aria-label={`Hide ${entry.dayLabel}`}
                          onClick={() => dismissEntry(entry.date)}
                        >
                          Hide
                        </button>
                        <Button
                          variant={set ? 'primary' : 'outline-accent'}
                          className="reminder-row__remind"
                          aria-pressed={set}
                          onClick={() => toggleReminder(entry)}
                        >
                          {set ? (
                            <>
                              <CheckIcon width={14} height={14} />
                              Reminder set
                            </>
                          ) : (
                            'Remind me'
                          )}
                        </Button>
                      </div>
                    </div>
                    {isOpen ? (
                      <div id={detailId} className="reminder-row__detail">
                        <p className="reminder-row__reason">{entry.reason}</p>
                        <Button
                          variant="edit"
                          className="reminder-row__download"
                          onClick={() => downloadEntry(entry)}
                        >
                          <DownloadIcon width={14} height={14} />
                          Download
                        </Button>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
          {visibleRecommendations.length > 0 ? (
            <div className="reminder-results__actions">
              <Button variant="primary" onClick={downloadAllEntries}>
                Download all reminders
              </Button>
              <p className="setup-secure">
                <LockIcon width={14} height={14} />
                Downloaded reminders are calendar files (.ics). Open the file to add it to your
                calendar app on this device — nothing is uploaded or saved anywhere else.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
