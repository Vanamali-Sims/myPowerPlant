/**
 * Household energy dashboard: balance card, closer-look charts, and VPP plans.
 */
import { useEffect, useMemo, useState } from 'react'
import { coordsFromPostcode, locationFromPostcode } from '../../data/profileOptions'
import { formatUpdatedAt } from '../../lib/formatProfile'
import {
  fetchMethodology,
  type MethodologyBundle,
} from '../../lib/methodologyApi'
import { buildEnergyRiver } from '../../lib/energyRiver'
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
 * The balance card is the story: generation, use, leftover or gap, annual
 * savings, then VPP plans. Donut and forecast sit underneath as detail.
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
          <div className="dashboard-stage">
            <div className="dashboard__story">
              {river ? (
                <EnergyRiver
                  key={timeframe}
                  model={river}
                  place={place}
                  timeframe={timeframe}
                  onTimeframe={setTimeframe}
                  onSeePlans={() => {
                    document.getElementById('vpp-suggestions')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                  }}
                />
              ) : null}

              {bundle ? (
                <VppSuggestions
                  hasProfile
                  profile={profile}
                  plans={bundle.vppSuggestionPlans}
                  batteryModels={bundle.batteryModels}
                  fork={river?.fork ?? null}
                  onStartSetup={onStartSetup}
                  fromSavings
                />
              ) : null}
            </div>
          </div>

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

      {!hasProfile && bundle ? (
        <VppSuggestions
          hasProfile={false}
          profile={profile}
          plans={bundle.vppSuggestionPlans}
          batteryModels={bundle.batteryModels}
          fork={null}
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
