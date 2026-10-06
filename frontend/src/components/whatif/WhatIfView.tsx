/**
 * What if — full-page, live scenario comparison.
 *
 * Every edit recomputes "Current setup" vs "New setup" immediately — there
 * is no separate Compare step. Household, battery, and solar edits all feed
 * one combined draft, so the right-hand dashboard stays mounted and the same
 * shape no matter which tab is open — only the numbers inside change.
 * Nothing is written to the saved profile until "Use this setup" is pressed.
 */
import { useId, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { batteryModels, solarDirections } from '../../data/profileOptions'
import { applyProfilePatch } from '../../lib/chat/applyProfilePatch'
import { householdCompareRows, solarCompareRows, type MetricCompareRow } from '../../lib/chat/whatIfCompare'
import { buildWhatIfSuggestions } from '../../lib/chat/whatIfSuggestions'
import { buildKpiReport } from '../../lib/kpis'
import { compactCardFacts, matchSuggestionPlans, type MatchReasonCode } from '../../lib/vppSuggestions'
import { type MethodologyBundle } from '../../lib/methodologyApi'
import type { ProfileData, SolarDirection } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { BoltIcon, BulbIcon, HomeIcon, SunIcon } from '../ui/icons'
import { WhatIfHouseholdTab } from './WhatIfHouseholdTab'
import { WhatIfSolarTab } from './WhatIfSolarTab'

type WhatIfTab = 'household' | 'battery' | 'solar'

type Props = {
  profile: ProfileData
  hasProfile: boolean
  bundle: MethodologyBundle | null
  methodologyError: string
  onSaveProfile: (profile: ProfileData) => void
  onStartSetup: () => void
  onLogoClick: () => void
}

type ChangeItem = { label: string; from: string; to: string }

/** A single number shown inside a dashboard card, with an optional "was" note. */
type DashStat = {
  label: string
  value: string
  note: string | null
  delta: string | null
  tone: 'up' | 'down' | 'neutral'
}

const TABS: { id: WhatIfTab; label: string }[] = [
  { id: 'household', label: 'Household' },
  { id: 'battery', label: 'Battery' },
  { id: 'solar', label: 'Solar' },
]

const VPP_EMPTY_NOTE: Record<MatchReasonCode, string> = {
  battery: 'Pick a supported battery to see a VPP match.',
  region: 'VPP plans are seeded for Victorian postcodes only.',
  none: 'No matching VPP plan for this setup yet.',
}

/**
 * Draft field that follows the saved profile value when that value changes.
 * Updating during render avoids a setState effect when the profile is saved.
 */
function useSyncedDraft<T>(saved: T): [T, Dispatch<SetStateAction<T>>] {
  const [draft, setDraft] = useState(saved)
  const [prevSaved, setPrevSaved] = useState(saved)
  if (!Object.is(saved, prevSaved)) {
    setPrevSaved(saved)
    setDraft(saved)
  }
  return [draft, setDraft]
}

function resolvedValue(draft: string, saved: string): string {
  const d = draft.trim()
  if (d) return d
  return saved.trim()
}

function directionLabel(value: string): string {
  if (!value) return '—'
  return solarDirections.find((row) => row.value === value)?.label ?? value
}

function statFromMetricRow(row: MetricCompareRow): DashStat {
  return {
    label: row.label,
    value: row.afterDisplay,
    note: row.delta ? `Was ${row.nowDisplay}` : null,
    delta: row.delta,
    tone: row.deltaTone,
  }
}

function pickRow(rows: MetricCompareRow[], label: string): MetricCompareRow | null {
  return rows.find((row) => row.label === label) ?? null
}

function DashStatItem({ stat }: { stat: DashStat }) {
  return (
    <div className="vpp-stat whatif-dash-stat">
      <p className="eyebrow">{stat.label}</p>
      <p className="kpi-card__value">
        <span key={stat.value} className="kpi-card__figure">
          {stat.value}
        </span>
        {stat.delta ? (
          <span className={`chat-compare__delta chat-compare__delta--${stat.tone}`}>{stat.delta}</span>
        ) : null}
      </p>
      {stat.note ? <p className="kpi-card__note">{stat.note}</p> : null}
    </div>
  )
}

function DashCard({
  icon,
  title,
  note,
  children,
}: {
  icon: ReactNode
  title: string
  note?: ReactNode
  children: ReactNode
}) {
  return (
    <article className="dashboard-card kpi-card whatif-dash-card">
      <div className="whatif-dash-card__head">
        <span className="kpi-card__icon">{icon}</span>
        <p className="eyebrow">{title}</p>
      </div>
      <div className="vpp-stat-row whatif-dash-card__stats">{children}</div>
      {note ? <p className="kpi-card__note whatif-dash-card__note">{note}</p> : null}
    </article>
  )
}

/**
 * WhatIfView
 * @param props.profile - Saved household answers the scenario starts from
 * @param props.onSaveProfile - Commit the draft profile when the user keeps a change
 * @returns JSX.Element
 *
 * A full page, not a corner tray: controls, a modelled AI suggestion, and a
 * large always-on dashboard sit side by side. The suggestion and dashboard
 * stay mounted as the tab changes.
 */
export function WhatIfView({
  profile,
  hasProfile,
  bundle,
  methodologyError,
  onSaveProfile,
  onStartSetup,
  onLogoClick,
}: Props) {
  const [tab, setTab] = useState<WhatIfTab>('household')
  const [status, setStatus] = useState('')
  const [peopleDraft, setPeopleDraft] = useSyncedDraft(profile.people)
  const [dishwasherDraft, setDishwasherDraft] = useSyncedDraft(profile.dishwasherCyclesPerWeek)
  const [washerDraft, setWasherDraft] = useSyncedDraft(profile.washerCyclesPerWeek)
  const [batteryDraft, setBatteryDraft] = useSyncedDraft(profile.batteryModel)
  const [panelCountDraft, setPanelCountDraft] = useSyncedDraft(profile.panelCount)
  const [directionDraft, setDirectionDraft] = useSyncedDraft<SolarDirection | ''>(profile.solarDirection)
  const resultTitleId = useId()

  const ready = hasProfile && Boolean(bundle) && !methodologyError
  const solarOn = profile.hasSolar === 'yes'

  function switchTab(next: WhatIfTab) {
    setTab(next)
  }

  // One combined draft profile: every control across every tab feeds it, so
  // the dashboard on the right reflects all edits at once, not just the
  // active tab.
  const { draftProfile, changes } = useMemo(() => {
    const nextPeople = resolvedValue(peopleDraft, profile.people)
    const nextDishwasher = resolvedValue(dishwasherDraft, profile.dishwasherCyclesPerWeek)
    const nextWasher = resolvedValue(washerDraft, profile.washerCyclesPerWeek)
    const nextBattery = batteryDraft || profile.batteryModel
    const nextPanelCount = solarOn ? resolvedValue(panelCountDraft, profile.panelCount) : profile.panelCount
    const nextDirection = solarOn ? directionDraft || profile.solarDirection : profile.solarDirection

    const patch: Partial<ProfileData> = {}
    const items: ChangeItem[] = []

    if (nextPeople !== profile.people.trim()) {
      patch.people = nextPeople
      items.push({ label: 'People', from: profile.people || '—', to: nextPeople })
    }
    if (nextDishwasher !== profile.dishwasherCyclesPerWeek.trim()) {
      patch.dishwasherCyclesPerWeek = nextDishwasher
      items.push({
        label: 'Dishwasher',
        from: `${profile.dishwasherCyclesPerWeek || '0'}/week`,
        to: `${nextDishwasher}/week`,
      })
    }
    if (nextWasher !== profile.washerCyclesPerWeek.trim()) {
      patch.washerCyclesPerWeek = nextWasher
      items.push({
        label: 'Washing machine',
        from: `${profile.washerCyclesPerWeek || '0'}/week`,
        to: `${nextWasher}/week`,
      })
    }
    if (nextBattery !== profile.batteryModel) {
      patch.batteryModel = nextBattery
      items.push({ label: 'Battery', from: profile.batteryModel || '—', to: nextBattery })
    }
    if (solarOn && nextPanelCount !== profile.panelCount.trim()) {
      patch.panelCount = nextPanelCount
      items.push({ label: 'Panels', from: profile.panelCount || '0', to: nextPanelCount })
    }
    if (solarOn && nextDirection !== profile.solarDirection) {
      patch.solarDirection = nextDirection as SolarDirection
      items.push({
        label: 'Direction',
        from: directionLabel(profile.solarDirection),
        to: directionLabel(nextDirection),
      })
    }

    if (!Object.keys(patch).length) {
      return { draftProfile: profile, changes: items }
    }
    const result = applyProfilePatch(profile, patch)
    return { draftProfile: result.ok ? result.profile : profile, changes: items }
  }, [
    profile,
    solarOn,
    peopleDraft,
    dishwasherDraft,
    washerDraft,
    batteryDraft,
    panelCountDraft,
    directionDraft,
  ])

  const hasChange = changes.length > 0
  const summary = hasChange
    ? changes.map((item) => `${item.label}: ${item.from} → ${item.to}`).join(' · ')
    : 'No changes yet — adjust a setting to preview the impact.'

  function resetDraft() {
    setPeopleDraft(profile.people)
    setDishwasherDraft(profile.dishwasherCyclesPerWeek)
    setWasherDraft(profile.washerCyclesPerWeek)
    setBatteryDraft(profile.batteryModel)
    setPanelCountDraft(profile.panelCount)
    setDirectionDraft(profile.solarDirection)
    setStatus('')
  }

  function applyWhatIf() {
    onSaveProfile(draftProfile)
    setStatus('Saved on this device. Dashboard and reminders will use this setup.')
  }

  const reportNow = bundle ? buildKpiReport(profile, bundle) : null
  const reportDraft = bundle ? buildKpiReport(draftProfile, bundle) : null
  const householdRows = reportNow && reportDraft ? householdCompareRows(reportNow, reportDraft) : []
  const solarRows = reportNow && reportDraft ? solarCompareRows(reportNow, reportDraft) : []

  const householdStats = ['Weekly use', 'Weekly VPP savings']
    .map((label) => pickRow(householdRows, label))
    .filter((row): row is MetricCompareRow => row !== null)
    .map(statFromMetricRow)
  const solarStats = solarRows.map(statFromMetricRow)

  const plansNow = bundle ? matchSuggestionPlans(profile, bundle.vppSuggestionPlans, bundle.batteryModels) : null
  const plansDraft = bundle
    ? matchSuggestionPlans(draftProfile, bundle.vppSuggestionPlans, bundle.batteryModels)
    : null
  const topNow = plansNow?.matches[0] ?? null
  const topDraft = plansDraft?.matches[0] ?? null
  const factsNow = topNow ? compactCardFacts(topNow.plan, null) : null
  const factsDraft = topDraft ? compactCardFacts(topDraft.plan, null) : null
  const vppStats: DashStat[] = (factsDraft ?? []).map((fact, index) => {
    const nowFact = factsNow?.[index]
    const changed = nowFact && nowFact.value !== fact.value
    return {
      label: fact.label,
      value: fact.value,
      note: changed ? `Was ${nowFact.value}` : null,
      delta: null,
      tone: 'neutral',
    }
  })
  const vppEmptyNote = plansDraft?.emptyReason ? VPP_EMPTY_NOTE[plansDraft.emptyReason] : VPP_EMPTY_NOTE.none
  const suggestions = bundle ? buildWhatIfSuggestions(draftProfile, bundle) : []
  const suggestion = suggestions[0] ?? null

  function applySuggestion() {
    if (!suggestion) return
    const next = suggestion.apply
    if (next.people != null) setPeopleDraft(next.people)
    if (next.dishwasher != null) setDishwasherDraft(next.dishwasher)
    if (next.washer != null) setWasherDraft(next.washer)
    if (next.battery != null) setBatteryDraft(next.battery)
    if (next.panelCount != null) setPanelCountDraft(next.panelCount)
    if (next.direction != null) setDirectionDraft(next.direction)
    setTab(suggestion.tab)
    setStatus('')
  }

  return (
    <div className="whatif">
      <header className="whatif__top">
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

      <header className="whatif__intro">
        <p className="eyebrow">What if</p>
        <h1>Try a change before you save it</h1>
        <p>
          Adjust a setting and see <strong>Current setup</strong> vs <strong>New setup</strong>{' '}
          update immediately. Nothing is written until you choose <strong>Use this setup</strong>.
        </p>
      </header>

      {!hasProfile ? (
        <Callout
          tone="accent"
          icon={<BulbIcon />}
          title="Finish your profile to run comparisons"
          action={
            <Button variant="primary" onClick={onStartSetup}>
              Start setup
            </Button>
          }
        >
          What if needs your saved household answers as the starting point for a scenario.
        </Callout>
      ) : null}

      {hasProfile && methodologyError ? (
        <p className="app-notice" role="status">
          What if rates could not be loaded. {methodologyError}
        </p>
      ) : null}
      {hasProfile && !bundle && !methodologyError ? (
        <p className="app-notice" role="status">
          Loading rates and appliance ratings…
        </p>
      ) : null}

      {ready ? (
        <>
          <div className="whatif__tabs" role="tablist" aria-label="What if category">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`whatif__tab${tab === item.id ? ' is-active' : ''}`}
                onClick={() => switchTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="whatif__layout">
            <section className="whatif-card whatif-card--controls" aria-label="Adjust a setting">
              {tab === 'household' ? (
                <WhatIfHouseholdTab
                  profile={profile}
                  peopleDraft={peopleDraft}
                  dishwasherDraft={dishwasherDraft}
                  washerDraft={washerDraft}
                  onPeopleDraft={setPeopleDraft}
                  onDishwasherDraft={setDishwasherDraft}
                  onWasherDraft={setWasherDraft}
                />
              ) : null}

              {tab === 'battery' ? (
                <div className="chat-actions__block">
                  <h3 className="chat-actions__label">Different battery</h3>
                  <p className="chat-panel__hint">Now: {profile.batteryModel || 'not set'}</p>
                  <div className="chat-actions__row">
                    <select
                      className="chat-whatif__select"
                      value={batteryDraft}
                      onChange={(event) => setBatteryDraft(event.target.value)}
                    >
                      <option value="">Select battery</option>
                      {batteryModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              {tab === 'solar' ? (
                <WhatIfSolarTab
                  profile={profile}
                  panelCountDraft={panelCountDraft}
                  directionDraft={directionDraft}
                  onPanelCountDraft={setPanelCountDraft}
                  onDirectionDraft={setDirectionDraft}
                />
              ) : null}
            </section>

            <section className="whatif-card whatif-card--ai" aria-labelledby="whatif-ai-title">
              <header className="whatif-ai__head">
                <span className="kpi-card__icon">
                  <BulbIcon width={16} height={16} />
                </span>
                <div>
                  <p className="eyebrow">AI recommendation</p>
                  <h2 className="whatif-ai__title" id="whatif-ai-title">
                    {suggestion ? suggestion.title : 'You’re on a strong modelled setup'}
                  </h2>
                </div>
              </header>
              {suggestion ? (
                <>
                  <p className="whatif-ai__reason" key={suggestion.id}>
                    {suggestion.reason}
                  </p>
                  <p className="whatif-ai__impact" key={`${suggestion.id}-impact`}>
                    {suggestion.impact}
                  </p>
                  <div className="whatif-ai__actions">
                    <Button type="button" variant="primary" onClick={applySuggestion}>
                      Try this change
                    </Button>
                  </div>
                </>
              ) : (
                <p className="whatif-ai__reason">
                  The model has no stronger next step from this draft. Keep adjusting settings, or
                  use the setup on the right.
                </p>
              )}
            </section>

            <section
              className="whatif-card whatif-card--result"
              aria-live="polite"
              aria-labelledby={resultTitleId}
            >
              <header className="whatif-result__head">
                <h2 className="whatif-result__title" id={resultTitleId}>
                  Current setup vs new setup
                </h2>
                <span className="chat-panel__badge">Draft, not saved</span>
              </header>
              <p className="whatif-result__summary">{summary}</p>

              <div className="whatif-dashboard">
                <div className="whatif-dashboard__row">
                  <DashCard icon={<HomeIcon width={16} height={16} />} title="Household">
                    {householdStats.map((stat) => (
                      <DashStatItem key={stat.label} stat={stat} />
                    ))}
                  </DashCard>

                  {solarOn ? (
                    <DashCard icon={<SunIcon width={16} height={16} />} title="Solar">
                      {solarStats.map((stat) => (
                        <DashStatItem key={stat.label} stat={stat} />
                      ))}
                    </DashCard>
                  ) : (
                    <article className="dashboard-card kpi-card whatif-dash-card whatif-dash-card--empty">
                      <div className="whatif-dash-card__head">
                        <span className="kpi-card__icon">
                          <SunIcon width={16} height={16} />
                        </span>
                        <p className="eyebrow">Solar</p>
                      </div>
                      <p className="kpi-card__note">No solar on this profile yet.</p>
                    </article>
                  )}
                </div>

                <article className="dashboard-card kpi-card whatif-dash-card whatif-dash-card--vpp">
                  <div className="whatif-dash-card__head">
                    <span className="kpi-card__icon">
                      <BoltIcon width={16} height={16} />
                    </span>
                    <p className="eyebrow">VPP recommendation</p>
                  </div>
                  {topDraft ? (
                    <>
                      <p className="whatif-dash-card__plan" key={topDraft.plan.id}>
                        {topDraft.plan.brand} — {topDraft.plan.name}
                        {topNow && topNow.plan.id !== topDraft.plan.id ? (
                          <span className="kpi-card__note">
                            {' '}
                            · Was {topNow.plan.brand} {topNow.plan.name}
                          </span>
                        ) : null}
                      </p>
                      <div className="vpp-stat-row whatif-dash-card__stats">
                        {vppStats.map((stat) => (
                          <DashStatItem key={stat.label} stat={stat} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="kpi-card__note">{vppEmptyNote}</p>
                  )}
                </article>
              </div>

              <p className="chat-panel__notice chat-compare__note whatif-result__note">
                Modelled from your profile and published rates — not a live meter reading. VPP
                dispatch timing and terms are set by the provider.
              </p>

              <div className="whatif-result__actions">
                <Button type="button" variant="primary" disabled={!hasChange} onClick={applyWhatIf}>
                  Use this setup
                </Button>
                {hasChange ? (
                  <Button type="button" variant="outline-accent" onClick={resetDraft}>
                    Reset
                  </Button>
                ) : null}
              </div>
              {status ? (
                <p className="whatif__status" role="status" aria-live="polite">
                  {status}
                </p>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </div>
  )
}
