/**
 * Household energy dashboard: KPI cards, charts, and a short profile footer.
 */
import { useEffect, useMemo, useState } from 'react'
import { KIND_LABELS, TIMEFRAMES } from '../../constants'
import { coordsFromPostcode, locationFromPostcode } from '../../data/profileOptions'
import { formatUpdatedAt } from '../../lib/formatProfile'
import {
  fetchMethodology,
  type MethodologyBundle,
} from '../../lib/methodologyApi'
import {
  buildKpiReport,
  formatAud,
  formatKg,
  formatKwh,
  parseCount,
  scaleAud,
  scaleKwh,
  scaleWeekly,
  type Timeframe,
  type ValueKind,
} from '../../lib/kpis'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { ConsumptionDonut } from './ConsumptionDonut'
import { SolarForecastChart } from './SolarForecastChart'
import { BoltIcon, BulbIcon, LeafIcon } from '../ui/icons'

type Props = {
  profile: ProfileData
  onEditProfile: () => void
  onLogoClick: () => void
}

function kindLabel(kind: ValueKind): string {
  return KIND_LABELS[kind]
}

function kindClass(kind: ValueKind): string {
  if (kind === 'from_you') return 'kpi-badge kpi-badge--fact'
  if (kind === 'sourced') return 'kpi-badge kpi-badge--sourced'
  if (kind === 'sample') return 'kpi-badge kpi-badge--sample'
  if (kind === 'unavailable') return 'kpi-badge kpi-badge--unavailable'
  return 'kpi-badge kpi-badge--estimate'
}

function KindBadge({ kind }: { kind: ValueKind }) {
  return <span className={kindClass(kind)}>{kindLabel(kind)}</span>
}

/**
 * DashboardView
 * @param props.profile - Saved household answers used to build the KPI report
 * @param props.onEditProfile - Jump to the profile editor
 * @returns JSX.Element
 *
 * Figures are estimates unless the badge says otherwise.
 */
export function DashboardView({ profile, onEditProfile, onLogoClick }: Props) {
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
    () => (bundle ? buildKpiReport(profile, bundle) : null),
    [bundle, profile],
  )
  const place =
    locationFromPostcode(profile.postcode) || report?.locationLabel || ''
  const weekly = report?.weekly

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

  const kpis =
    report && weekly
      ? [
          {
            eyebrow: 'Energy use',
            value: formatKwh(scaleKwh(weekly.consumptionKwh, timeframe)),
            kind: report.consumptionKind,
            icon: BoltIcon,
            note: '',
            signed: undefined,
          },
          {
            eyebrow: weekly.netEnergyValueAud >= 0 ? 'Estimated savings' : 'Net energy cost',
            value: formatAud(scaleAud(weekly.netEnergyValueAud, timeframe)),
            kind: 'estimate' as ValueKind,
            icon: BulbIcon,
            signed: weekly.netEnergyValueAud >= 0 ? 'surplus' : 'deficit',
            note: weekly.netEnergyValueAud >= 0 ? '' : 'Home uses more than it makes',
          },
          {
            eyebrow: 'Carbon avoided',
            value: formatKg(scaleWeekly(weekly.carbonAvoidedKg, timeframe)),
            kind: 'estimate' as ValueKind,
            icon: LeafIcon,
            note: '',
            signed: undefined,
          },
        ]
      : []

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
        <h1>Your household energy picture</h1>
      </div>

      {loadError ? (
        <p className="app-notice" role="status">
          Dashboard rates could not be loaded. {loadError}
        </p>
      ) : null}
      {!bundle && !loadError ? (
        <p className="app-notice" role="status">
          Loading rates and appliance ratings…
        </p>
      ) : null}

      <div className="dashboard__time" role="radiogroup" aria-label="Timeframe">
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

      <section className="kpi-grid" aria-label="Key insights">
        {kpis.map((card) => {
          const Icon = card.icon
          return (
            <article key={card.eyebrow} className="kpi-card">
              <span className="kpi-card__icon">
                <Icon />
              </span>
              <p className="eyebrow">{card.eyebrow}</p>
              <p
                className={
                  card.signed
                    ? `kpi-card__value kpi-card__value--${card.signed}`
                    : 'kpi-card__value'
                }
              >
                {card.value}
                <KindBadge kind={card.kind} />
              </p>
              {card.note ? <p className="kpi-card__note">{card.note}</p> : null}
            </article>
          )
        })}
      </section>

      {report && weekly ? (
        <div className="dashboard__split">
          <section className="dashboard-card">
            <p className="eyebrow">Where your energy goes</p>
            <h2>Energy consumption breakdown</h2>
            <ConsumptionDonut appliances={report.appliances} timeframe={timeframe} />
          </section>

          <section className="dashboard-card">
            <p className="eyebrow">
              {report.solarIsPotential ? 'Solar potential' : 'Solar generation'} · weather forecast
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
        </div>
      ) : null}

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
    </div>
  )
}
