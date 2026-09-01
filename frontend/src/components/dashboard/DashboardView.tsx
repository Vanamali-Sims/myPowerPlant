/**
 * Household energy dashboard: KPI cards, timeframe toggle, and assumptions.
 */
import { useEffect, useMemo, useState } from 'react'
import { HIDDEN_ASSUMPTIONS, KIND_LABELS, TIMEFRAMES } from '../../constants'
import { locationFromPostcode } from '../../data/profileOptions'
import { formatUpdatedAt } from '../../lib/formatProfile'
import {
  fetchMethodology,
  type MethodologyBundle,
} from '../../lib/methodologyApi'
import {
  buildKpiReport,
  formatAud,
  formatKwh,
  scaleAud,
  scaleKwh,
  type Timeframe,
  type ValueKind,
} from '../../lib/kpis'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { BoltIcon, SunIcon } from '../ui/icons'

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
    kind === 'from_you' ? 'kpi-badge kpi-badge--fact' : 'kpi-badge kpi-badge--estimate'
  return <span className={className}>{kindLabel(kind)}</span>
}

/**
 * DashboardView
 * @param props.profile - Saved household answers used to build the KPI report
 * @param props.onEditProfile - Jump to the profile editor
 * @returns JSX.Element
 *
 * Figures are estimates unless the badge says otherwise.
 * Carbon avoided is modelled but hidden from the list so it is not oversold.
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
  const assumptions =
    report?.assumptions.filter((item) => !HIDDEN_ASSUMPTIONS.has(item.title)) ?? []

  const kpis =
    report && weekly
    ? [
        {
          eyebrow: 'Estimated energy consumption',
          value: formatKwh(scaleKwh(weekly.consumptionKwh, timeframe)),
          kind: report.consumptionKind,
          icon: BoltIcon,
          note: 'How much electricity this home is likely using over the selected period.',
        },
        {
          eyebrow: 'Estimated savings',
          value: formatAud(scaleAud(weekly.savingsAud, timeframe)),
          kind: 'estimate' as ValueKind,
          icon: SunIcon,
          note: 'Potential value from solar you use in the home, plus a typical VPP credit on leftover energy.',
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
        <span className="location-pill">
          <span className="location-pill__dot" />
          {place}
        </span>
      </header>

      <div className="dashboard__intro">
        <p className="eyebrow">Key insights · {place}</p>
        <h1>Your household energy picture</h1>
        <p>
          Estimated consumption and savings, modelled from your saved profile. No meter or IoT
          device is connected.
        </p>
      </div>

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

      {loadError ? (
        <p className="app-notice" role="status">
          Dashboard rates could not be loaded. {loadError}
        </p>
      ) : null}
      {!bundle && !loadError ? (
        <p className="app-notice" role="status">
          Loading published rates and appliance ratings…
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
              <p className="kpi-card__note">{card.note}</p>
            </article>
          )
        })}
      </section>

      <section className="dashboard-card" id="transparency">
        <p className="eyebrow">Transparency</p>
        <h2>How these dashboard results were calculated</h2>
        <p className="dashboard-card__lede">
          Every figure is simulated from what you told us, plus published typical ratings. Nothing
          here is a live meter reading.
        </p>
        <ol className="assumption-list">
          {assumptions.map((item) => (
            <li key={item.title}>
              <div className="assumption-list__title">
                {item.title}
                <KindBadge kind={item.kind} />
              </div>
              <p>{item.detail}</p>
            </li>
          ))}
        </ol>
        <h3 className="assumption-list__sub">Appliance model this period</h3>
        <div className="appliance-table-wrap">
          <table className="appliance-table">
            <thead>
              <tr>
                <th>Appliance</th>
                <th>Units</th>
                <th>kW</th>
                <th>Hours / week</th>
                <th>kWh / week</th>
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
                  <td>{line.spec.powerKw}</td>
                  <td>{line.hoursPerWeek.toFixed(0)}</td>
                  <td>{line.weeklyKwh.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
