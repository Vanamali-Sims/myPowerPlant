/**
 * Improve-setup home: hero with the household's dashboard, then the three
 * features. The dashboard shows the goal tree, the next discharge day from the
 * solar forecast, and the dates the last battery CSV covered.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  IMPROVE_DASHBOARD,
  IMPROVE_FEATURES_HEADING,
  IMPROVE_HERO,
  type ImproveFeatureId,
} from '../../constants/improve'
import { formatGoalAud, formatGoalKgAmount } from '../../lib/goals/goalFormat'
import { deriveTotals } from '../../lib/goals/goalTotals'
import { loadGoals } from '../../lib/goals/goalsStorage'
import { melbourneDate } from '../../lib/goals/melbourneTime'
import { stageForStep, treeStep } from '../../lib/goals/progress'
import {
  formatDateRange,
  formatMonth,
  formatShortDay,
  lastUpload,
  nextDischargeDay,
} from '../../lib/improveDashboard'
import { hasImproveAnswers, isImproveReady } from '../../lib/improveProfile'
import { formatKwh } from '../../lib/kpis'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import { loadReminderRecommendations, type ReminderLoadResult } from '../../lib/reminderRecommendations'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { BoltIcon } from '../ui/icons'
import { ImproveFeatureCards } from './ImproveFeatureCards'

// The tree brings its animation library with it, so it loads after the page.
const GoalTree = lazy(() => import('../goals/GoalTree').then((module) => ({ default: module.GoalTree })))

type Props = {
  profile: ProfileData
  /** Rates and solar factors for the forecast; null while loading. */
  bundle: MethodologyBundle | null
  /** Opens the access-features form. */
  onOpenForm: () => void
  /** Opens a feature, or the form first when the setup is not complete. */
  onOpenFeature: (id: ImproveFeatureId) => void
  onLogoClick: () => void
}

const DASH = IMPROVE_DASHBOARD

function percentOf(total: number, target: number): number {
  return target > 0 ? (total / target) * 100 : 0
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

type Tile = { value: string; note: string }

/**
 * useNextDischargeDay
 * @returns The next discharge day tile, from the same forecast and rules as Reminders
 *
 * Looks across the full 14-day forecast. Only runs once the setup is complete.
 */
function useNextDischargeDay(profile: ProfileData, bundle: MethodologyBundle | null, ready: boolean): Tile {
  const [result, setResult] = useState<{ key: string; tile: Tile } | null>(null)
  const profileRef = useRef(profile)
  const key = ready && bundle
    ? JSON.stringify([profile.postcode, profile.hasSolar, profile.panelCount, profile.panelWatts, profile.solarDirection, profile.reservePercent])
    : ''

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  // The key holds every profile field the forecast uses, so it reruns when one changes.
  useEffect(() => {
    if (!key || !bundle) return
    let cancelled = false
    void loadReminderRecommendations({
      profile: profileRef.current,
      bundle,
      eventType: 'discharge',
      reminderPeriodDays: '14',
      postcode: profileRef.current.postcode,
    }).then((value) => {
      if (!cancelled) setResult({ key, tile: nextDayTile(value) })
    })
    return () => {
      cancelled = true
    }
  }, [key, bundle])

  if (!ready) return { value: DASH.nextDay.needsSetup, note: DASH.nextDay.needsSetupNote }
  if (!result || result.key !== key) return { value: DASH.nextDay.loading, note: '' }
  return result.tile
}

function nextDayTile(value: ReminderLoadResult): Tile {
  if (!value.ok) return { value: DASH.nextDay.unavailable, note: DASH.nextDay.unavailableNote }
  const next = nextDischargeDay(value.recommendations, melbourneDate(Date.now()))
  if (!next) return { value: DASH.nextDay.none, note: DASH.nextDay.noneNote }
  return { value: formatShortDay(next.date), note: DASH.nextDay.forecast(formatKwh(next.forecastKwh)) }
}

function lastUploadTile(upload: ReturnType<typeof lastUpload>): Tile {
  if (!upload) return { value: DASH.lastUpload.none, note: DASH.lastUpload.noneNote }
  if (upload.kind === 'baseline') {
    return { value: formatMonth(upload.month), note: DASH.lastUpload.baseline(formatShortDay(upload.uploadedOn)) }
  }
  return { value: formatDateRange(upload.start, upload.end), note: DASH.lastUpload.uploaded(formatShortDay(upload.uploadedOn)) }
}

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" className="improve-arrow">
      <path d={down ? 'M12 5v14M6 13l6 6 6-6' : 'M5 12h14M13 6l6 6-6 6'} />
    </svg>
  )
}

