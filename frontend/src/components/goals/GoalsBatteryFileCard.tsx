/**
 * Left card on first-visit Goals setup: battery CSV drop zone and provider chips.
 */
import { useId, useRef, useState } from 'react'
import { BATTERY_SOURCES, type BatterySourceId } from '../../constants/batterySources'
import { BASELINE_RULES, GOAL_RATE_CENTS, GOALS_ONBOARDING } from '../../constants/goals'
import type { MessageCode } from '../../constants/goalMessages'
import { FIELD_BOUNDS } from '../../constants/validation'
import { batteryModels, isAllowedBatteryModel, NOT_SURE_VALUE } from '../../data/profileOptions'
import { maxIntervalKwh } from '../../lib/goals/batteryLimits'
import { readBatteryFile } from '../../lib/goals/readBatteryFile'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import type { GoalBattery } from '../../types/goals'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { BulbIcon, LockIcon } from '../ui/icons'
import { SearchSelect } from '../ui/SearchSelect'
import { StepperField } from '../ui/StepperField'
import { TextField } from '../ui/TextField'
import { buildBaselineDraft, readGoalRate, type BaselineDraft } from './BaselineStep'
import { GoalMessage } from './GoalMessage'
import { GoalsFileGuidePanel } from './GoalsFileGuidePanel'

const RATE_ERROR = `Enter your rate in cents per kWh, between ${GOAL_RATE_CENTS.min} and ${GOAL_RATE_CENTS.max}, for example ${GOAL_RATE_CENTS.example}. Or leave it empty.`

function formatCents(ratePerKwh: number): string {
  return String(Math.round(ratePerKwh * 1000) / 10)
}

type Props = {
  initialBattery: GoalBattery
  profileBattery: GoalBattery | null
  profileRatePerKwh: number | null
  initialRatePerKwh: number | null
  bundle: MethodologyBundle
  onReady: (draft: BaselineDraft) => void
}

