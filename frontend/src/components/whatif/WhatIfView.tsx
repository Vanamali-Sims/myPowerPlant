/**
 * What if — controls on the left, the day and the yearly payment on the right.
 *
 * Every edit redraws the charts immediately. The written line waits until the
 * controls have been still. Nothing is saved until "Use this setup".
 */
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { batteryModels, solarDirections } from '../../data/profileOptions'
import { FIELD_BOUNDS } from '../../constants/validation'
import { applyProfilePatch } from '../../lib/chat/applyProfilePatch'
import { buildWhatIfSuggestions, type WhatIfSuggestion } from '../../lib/chat/whatIfSuggestions'
import { buildKpiReport, parseCount, weeklyVppPaymentAud } from '../../lib/kpis'
import { type MethodologyBundle } from '../../lib/methodologyApi'
import { buildTypicalDay } from '../../lib/typicalDay'
import { buildExplainInput, plansFor, reservePercents, surplusLabel } from '../../lib/whatif/explain'
import { kwhPerCycle, modelledWeeklyKwh, withUsageChange } from '../../lib/whatif/usageChange'
import type { ProfileData, SolarDirection } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { BoltIcon, BulbIcon } from '../ui/icons'
import { WhatIfDayChart } from './WhatIfDayChart'
import { WhatIfExplain } from './WhatIfExplain'
import { WhatIfFlow } from './WhatIfFlow'
import { VppProviderField } from '../improve/VppProviderField'
import { WhatIfHouseholdTab } from './WhatIfHouseholdTab'
import { WhatIfSolarTab } from './WhatIfSolarTab'

type Props = {
  profile: ProfileData
  hasProfile: boolean
  bundle: MethodologyBundle | null
  methodologyError: string
  onSaveProfile: (profile: ProfileData) => void
  onStartSetup: () => void
  onLogoClick: () => void
  hideSetupNavigation?: boolean
}

type ChangeItem = { label: string; from: string; to: string }

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
  const trimmed = draft.trim()
  if (trimmed) return trimmed
  return saved.trim()
}

function directionLabel(value: string): string {
  if (!value) return '—'
  return solarDirections.find((row) => row.value === value)?.label ?? value
}

function annualVppPayment(weekly: number): number {
  return Math.round(weekly * 52)
}

function money(value: number): string {
  const rounded = Math.round(value)
  return `${rounded < 0 ? '-' : ''}$${Math.abs(rounded).toLocaleString('en-AU')}`
}

function moneyDelta(value: number): string {
  return `${value > 0 ? '+' : '−'}${money(Math.abs(value))}`
}

function useAnimatedNumber(value: number): number {
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = from.current
    const began = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - began) / 520)
      const eased = 1 - (1 - t) ** 3
      const next = start + (value - start) * eased
      from.current = next
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return shown
}

function cycleChangeText(change: number): string {
  const cycles = Math.abs(change) === 1 ? 'cycle' : 'cycles'
  return `${change > 0 ? '+' : '−'}${Math.abs(change)} ${cycles} a week`
}

function daily(weekly: number): number {
  return weekly / 7
}

/**
 * WhatIfView
 * @param props.profile - Saved household answers the scenario starts from
 * @param props.onSaveProfile - Commit the draft profile when the user keeps a change
 * @returns JSX.Element
 */