/** Small progress ring with its figure beside it. */
function GoalRingFigure({ kind, total, target, label }: { kind: 'savings' | 'carbon'; total: number; target: number; label: string }) {
  const radius = 15
  const circumference = 2 * Math.PI * radius
  const shown = Math.min(100, percentOf(total, target))
  const format = kind === 'savings' ? formatGoalAud : formatGoalKgAmount
  return (
    <div className={`improve-dash__ring improve-dash__ring--${kind}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle className="improve-dash__ring-track" cx="20" cy="20" r={radius} />
        <circle
          className="improve-dash__ring-fill"
          cx="20"
          cy="20"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          transform="rotate(-90 20 20)"
        />
      </svg>
      <p>
        <span className="visually-hidden">{label}: </span>
        <strong>{format(total)}</strong> of {format(target)}
      </p>
    </div>
  )
}

/**
 * ImproveHome
 * @param props.profile - Shared answers; decide what the hero button does
 * @returns JSX.Element
 *
 * The hero button reads "Access Features" until some answers exist, then
 * "Complete profile" while any required one is missing. Once the setup is
 * complete it scrolls to the feature cards instead of opening the form.
 */
export function ImproveHome({ profile, bundle, onOpenForm, onOpenFeature, onLogoClick }: Props) {
  const ready = isImproveReady(profile)
  const partial = !ready && hasImproveAnswers(profile)
  const [store] = useState(loadGoals)
  const totals = deriveTotals(store.months)
  const { savings, carbon } = store.goals
  const hasGoals = Boolean(savings && carbon)
  const carbonPercent = carbon ? percentOf(totals.carbon, carbon.target) : 0
  const savingsPercent = savings ? percentOf(totals.savings, savings.target) : 0
  const stage = capitalise(stageForStep(treeStep(carbonPercent)))
  const nextDay = useNextDischargeDay(profile, bundle, ready)
  const upload = lastUploadTile(lastUpload(store))

  function heroAction() {
    if (ready) {
      document.getElementById('improve-features-title')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    onOpenForm()
  }

  return (
    <div className="welcome improve-home">
      <button
        type="button"
        className="brand brand--button brand--desktop-hidden welcome__brand"
        onClick={onLogoClick}
        aria-label="MyPowerPlant home"
      >
        <span className="brand__mark">
          <BoltIcon width={14} height={14} />
        </span>
        MyPowerPlant
      </button>

      <section className="band welcome-hero" aria-labelledby="improve-hero-title">
        <div className="band__inner welcome-hero__inner">
          <div className="welcome-hero__copy">
            <p className="eyebrow welcome__eyebrow">{IMPROVE_HERO.eyebrow}</p>
            <h1 id="improve-hero-title" className="welcome-hero__title">
              {IMPROVE_HERO.titleLead} <em>{IMPROVE_HERO.titleEmphasis}</em> {IMPROVE_HERO.titleTail}
            </h1>
            <p className="welcome-hero__lede">{IMPROVE_HERO.lede}</p>
            <div className="improve-hero__actions">
              <Button variant="primary" className="welcome__cta improve-hero__cta" onClick={heroAction}>
                {partial ? IMPROVE_HERO.completeProfile : IMPROVE_HERO.accessFeatures}
                {partial ? null : <Arrow down />}
              </Button>
              <span className="improve-hero__hint">{IMPROVE_HERO.hint}</span>
            </div>
          </div>

          <section className="improve-dash" aria-labelledby="improve-dash-title">
            <h2 id="improve-dash-title" className="improve-dash__title">
              {DASH.title}
            </h2>

            <div className="improve-dash__grid">
              <div className="improve-dash__tile improve-dash__tile--tree">
                <p className="improve-dash__eyebrow">
                  {DASH.tree.eyebrow} · {stage}
                </p>
                <div className="improve-dash__tree">
                  <Suspense fallback={null}>
                    <GoalTree carbonPercent={carbonPercent} savingsPercent={savingsPercent} showCaption={false} />
                  </Suspense>
                </div>
                {savings && carbon ? (
                  <div className="improve-dash__rings">
                    <GoalRingFigure kind="savings" total={totals.savings} target={savings.target} label={DASH.savingsLabel} />
                    <GoalRingFigure kind="carbon" total={totals.carbon} target={carbon.target} label={DASH.carbonLabel} />
                  </div>
                ) : null}
                {hasGoals ? null : (
                  <>
                    <p className="improve-dash__note">{DASH.tree.noGoals}</p>
                    <button type="button" className="improve-dash__link" onClick={() => onOpenFeature('goals')}>
                      {DASH.tree.setGoals}
                      <Arrow />
                    </button>
                  </>
                )}
              </div>

              {[
                { eyebrow: DASH.nextDay.eyebrow, ...nextDay },
                { eyebrow: DASH.lastUpload.eyebrow, ...upload },
              ].map((tile) => (
                <div key={tile.eyebrow} className="improve-dash__tile">
                  <p className="improve-dash__eyebrow">{tile.eyebrow}</p>
                  <p className="improve-dash__value">{tile.value}</p>
                  {tile.note ? <p className="improve-dash__note">{tile.note}</p> : null}
                </div>
              ))}
            </div>

            {ready ? null : (
              <div className="improve-dash__foot">
                <p>{DASH.footnote}</p>
                <button type="button" className="improve-dash__action" onClick={onOpenForm}>
                  {DASH.action}
                  <Arrow />
                </button>
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="band improve-features-band" aria-labelledby="improve-features-title">
        <div className="band__inner">
          <p className="eyebrow welcome__eyebrow improve-features-band__eyebrow">{IMPROVE_FEATURES_HEADING.eyebrow}</p>
          <h2 id="improve-features-title" className="improve-features-band__title" tabIndex={-1}>
            {IMPROVE_FEATURES_HEADING.title}
          </h2>
          <ImproveFeatureCards onOpenFeature={onOpenFeature} />
        </div>
      </section>
    </div>
  )
}
