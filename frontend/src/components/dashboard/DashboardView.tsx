/**
 * Household energy dashboard: KPI cards, charts, plan comparison, and workings.
 */
import { useEffect, useMemo, useState } from 'react'
import { KIND_LABELS, TIMEFRAMES } from '../../constants'
import { locationFromPostcode } from '../../data/profileOptions'
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
  scaleAud,
  scaleKwh,
  scaleWeekly,
  type PlanComparison,
  type Timeframe,
  type ValueKind,
} from '../../lib/kpis'
import { SEASON_LABELS } from '../../lib/season'
import { buildTypicalDay } from '../../lib/typicalDay'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { EnergyBalanceChart } from './EnergyBalanceChart'
import { TypicalDayChart } from './TypicalDayChart'
import {
  BoltIcon,
  BulbIcon,
  HomeIcon,
  LeafIcon,
  PlugIcon,
  SunIcon,
} from '../ui/icons'

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
        : 'kpi-badge kpi-badge--estimate'
  return <span className={className}>{kindLabel(kind)}</span>
}

/**
 * PlanTile
 * @param props.item - One VPP plan with its modelled weekly saving
 * @param props.timeframe - Scale applied to the saving before display
 * @returns JSX.Element
 *
 * Sign-up bonus and lock-in are shown but deliberately left out of the saving
 * figure, so a long contract cannot look cheaper than it is.
 */
function PlanTile({ item, timeframe }: { item: PlanComparison; timeframe: Timeframe }) {
  const { plan } = item
  const classes = [
    'plan-tile',
    item.isRecommended ? 'is-recommended' : '',
    item.isCurrent ? 'is-current' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={classes}>
      <div className="plan-tile__tags">
        {item.isRecommended ? (
          <span className="kpi-badge kpi-badge--sourced">Best for you</span>
        ) : null}
        {item.isCurrent ? (
          <span className="kpi-badge kpi-badge--fact">Your current provider</span>
        ) : null}
      </div>
      <h3>{plan.name}</h3>
      <p className="plan-tile__brand">{plan.brand}</p>
      <ul className="plan-terms">
        <li>
          <span>Estimated savings</span>
          <strong>{formatAud(scaleAud(item.weeklySavings, timeframe))}</strong>
        </li>
        <li>
          <span>Credit for energy you send out</span>
          <strong>${plan.exportRate.toFixed(2)} / kWh</strong>
        </li>
        <li>
          <span>Lock-in</span>
          <strong>{plan.lockInMonths ? `${plan.lockInMonths} months` : 'None'}</strong>
        </li>
        <li>
          <span>Sign-up bonus</span>
          <strong>{plan.signupBonus ? formatAud(plan.signupBonus) : 'None'}</strong>
        </li>
      </ul>
      <p className="plan-tile__brand">{plan.dispatchNote}</p>
      <a className="dashboard-link" href={plan.href} target="_blank" rel="noreferrer">
        Read the plan terms
      </a>
      <p className="plan-tile__brand">{plan.sourceLabel}</p>
    </article>
  )
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
  const [activeHour, setActiveHour] = useState(13)

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
  const dayPoints = useMemo(
    () => (report ? buildTypicalDay(report.periods) : []),
    [report],
  )
  const place =
    locationFromPostcode(profile.postcode) || report?.locationLabel || ''
  const weekly = report?.weekly

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
            icon: BulbIcon,
            note: 'Potential value from solar you use in the home, plus a typical VPP credit on leftover energy.',
          },
          {
            eyebrow: report.solarIsPotential ? 'Solar potential' : 'Solar generation',
            value: formatKwh(scaleKwh(weekly.generationKwh, timeframe)),
            kind: 'estimate' as ValueKind,
            icon: SunIcon,
            note: report.solarIsPotential
              ? 'What a typical roof array could make here. You told us this home has no solar yet.'
              : 'What your panels are likely to make, adjusted for roof direction.',
          },
          {
            eyebrow: 'Solar you use at home',
            value: formatKwh(scaleKwh(weekly.selfConsumedKwh, timeframe)),
            kind: 'estimate' as ValueKind,
            icon: HomeIcon,
            note: 'Solar used the moment it is made, plus what a battery shifts into the evening. This is the part that avoids buying power.',
          },
          {
            eyebrow: 'Sent out to the grid',
            value: formatKwh(scaleKwh(weekly.energyDistributedKwh, timeframe)),
            kind: 'estimate' as ValueKind,
            icon: PlugIcon,
            note: 'Solar left over after the home is supplied. This is what a VPP pays you a credit on.',
          },
          {
            eyebrow: 'Carbon avoided',
            value: formatKg(scaleWeekly(weekly.carbonAvoidedKg, timeframe)),
            kind: 'estimate' as ValueKind,
            icon: LeafIcon,
            note: 'Grid emissions displaced by the energy you send out. An estimate, not a certificate.',
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

      {report && weekly ? (
        <div className="dashboard__split">
          <section className="dashboard-card">
            <p className="eyebrow">A typical day</p>
            <h2>When your solar runs ahead of the house</h2>
            <p className="dashboard-card__lede">
              The shaded band is your leftover window — the hours a VPP would draw from. Select an
              hour to read the numbers.
            </p>
            <TypicalDayChart
              points={dayPoints}
              activeHour={activeHour}
              onSelectHour={setActiveHour}
            />
          </section>

          <section className="dashboard-card">
            <p className="eyebrow">Across the day</p>
            <h2>Use against solar</h2>
            <EnergyBalanceChart periods={report.periods} timeframe={timeframe} />
            <dl className="balance-stats">
              <div>
                <dt>Solar beyond total use</dt>
                <dd>{formatKwh(scaleKwh(weekly.surplusKwh, timeframe))}</dd>
              </div>
              <div>
                <dt>Retail rate used</dt>
                <dd>
                  ${report.retailRate.toFixed(2)} / kWh
                  <KindBadge kind={report.retailRateKind} />
                </dd>
              </div>
            </dl>
          </section>
        </div>
      ) : null}

      {report ? (
        <section className="dashboard-card">
          <p className="eyebrow">VPP plans</p>
          <h2>What each plan would be worth to you</h2>
          <p className="dashboard-card__lede">
            {report.currentPlan
              ? `Compared with ${report.currentPlan.plan.name}, your current plan. `
              : 'You have not told us your current plan, so every plan is listed. '}
            Savings use the same retail rate and leftover energy for every plan, so the only thing
            changing is the export credit.
          </p>
          <div className="plan-grid">
            {report.matchedPlans.map((item) => (
              <PlanTile key={item.plan.id} item={item} timeframe={timeframe} />
            ))}
          </div>
        </section>
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
    </div>
  )
}