export function WhatIfView({
  profile,
  hasProfile,
  bundle,
  methodologyError,
  onSaveProfile,
  onStartSetup,
  onLogoClick,
  hideSetupNavigation = false,
}: Props) {
  const [status, setStatus] = useState('')
  const [peopleDraft, setPeopleDraft] = useSyncedDraft(profile.people)
  // Appliance cycles are changes from today's use, so they can go below zero.
  const [dishwasherChange, setDishwasherChange] = useState(0)
  const [washerChange, setWasherChange] = useState(0)
  const [batteryDraft, setBatteryDraft] = useSyncedDraft(profile.batteryModel)
  const [reserveDraft, setReserveDraft] = useSyncedDraft(profile.reservePercent)
  const [panelCountDraft, setPanelCountDraft] = useSyncedDraft(profile.panelCount)
  const [directionDraft, setDirectionDraft] = useSyncedDraft<SolarDirection | ''>(profile.solarDirection)

  const ready = hasProfile && Boolean(bundle) && !methodologyError
  const solarOn = profile.hasSolar === 'yes'

  const { draftProfile, changes, usageExtra } = useMemo(() => {
    const nextPeople = resolvedValue(peopleDraft, profile.people)
    const nextBattery = batteryDraft || profile.batteryModel
    const nextReserve = resolvedValue(reserveDraft, profile.reservePercent)
    const nextPanelCount = solarOn ? resolvedValue(panelCountDraft, profile.panelCount) : profile.panelCount
    const nextDirection = solarOn ? directionDraft || profile.solarDirection : profile.solarDirection

    const patch: Partial<ProfileData> = {}
    const items: ChangeItem[] = []

    if (nextPeople !== profile.people.trim()) {
      patch.people = nextPeople
      items.push({ label: 'People', from: profile.people || '—', to: nextPeople })
    }
    if (dishwasherChange) {
      items.push({ label: 'Dishwasher', from: 'today’s use', to: cycleChangeText(dishwasherChange) })
    }
    if (washerChange) {
      items.push({ label: 'Washing machine', from: 'today’s use', to: cycleChangeText(washerChange) })
    }
    if (nextBattery !== profile.batteryModel) {
      patch.batteryModel = nextBattery
      items.push({ label: 'Battery', from: profile.batteryModel || '—', to: nextBattery })
    }
    if (nextReserve !== profile.reservePercent.trim()) {
      patch.reservePercent = nextReserve
      items.push({
        label: 'Battery reserve',
        from: `${profile.reservePercent || '—'}%`,
        to: `${nextReserve}%`,
      })
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

    const patched = Object.keys(patch).length ? applyProfilePatch(profile, patch) : null
    const base = patched?.ok ? patched.profile : profile
    // Monthly usage is given, so household changes move it rather than the appliance model.
    const extra = {
      people: bundle && patch.people ? modelledWeeklyKwh(base, bundle) - modelledWeeklyKwh(profile, bundle) : 0,
      dishwasher: bundle ? dishwasherChange * kwhPerCycle(bundle, 'dishwasher') : 0,
      washer: bundle ? washerChange * kwhPerCycle(bundle, 'washer') : 0,
    }
    const next = withUsageChange(base, extra.people + extra.dishwasher + extra.washer)
    if (next.monthlyKwh !== profile.monthlyKwh) {
      items.push({
        label: 'Monthly usage',
        from: `${profile.monthlyKwh} kWh`,
        to: `${next.monthlyKwh} kWh`,
      })
    }
    return { draftProfile: next, changes: items, usageExtra: extra }
  }, [
    profile,
    bundle,
    solarOn,
    peopleDraft,
    dishwasherChange,
    washerChange,
    batteryDraft,
    reserveDraft,
    panelCountDraft,
    directionDraft,
  ])

  const hasChange = changes.length > 0

  function resetDraft() {
    setPeopleDraft(profile.people)
    setDishwasherChange(0)
    setWasherChange(0)
    setBatteryDraft(profile.batteryModel)
    setReserveDraft(profile.reservePercent)
    setPanelCountDraft(profile.panelCount)
    setDirectionDraft(profile.solarDirection)
    setStatus('')
  }

  function applyWhatIf() {
    onSaveProfile(draftProfile)
    // The cycle changes are now part of the saved monthly usage.
    setDishwasherChange(0)
    setWasherChange(0)
    setStatus('Saved on this device. Goals, reminders, and your profile will use this setup.')
  }

  const reportNow = useMemo(() => (bundle ? buildKpiReport(profile, bundle) : null), [profile, bundle])
  const reportDraft = useMemo(
    () => (bundle ? buildKpiReport(draftProfile, bundle) : null),
    [draftProfile, bundle],
  )
  const dayNow = useMemo(() => (reportNow ? buildTypicalDay(reportNow.periods) : []), [reportNow])
  const dayDraft = useMemo(() => (reportDraft ? buildTypicalDay(reportDraft.periods) : []), [reportDraft])

  const explainInput = useMemo(() => {
    if (!bundle || !reportNow || !reportDraft) return null
    const reserve = reservePercents(profile.reservePercent, draftProfile.reservePercent)
    return buildExplainInput(
      reportNow,
      reportDraft,
      plansFor(draftProfile, bundle),
      changes.map((item) => {
        const name =
          item.label === 'People'
            ? 'People in the home'
            : item.label === 'Dishwasher'
              ? 'Dishwasher cycles per week'
              : item.label === 'Washing machine'
                ? 'Washing cycles per week'
                : item.label
        return `${name}: was ${item.from}, now ${item.to}`
      }),
      reserve.now,
      reserve.next,
    )
  }, [bundle, reportNow, reportDraft, profile.reservePercent, draftProfile, changes])

  const suggestions = bundle ? buildWhatIfSuggestions(draftProfile, bundle) : []

  function applySuggestion(suggestion: WhatIfSuggestion) {
    const next = suggestion.apply
    if (next.people != null) setPeopleDraft(next.people)
    if (next.dishwasher != null) {
      setDishwasherChange(parseCount(next.dishwasher) - parseCount(profile.dishwasherCyclesPerWeek))
    }
    if (next.washer != null) setWasherChange(parseCount(next.washer) - parseCount(profile.washerCyclesPerWeek))
    if (next.battery != null) setBatteryDraft(next.battery)
    if (next.panelCount != null) setPanelCountDraft(next.panelCount)
    if (next.direction != null) setDirectionDraft(next.direction)
    setStatus('')
  }

  const annualNow = reportNow ? annualVppPayment(weeklyVppPaymentAud(reportNow)) : 0
  const annualDraft = reportDraft ? annualVppPayment(weeklyVppPaymentAud(reportDraft)) : 0
  const annualShown = useAnimatedNumber(annualDraft)
  const yearDelta = annualDraft - annualNow

  const deltas = useMemo(() => {
    if (!bundle) return null
    const savedAnnual = annualVppPayment(weeklyVppPaymentAud(buildKpiReport(profile, bundle)))
    const lone = (patch: Partial<ProfileData>) => {
      const result = applyProfilePatch(profile, patch)
      if (!result.ok) return null
      return annualVppPayment(weeklyVppPaymentAud(buildKpiReport(result.profile, bundle))) - savedAnnual
    }
    return {
      people: changes.some((item) => item.label === 'People')
        ? lone({
            people: draftProfile.people,
            monthlyKwh: withUsageChange(profile, usageExtra.people).monthlyKwh,
          })
        : null,
      dishwasher: dishwasherChange
        ? lone({ monthlyKwh: withUsageChange(profile, usageExtra.dishwasher).monthlyKwh })
        : null,
      washer: washerChange ? lone({ monthlyKwh: withUsageChange(profile, usageExtra.washer).monthlyKwh }) : null,
      battery: changes.some((item) => item.label === 'Battery')
        ? lone({ batteryModel: draftProfile.batteryModel })
        : null,
      reserve: changes.some((item) => item.label === 'Battery reserve')
        ? lone({ reservePercent: draftProfile.reservePercent })
        : null,
      panels: changes.some((item) => item.label === 'Panels') ? lone({ panelCount: draftProfile.panelCount }) : null,
      direction: changes.some((item) => item.label === 'Direction')
        ? lone({ solarDirection: draftProfile.solarDirection })
        : null,
    }
  }, [bundle, profile, draftProfile, changes, usageExtra, dishwasherChange, washerChange])

  const flowKwh = useMemo(() => {
    const weekly = reportDraft?.weekly
    return {
      solarKwh: daily(weekly?.generationKwh ?? 0),
      homeKwh: daily(weekly?.consumptionKwh ?? 0),
    }
  }, [reportDraft])

  const flowNet = flowKwh.solarKwh - flowKwh.homeKwh
  const flowMode = flowNet >= 0 ? 'surplus' : 'deficit'
  const flowVppKwh = Math.abs(flowNet)
  const flowVppShown = useAnimatedNumber(flowVppKwh)

  const batteryChanged = (batteryDraft || profile.batteryModel) !== profile.batteryModel
  const reserveChanged = resolvedValue(reserveDraft, profile.reservePercent) !== profile.reservePercent.trim()
  const reserveShown = resolvedValue(reserveDraft, profile.reservePercent) || String(FIELD_BOUNDS.reservePercent.example)

  const pillTone = !hasChange
    ? 'is-idle'
    : explainInput?.decision === 'unclear' || explainInput?.quiet
      ? 'is-flat'
      : yearDelta > 0
        ? 'is-up'
        : 'is-down'
  const pillText = !hasChange
    ? 'Your setup today'
    : explainInput?.decision === 'unclear'
      ? 'No payment to compare'
      : explainInput?.quiet
        ? 'Barely moves your payment'
        : `${yearDelta >= 0 ? '▲ +' : '▼ −'}${money(Math.abs(yearDelta))} a year`

  const spareNow = surplusLabel(dayNow)
  const spareDraft = surplusLabel(dayDraft)
  const dayCaption = !hasChange
    ? spareNow === 'none'
      ? 'No spare solar in the middle of the day.'
      : `Spare solar ${spareNow}.`
    : spareDraft === 'none'
      ? 'No spare solar with this change.'
      : `Spare solar ${spareDraft}${spareNow === spareDraft ? '' : `, was ${spareNow}`}.`

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
      </header>

      {!hasProfile ? (
        <Callout
          tone="accent"
          icon={<BulbIcon />}
          title="Finish your profile to run comparisons"
          action={
            hideSetupNavigation ? undefined : (
              <Button variant="primary" onClick={onStartSetup}>
                Start setup
              </Button>
            )
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
        <div className="whatif__layout">
          <aside className="whatif-card whatif-controls" aria-label="Adjust a setting">
            <div className="whatif-group">
              <h2>Your VPP</h2>
              <VppProviderField
                profile={profile}
                bundle={bundle}
                onChange={(vppProvider) =>
                  onSaveProfile({
                    ...profile,
                    vppProvider,
                    fieldSources: { ...profile.fieldSources, vppProvider: 'user' },
                  })
                }
              />
            </div>
            <div className="whatif-group">
              <h2>Solar</h2>
              <WhatIfSolarTab
                profile={profile}
                panelCountDraft={panelCountDraft}
                directionDraft={directionDraft}
                panelDelta={deltas?.panels}
                directionDelta={deltas?.direction}
                onPanelCountDraft={setPanelCountDraft}
                onDirectionDraft={setDirectionDraft}
              />
            </div>

            <div className="whatif-group">
              <h2>Battery</h2>
              <div className={`whatif-row whatif-row--block${batteryChanged ? ' is-changed' : ''}`}>
                <div className="whatif-lab">
                  <span>Model</span>
                  <small className="whatif-meta">
                    {batteryChanged ? `was ${profile.batteryModel || '—'}` : ''}
                    {batteryChanged && deltas?.battery != null && Math.abs(deltas.battery) >= 1 ? (
                      <b
                        className={`whatif-dchip ${deltas.battery > 0 ? 'is-up' : 'is-down'}`}
                        title="This change on its own"
                      >
                        {moneyDelta(deltas.battery)}
                      </b>
                    ) : null}
                  </small>
                </div>
                <select aria-label="Battery model" value={batteryDraft} onChange={(event) => setBatteryDraft(event.target.value)}>
                  <option value="">Select battery</option>
                  {batteryModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`whatif-row whatif-row--block${reserveChanged ? ' is-changed' : ''}`}>
                <div className="whatif-lab">
                  <span>
                    Kept for the house · <b>{reserveShown}%</b>
                  </span>
                  <small className="whatif-meta">
                    {reserveChanged ? `was ${profile.reservePercent || '—'}%` : ''}
                    {reserveChanged && deltas?.reserve != null && Math.abs(deltas.reserve) >= 1 ? (
                      <b
                        className={`whatif-dchip ${deltas.reserve > 0 ? 'is-up' : 'is-down'}`}
                        title="This change on its own"
                      >
                        {moneyDelta(deltas.reserve)}
                      </b>
                    ) : null}
                  </small>
                </div>
                <input
                  type="range"
                  min={FIELD_BOUNDS.reservePercent.min}
                  max={FIELD_BOUNDS.reservePercent.max}
                  step={5}
                  value={reserveShown}
                  aria-label="Battery kept for the house"
                  onChange={(event) => setReserveDraft(event.target.value)}
                />
              </div>
            </div>

            <div className="whatif-group">
              <h2>Household</h2>
              <WhatIfHouseholdTab
                profile={profile}
                peopleDraft={peopleDraft}
                dishwasherChange={dishwasherChange}
                washerChange={washerChange}
                peopleDelta={deltas?.people}
                dishwasherDelta={deltas?.dishwasher}
                washerDelta={deltas?.washer}
                onPeopleDraft={setPeopleDraft}
                onDishwasherChange={setDishwasherChange}
                onWasherChange={setWasherChange}
              />
            </div>

            {suggestions.length ? (
              <div className="whatif-group">
                <h2>Quick tries</h2>
                <div className="whatif-presets">
                  {suggestions.map((item) => (
                    <button key={item.id} type="button" className="whatif-chip" onClick={() => applySuggestion(item)}>
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <div className="whatif-main">
            <section className="whatif-stage" aria-live="polite">
              <div className="whatif-top">
                <div className="whatif-headline">
                  {flowMode === 'surplus' ? (
                    <>
                      <p className="whatif-headline__eyebrow">VPP payment · a year</p>
                      <p className="whatif-headline__amount">
                        {money(annualShown)}
                        <span className="whatif-headline__suffix">/yr</span>
                      </p>
                      <p className="whatif-flow-story-pill whatif-flow-story-pill--surplus">Energy leaves your house</p>
                      <p className="whatif-headline__lede">
                        Your house makes more than it needs. The extra heads out the door to homes in the VPP.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="whatif-headline__eyebrow">VPP top-up · a day</p>
                      <p className="whatif-headline__amount">
                        {flowVppShown.toFixed(1)}
                        <span className="whatif-headline__suffix">kWh</span>
                      </p>
                      <p className="whatif-flow-story-pill whatif-flow-story-pill--deficit">Energy comes into your house</p>
                      <p className="whatif-headline__lede">
                        Your house needs a little more than it makes. Homes in the VPP send it in through the door, into
                        your battery.
                      </p>
                    </>
                  )}
                </div>
                <div className="whatif-setup">
                  <div className="whatif-delta">
                    <span className={`whatif-pill ${pillTone}`}>{pillText}</span>
                    {hasChange ? <span className="whatif-was">was {money(annualNow)}</span> : null}
                  </div>
                  <WhatIfExplain active={hasChange} input={explainInput} />
                  <div className="whatif-actions">
                    <button type="button" className="whatif-btn whatif-btn--primary" disabled={!hasChange} onClick={applyWhatIf}>
                      Use this setup
                    </button>
                    <button
                      type="button"
                      className="whatif-btn whatif-btn--ghost"
                      hidden={!hasChange}
                      onClick={resetDraft}
                    >
                      Reset
                    </button>
                  </div>
                  {status ? (
                    <p className="whatif-status" role="status">
                      {status}
                    </p>
                  ) : null}
                </div>
              </div>
              <WhatIfFlow
                solarKwh={flowKwh.solarKwh}
                homeKwh={flowKwh.homeKwh}
                annualPayment={annualShown}
              />
            </section>

            <section className="whatif-card whatif-day">
              <div className="whatif-day__head">
                <h2>
                  A typical day <small>{dayCaption}</small>
                </h2>
                <div className="whatif-legend">
                  <span>
                    <i className="whatif-swatch whatif-swatch--solar" />
                    Solar
                  </span>
                  <span>
                    <i className="whatif-swatch whatif-swatch--load" />
                    Home use
                  </span>
                  <span>
                    <i className="whatif-swatch whatif-swatch--band" />
                    Spare solar
                  </span>
                  {hasChange ? (
                    <span>
                      <i className="whatif-swatch whatif-swatch--ghost" />
                      What changed
                    </span>
                  ) : null}
                </div>
              </div>
              <WhatIfDayChart now={dayNow} draft={dayDraft} showPrevious={hasChange} />
            </section>
          </div>
        </div>
      ) : null}
      {ready ? (
        <p className="whatif-foot">
          Modelled from your profile and published rates, not a live meter reading. VPP terms are set by the
          provider. Nothing is saved until you choose Use this setup.
        </p>
      ) : null}
    </div>
  )
}
