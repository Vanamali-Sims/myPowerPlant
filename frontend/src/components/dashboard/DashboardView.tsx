/**
 * Household energy dashboard: KPI cards, charts, plan comparison, and workings.
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
import { SEASON_LABELS } from '../../lib/season'
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

function KindBadge({ kind }: { kind: ValueKind }) {
  const className =
    kind === 'from_you'
      ? 'kpi-badge kpi-badge--fact'
      : kind === 'sourced'
        ? 'kpi-badge kpi-badge--sourced'
        : kind === 'sample'
          ? 'kpi-badge kpi-badge--sample'
          : 'kpi-badge kpi-badge--estimate'
  return <span className={className}>{kindLabel(kind)}</span>
}

/**
 * DashboardView
 * @param props.profile - Saved household answers used to build the KPI report
 * @param props.onEditProfile - Jump to the profile editor
 * @returns JSX.Element
 *
 * Figures are estimates unless the badge says otherwise. Every number the
 * model produces is shown somewhere on this page, including the workings.
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
          },
          {
            eyebrow: weekly.netEnergyValueAud >= 0 ? 'Estimated savings' : 'Net energy cost',
            value: formatAud(scaleAud(weekly.netEnergyValueAud, timeframe)),
            kind: 'estimate' as ValueKind,
            icon: BulbIcon,
            note:
              weekly.netEnergyValueAud >= 0 ? '' : 'Home uses more than it makes',
          },
          {
            eyebrow: 'Carbon avoided',
            value: formatKg(scaleWeekly(weekly.carbonAvoidedKg, timeframe)),
            kind: 'estimate' as ValueKind,
            icon: LeafIcon,
            note: '',
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
              <p className="kpi-card__value">
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

      <section className="dashboard-card" id="transparency">
        <p className="eyebrow">Transparency</p>
        <h2>How these dashboard results were calculated</h2>
        <p className="dashboard-card__lede">
          Every figure is simulated from what you told us, plus published typical ratings. Nothing
          here is a live meter reading.
        </p>
        <ol className="assumption-list">
          {(report?.assumptions ?? []).map((item) => (
            <li key={item.title}>
              <div className="assumption-list__title">
                {item.title}
                <KindBadge kind={item.kind} />
              </div>
              <p>{item.detail}</p>
            </li>
          ))}
        </ol>
        <h3 className="assumption-list__sub">
          Appliance model this period{report ? ` · ${SEASON_LABELS[report.season]}` : ''}
        </h3>
        <div className="appliance-table-wrap">
          <table className="appliance-table">
            <thead>
              <tr>
                <th>Appliance</th>
                <th>Units</th>
                <th>kW</th>
                <th>Hours / week</th>
                <th>kWh / week</th>
                <th>Where the hours come from</th>
              </tr>
            </thead>
            <tbody>
              {(report?.appliances ?? []).map((line) => (
                <tr key={line.spec.id}>
                  <td>
                    {line.spec.name}
                    {line.fromYou ? <KindBadge kind="from_you" /> : <KindBadge kind="estimate" />}
                  </td>
                  <td>{line.units}</td>
                  <td title={line.spec.powerBasis}>{line.spec.powerKw}</td>
                  <td>{line.hoursPerWeek.toFixed(1)}</td>
                  <td>{line.weeklyKwh.toFixed(1)}</td>
                  <td className="appliance-table__source">
                    {line.seasonFactor === 0
                      ? 'Out of season — not counted this time of year.'
                      : `${line.spec.reportedMetric} · ${line.spec.sourceLabel}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="dashboard__footer">
        <span className="location-pill">
          <span className="location-pill__dot" />
          {place}
        </span>
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
