/**
 * Household energy dashboard: energy river, node details, and VPP plans.
 */
import { useEffect, useMemo, useState } from 'react'
import { TIMEFRAMES } from '../../constants'
import { coordsFromPostcode, locationFromPostcode } from '../../data/profileOptions'
import { formatUpdatedAt } from '../../lib/formatProfile'
import { useSlidingHighlight } from '../../lib/useSlidingHighlight'
import {
  fetchMethodology,
  type MethodologyBundle,
} from '../../lib/methodologyApi'
import { buildEnergyRiver, riverTitle } from '../../lib/energyRiver'
import {
  buildKpiReport,
  parseCount,
  type Timeframe,
} from '../../lib/kpis'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { ConsumptionDonut } from './ConsumptionDonut'
import { EnergyRiver } from './EnergyRiver'
import { SolarForecastChart } from './SolarForecastChart'
import { VppSuggestions } from './VppSuggestions'
import { BoltIcon } from '../ui/icons'

type Props = {
  profile: ProfileData
  hasProfile: boolean
  onEditProfile: () => void
  onStartSetup: () => void
  onLogoClick: () => void
}

/**
 * DashboardView
 * @param props.profile - Saved household answers used to build the KPI report
 * @param props.onEditProfile - Jump to the profile editor
 * @returns JSX.Element
 *
 * The river is the story: generation, use, leftover or gap, then VPP plans
 * at the mouth. Donut and forecast sit under the house and roof as detail.
 * Figures are estimates unless a badge says otherwise.
 */
export function DashboardView({
  profile,
  hasProfile,
  onEditProfile,
  onStartSetup,
  onLogoClick,
}: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly')
  const [bundle, setBundle] = useState<MethodologyBundle | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    void fetchMethodology().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setBundle(result.data)
        setLoadError('')
      } else {
        setLoadError(result.error)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const report = useMemo(
    () => (hasProfile && bundle ? buildKpiReport(profile, bundle) : null),
    [bundle, hasProfile, profile],
  )
  const place =
    locationFromPostcode(profile.postcode) || report?.locationLabel || ''

  const river = useMemo(
    () =>
      report && bundle
        ? buildEnergyRiver({
            report,
            timeframe,
            feedInRate: bundle.methodology.defaultFeedInRate,
          })
        : null,
    [bundle, report, timeframe],
  )

  const solarInputs = useMemo(() => {
    if (!bundle) return null
    const systemKw =
      report && !report.solarIsPotential
        ? (parseCount(profile.panelCount) * parseCount(profile.panelWatts)) / 1000
        : bundle.methodology.typicalPotentialKw
    const orientationFactor =
      bundle.orientationFactors[profile.solarDirection] ??
      bundle.orientationFactors.not_sure ??
      1
    const { lat, lon } = coordsFromPostcode(profile.postcode)
    return {
      lat,
      lon,
      systemKw,
      orientationFactor,
      performanceRatio: bundle.methodology.solarPerformanceRatio,
    }
  }, [bundle, report, profile.panelCount, profile.panelWatts, profile.solarDirection, profile.postcode])

  const { setRef: setTimeRef, box: timeBox } = useSlidingHighlight(
    hasProfile ? timeframe : null,
    '[aria-checked="true"]',
  )

  return (
    <div className="dashboard">
      <header className="dashboard__top">
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

      <div className="dashboard__intro">
        <p className="eyebrow">Your energy river</p>
        <h1>{river ? riverTitle(river.fork) : 'See how this home’s power moves.'}</h1>
      </div>

      {hasProfile && loadError ? (
        <p className="app-notice" role="status">
          Dashboard rates could not be loaded. {loadError}
        </p>
      ) : null}
      {hasProfile && !bundle && !loadError ? (
        <p className="app-notice" role="status">
          Loading rates and appliance ratings…
        </p>
      ) : null}

      {hasProfile ? (
        <>
          <div
            ref={setTimeRef}
            className="dashboard__time ui-toggle"
            role="radiogroup"
            aria-label="Timeframe"
          >
            <span
              aria-hidden="true"
              className={`ui-toggle__highlight${timeBox.visible ? ' is-visible' : ''}${
                timeBox.ready ? ' is-ready' : ''
              }`}
              style={{
                transform: `translate3d(${timeBox.left}px, ${timeBox.top}px, 0)`,
                width: timeBox.width,
                height: timeBox.height,
              }}
            />
            {TIMEFRAMES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={timeframe === option.value}
                className={`ui-toggle__option${timeframe === option.value ? ' is-selected' : ''}`}
                onClick={() => setTimeframe(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {river ? <EnergyRiver key={timeframe} model={river} /> : null}

          {report ? (
            <div className="dashboard__split">
              <section className="dashboard-card">
                <p className="eyebrow">
                  {report.solarIsPotential ? 'Roof potential' : 'Roof'} · closer look
                </p>
                <h2>Predicted solar generation</h2>
                {solarInputs ? (
                  <SolarForecastChart
                    inputs={solarInputs}
                    view={timeframe}
                    isPotential={report.solarIsPotential}
                    placeLabel={place}
                  />
                ) : null}
              </section>

              <section className="dashboard-card">
                <p className="eyebrow">House · closer look</p>
                <h2>Where that energy goes</h2>
                <ConsumptionDonut appliances={report.appliances} timeframe={timeframe} />
              </section>
            </div>
          ) : null}
        </>
      ) : null}

      {!hasProfile || bundle ? (
        <VppSuggestions
          hasProfile={hasProfile}
          profile={profile}
          plans={bundle?.vppSuggestionPlans ?? []}
          batteryModels={bundle?.batteryModels ?? []}
          fork={river?.fork ?? null}
          onStartSetup={onStartSetup}
        />
      ) : null}

      {hasProfile ? (
        <footer className="dashboard__footer">
          <Callout
            tone="accent"
            title={`Report generated from your profile · ${formatUpdatedAt(profile.lastUpdated)}`}
            action={
              <Button variant="edit" onClick={onEditProfile}>
                Edit profile
              </Button>
            }
          >
            Change household details and come back — this report updates automatically.
          </Callout>
        </footer>
      ) : null}
    </div>
  )
}
