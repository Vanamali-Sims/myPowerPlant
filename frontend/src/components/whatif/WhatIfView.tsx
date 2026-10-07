/**
 * What if — controls on the left, the day and the yearly payment on the right.
 *
 * Every edit redraws the charts immediately. The written line waits until the
 * controls have been still. Nothing is saved until "Use this setup".
 */
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { batteryModels, solarDirections } from '../../data/profileOptions'
import { FIELD_BOUNDS } from '../../constants/validation'
import { applyProfilePatch } from '../../lib/chat/applyProfilePatch'
import { buildWhatIfSuggestions } from '../../lib/chat/whatIfSuggestions'
import { buildKpiReport } from '../../lib/kpis'
import { type MethodologyBundle } from '../../lib/methodologyApi'
import { buildTypicalDay } from '../../lib/typicalDay'
import { buildExplainInput, plansFor, reservePercents, surplusLabel } from '../../lib/whatif/explain'
import type { ProfileData, SolarDirection } from '../../types/profile'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { BoltIcon, BulbIcon } from '../ui/icons'
import { WhatIfDayChart } from './WhatIfDayChart'
import { WhatIfExplain } from './WhatIfExplain'
import { WhatIfHouseholdTab } from './WhatIfHouseholdTab'
import { WhatIfSolarTab } from './WhatIfSolarTab'
import { WhatIfStepperRow } from './WhatIfStepperRow'
import { WhatIfYearBars } from './WhatIfYearBars'

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

function annualPayment(weekly: number): number {
  return Math.round(weekly * 52 * 100) / 100
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
}: Props) {
  const [status, setStatus] = useState('')
  const [peopleDraft, setPeopleDraft] = useSyncedDraft(profile.people)
  const [dishwasherDraft, setDishwasherDraft] = useSyncedDraft(profile.dishwasherCyclesPerWeek)
  const [washerDraft, setWasherDraft] = useSyncedDraft(profile.washerCyclesPerWeek)
  const [batteryDraft, setBatteryDraft] = useSyncedDraft(profile.batteryModel)
  const [reserveDraft, setReserveDraft] = useSyncedDraft(profile.reservePercent)
  const [panelCountDraft, setPanelCountDraft] = useSyncedDraft(profile.panelCount)
  const [directionDraft, setDirectionDraft] = useSyncedDraft<SolarDirection | ''>(profile.solarDirection)

  const ready = hasProfile && Boolean(bundle) && !methodologyError
  const solarOn = profile.hasSolar === 'yes'

  const { draftProfile, changes } = useMemo(() => {
    const nextPeople = resolvedValue(peopleDraft, profile.people)
    const nextDishwasher = resolvedValue(dishwasherDraft, profile.dishwasherCyclesPerWeek)
    const nextWasher = resolvedValue(washerDraft, profile.washerCyclesPerWeek)
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
    reserveDraft,
    panelCountDraft,
    directionDraft,
  ])

  const hasChange = changes.length > 0
  const summary = hasChange
    ? changes.map((item) => `${item.label}: ${item.from} → ${item.to}`).join(' · ')
    : 'Your saved setup. Adjust a setting to see it move.'

  function resetDraft() {
    setPeopleDraft(profile.people)
    setDishwasherDraft(profile.dishwasherCyclesPerWeek)
    setWasherDraft(profile.washerCyclesPerWeek)
    setBatteryDraft(profile.batteryModel)
    setReserveDraft(profile.reservePercent)
    setPanelCountDraft(profile.panelCount)
    setDirectionDraft(profile.solarDirection)
    setStatus('')
  }

  function applyWhatIf() {
    onSaveProfile(draftProfile)
    setStatus('Saved on this device. Dashboard and reminders will use this setup.')
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
      changes.map((item) => `${item.label}: ${item.from} → ${item.to}`),
      reserve.now,
      reserve.next,
    )
  }, [bundle, reportNow, reportDraft, profile.reservePercent, draftProfile, changes])

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
    setStatus('')
  }

  const spareNow = surplusLabel(dayNow)
  const spareDraft = surplusLabel(dayDraft)
  const dayCaption = !hasChange
    ? spareNow === 'none'
      ? 'No spare solar in the middle of the day.'
      : `Spare solar ${spareNow}.`
    : spareDraft === 'none'
      ? 'No spare solar with this change.'
      : `Spare solar ${spareDraft}${spareNow === spareDraft ? '' : `, against ${spareNow} now`}.`

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
          Move a setting and the day updates straight away. A short note follows once you pause.
          Nothing is written until you choose <strong>Use this setup</strong>.
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
        <div className="whatif__layout">
          <section className="whatif-card whatif-card--controls" aria-label="Adjust a setting">
            <div className="whatif-controls__group">
              <h2 className="whatif-controls__title">Household</h2>
              <WhatIfHouseholdTab
                profile={profile}
                peopleDraft={peopleDraft}
                dishwasherDraft={dishwasherDraft}
                washerDraft={washerDraft}
                onPeopleDraft={setPeopleDraft}
                onDishwasherDraft={setDishwasherDraft}
                onWasherDraft={setWasherDraft}
              />
            </div>

            <div className="whatif-controls__group">
              <h2 className="whatif-controls__title">Battery</h2>
              <div className="chat-actions__block">
                <h3 className="chat-actions__label">Battery model</h3>
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
              <WhatIfStepperRow
                label="Battery kept for the house"
                saved={profile.reservePercent}
                draft={reserveDraft}
                min={FIELD_BOUNDS.reservePercent.min}
                max={FIELD_BOUNDS.reservePercent.max}
                startAt={FIELD_BOUNDS.reservePercent.example}
                step={5}
                onDraft={setReserveDraft}
              />
              <p className="chat-panel__hint">Percent. Higher keeps more backup, and leaves less for a VPP.</p>
            </div>

            <div className="whatif-controls__group">
              <h2 className="whatif-controls__title">Solar</h2>
              <WhatIfSolarTab
                profile={profile}
                panelCountDraft={panelCountDraft}
                directionDraft={directionDraft}
                onPanelCountDraft={setPanelCountDraft}
                onDirectionDraft={setDirectionDraft}
              />
            </div>

            {suggestion ? (
              <div className="whatif-controls__suggest">
                <p className="whatif-controls__suggest-title">{suggestion.title}</p>
                <p className="chat-panel__hint">{suggestion.impact}</p>
                <Button type="button" variant="outline-accent" onClick={applySuggestion}>
                  Try this change
                </Button>
              </div>
            ) : null}
          </section>

          <section className="whatif-card whatif-card--viz" aria-label="What this change does">
            <header className="whatif-viz__head">
              <h2 className="whatif-viz__title">A typical day</h2>
              <p className="whatif-viz__summary">{summary}</p>
            </header>

            <WhatIfDayChart now={dayNow} draft={dayDraft} showPrevious={hasChange} />
            <p className="whatif-caption">{dayCaption}</p>

            <h2 className="whatif-viz__title whatif-viz__title--next">VPP payment this year</h2>
            <WhatIfYearBars
              nowAud={reportNow ? annualPayment(reportNow.weekly.savingsAud) : 0}
              draftAud={reportDraft ? annualPayment(reportDraft.weekly.savingsAud) : 0}
            />

            <WhatIfExplain active={hasChange} input={explainInput} />

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
      ) : null}
    </div>
  )
}