export function GoalsBatteryFileCard({
  initialBattery,
  profileBattery,
  profileRatePerKwh,
  initialRatePerKwh,
  bundle,
  onReady,
}: Props) {
  const inputId = useId()
  const guideToggleId = useId()
  const [guideOpen, setGuideOpen] = useState(false)
  const [chosenBattery, setBattery] = useState<GoalBattery>(initialBattery)
  const battery = profileBattery ?? chosenBattery
  const [rateText, setRateText] = useState(() =>
    initialRatePerKwh === null ? '' : String(Math.round(initialRatePerKwh * 10000) / 100),
  )
  const [rateShown, setRateShown] = useState(false)
  const rateId = useId()
  const [sourceId, setSourceId] = useState<BatterySourceId | ''>('')
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [reading, setReading] = useState(false)
  const [problem, setProblem] = useState<MessageCode | null>(null)
  const [readProblem, setReadProblem] = useState<import('../../lib/goals/adapters/types').ReadResult | null>(
    null,
  )
  const readToken = useRef(0)

  const modelOk = isAllowedBatteryModel(battery.model)
  const rate = profileRatePerKwh ?? readGoalRate(rateText)
  const rateError = rateShown && rate === 'invalid' ? RATE_ERROR : undefined
  const typicalCents = formatCents(bundle.methodology.defaultRetailRate)
  const canUpload = modelOk && rate !== 'invalid'
  const limits = canUpload ? { maxIntervalKwh: maxIntervalKwh(battery, bundle) } : null

  const dropClass = [
    'goals-file-card__drop',
    dragging ? 'goals-file-card__drop--active' : '',
    file ? 'goals-file-card__drop--has-file' : '',
    !canUpload ? 'goals-file-card__drop--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  async function processFile(next: File) {
    if (!limits || !sourceId) return
    setFile(next)
    setReadProblem(null)
    setProblem(null)
    const token = (readToken.current += 1)
    setReading(true)
    const result = await readBatteryFile(next, sourceId, limits)
    if (token !== readToken.current) return
    setReading(false)
    if (!result.ok) {
      setReadProblem(result)
      return
    }
    const built = buildBaselineDraft(result, battery, rate, profileRatePerKwh, bundle)
    if (!built.ok) {
      setProblem(built.reason)
      return
    }
    onReady(built.draft)
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (!canUpload || !sourceId) return
    const dropped = event.dataTransfer.files[0]
    if (dropped) void processFile(dropped)
  }

  return (
    <section className="goals-file-card" aria-labelledby="goals-file-card-title">
      <p className="goals-file-card__eyebrow">{GOALS_ONBOARDING.startHere}</p>
      <h2 id="goals-file-card-title" className="goals-file-card__title">
        {GOALS_ONBOARDING.fileTitle}
      </h2>
      <p className="goals-file-card__lede">
        A CSV from this month or the {BASELINE_RULES.recentMonths} months before, with at least{' '}
        {BASELINE_RULES.minCompleteDays} complete days.
      </p>

      {profileBattery ? null : (
        <div className="goals-file-card__profile-fields">
          <StepperField
            label="Number of battery units installed"
            hint="Enter the total number of battery units installed at your property."
            value={battery.units}
            min={FIELD_BOUNDS.batteryUnits.min}
            max={FIELD_BOUNDS.batteryUnits.max}
            onChange={(units) => {
              setProblem(null)
              setBattery((state) => ({ ...state, units }))
            }}
          />
          <SearchSelect
            label="Battery model"
            hint="Select your battery model from the list."
            placeholder="Search battery brand & model"
            heading="Popular models"
            options={batteryModels}
            extraOptions={[NOT_SURE_VALUE]}
            value={battery.model}
            onChange={(model) => {
              setProblem(null)
              setBattery((state) => ({ ...state, model }))
            }}
            info="If your model is not listed, choose Not sure and we’ll use a baseline."
          />
        </div>
      )}

      {profileRatePerKwh !== null ? null : (
        <TextField
          id={rateId}
          label="Your electricity usage rate (optional)"
          hint="It is on your electricity bill or contract, usually shown as cents per kWh."
          placeholder={`e.g. ${GOAL_RATE_CENTS.example}`}
          inputMode="decimal"
          autoComplete="off"
          suffix="c/kWh"
          value={rateText}
          error={rateError}
          onChange={(event) => {
            setProblem(null)
            setRateText(event.target.value)
          }}
          onBlur={() => setRateShown(true)}
        />
      )}

      {rate === null && profileRatePerKwh === null ? (
        <Callout tone="accent" icon={<BulbIcon />}>
          If you leave this empty, we use the typical Victorian rate of {typicalCents} c/kWh, so your
          savings are an estimate. Add your own rate for accurate tracking.
        </Callout>
      ) : null}

      {!modelOk ? (
        <p className="goals-file-card__hint">Choose your battery model to add your file.</p>
      ) : rate === 'invalid' ? (
        <p className="goals-file-card__hint">Fix the rate, or leave it empty, to add your file.</p>
      ) : null}

      <div className="goals-file-card__providers">
        <span className="goals-file-card__providers-label">{GOALS_ONBOARDING.worksWith}</span>
        <div className="goals-file-card__chips" role="group" aria-label="Battery file provider">
          {BATTERY_SOURCES.map((source) => (
            <button
              key={source.id}
              type="button"
              className={`goals-file-card__chip${sourceId === source.id ? ' goals-file-card__chip--on' : ''}`}
              aria-pressed={sourceId === source.id}
              onClick={() => {
                readToken.current += 1
                setSourceId(source.id)
                setReadProblem(null)
                setProblem(null)
              }}
            >
              {source.label}
            </button>
          ))}
        </div>
      </div>

      <label
        className={dropClass}
        htmlFor={canUpload && sourceId ? inputId : undefined}
        onDragOver={(event) => {
          if (!canUpload || !sourceId) return
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {canUpload && sourceId ? (
          <input
            id={inputId}
            type="file"
            accept=".csv,text/csv"
            className="visually-hidden"
            onChange={(event) => {
              const picked = event.target.files?.[0]
              event.target.value = ''
              if (picked) void processFile(picked)
            }}
          />
        ) : null}
        <span className="goals-file-card__illus" aria-hidden>
          <span className="goals-file-card__illus-file">CSV</span>
          <span className="goals-file-card__illus-arrow">↓</span>
        </span>
        <p className="goals-file-card__drop-title">
          {file ? file.name : GOALS_ONBOARDING.dropTitle}
        </p>
        {file ? null : (
          <p className="goals-file-card__drop-browse">
            or <span className="goals-file-card__drop-link">{GOALS_ONBOARDING.browseLink}</span>
          </p>
        )}
        {!sourceId ? (
          <p className="goals-file-card__drop-hint">Choose Tesla or Amber above first.</p>
        ) : null}
      </label>

      {reading ? (
        <p className="goals-file-card__status" role="status">Reading your file on this device…</p>
      ) : null}

      {problem ? <GoalMessage code={problem} /> : null}

      {readProblem && !readProblem.ok ? (
        <GoalMessage
          code={readProblem.reason}
          details={
            readProblem.missingColumns?.length ? (
              <p>Missing: {readProblem.missingColumns.join(', ')}.</p>
            ) : readProblem.rowProblemCount ? (
              <p>Some rows could not be read.</p>
            ) : null
          }
        />
      ) : null}

      <footer className="goals-file-card__footer">
        <p className="goals-file-card__privacy">
          <LockIcon width={16} height={16} aria-hidden />
          <span>{GOALS_ONBOARDING.privacy}</span>
        </p>
        <Button
          id={guideToggleId}
          variant="edit"
          className="goals-file-card__guide"
          aria-expanded={guideOpen}
          aria-controls="goals-file-guide-panel"
          onClick={() => setGuideOpen((open) => !open)}
        >
          {GOALS_ONBOARDING.guideLink}
        </Button>
      </footer>

      {guideOpen ? <GoalsFileGuidePanel id="goals-file-guide-panel" /> : null}
    </section>
  )
}
