/**
 * Household energy dashboard: balance card, cost compare, and VPP plans.
 */
import { useEffect, useMemo, useState } from 'react'
import { VPP_HOW_IT_HELPS } from '../../constants'
import { locationFromPostcode } from '../../data/profileOptions'
import { formatUpdatedAt } from '../../lib/formatProfile'
import {
  fetchMethodology,
  type MethodologyBundle,
} from '../../lib/methodologyApi'
import { buildEnergyRiver } from '../../lib/energyRiver'
import { buildKpiReport, type Timeframe } from '../../lib/kpis'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { VppHelpsQuotes } from '../home/VppHelpsQuotes'
import { EnergyRiver } from './EnergyRiver'
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
 * savings, then the without/with VPP cost pair and matching plans.
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

  const compareWeeks = useMemo(() => {
    if (!report) return null
    const gapKwh = Math.abs(report.weekly.generationKwh - report.weekly.consumptionKwh)
    const vppRate = Math.min(report.recommended.plan.exportRate, report.retailRate)
    return {
      withoutWeek: gapKwh * report.retailRate,
      withWeek: gapKwh * vppRate,
    }
  }, [report])

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

      <header className="dashboard__intro">
        <p className="eyebrow">
          Dashboard{place ? ` · ${place}` : ''}
        </p>
        <h1>Your Numbers and VPP Estimation</h1>
      </header>

      {hasProfile ? (
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

          {compareWeeks ? (
            <section
              className="vpp-explainer__card vpp-helps__card dashboard-vpp-compare"
              aria-labelledby="dashboard-vpp-compare-heading"
            >
              <h2 id="dashboard-vpp-compare-heading" className="vpp-helps__title">
                {VPP_HOW_IT_HELPS.heading}
              </h2>
              <VppHelpsQuotes
                withoutWeek={compareWeeks.withoutWeek}
                withWeek={compareWeeks.withWeek}
              />
            </section>
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
