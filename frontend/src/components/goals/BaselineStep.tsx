/**
 * Step 1 of goal setup: the battery, the person's own usage rate (optional),
 * then one recent month of the battery file.
 *
 * The file is read on this device by the same upload area used for progress.
 * Nothing is saved here; the chosen month is handed back and only written
 * when the goals themselves are saved.
 */
import { useId, useState, type Ref } from 'react'
import type { BatterySourceId } from '../../constants/batterySources'
import { BASELINE_RULES, GOAL_RATE_CENTS } from '../../constants/goals'
import type { MessageCode } from '../../constants/goalMessages'
import { FIELD_BOUNDS } from '../../constants/validation'
import { batteryModels, isAllowedBatteryModel, NOT_SURE_VALUE } from '../../data/profileOptions'
import { maxIntervalKwh } from '../../lib/goals/batteryLimits'
import { buildCalculationContext, calculateDay, type DayFigures } from '../../lib/goals/calculate'
import { parseGoalInput, pickBaseline } from '../../lib/goals/goalSetup'
import { melbourneDate } from '../../lib/goals/melbourneTime'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import type { GoalBaseline, GoalBattery } from '../../types/goals'
import { Button } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { BulbIcon } from '../ui/icons'
import { SearchSelect } from '../ui/SearchSelect'
import { StepperField } from '../ui/StepperField'
import { TextField } from '../ui/TextField'
import { GoalMessage } from './GoalMessage'
import { UploadArea } from './UploadArea'

/** A baseline read from a file but not saved yet. */
export type BaselineDraft = {
  baseline: Omit<GoalBaseline, 'setOn'>
  /** Complete days of the baseline month, added to progress when goals are saved. */
  days: DayFigures[]
  sourceId: BatterySourceId
}

const RATE_ERROR = `Enter your rate in cents per kWh, between ${GOAL_RATE_CENTS.min} and ${GOAL_RATE_CENTS.max}, for example ${GOAL_RATE_CENTS.example}. Or leave it empty.`

/**
 * readRate
 * @param raw - Text from the rate field, in cents per kWh
 * @returns AUD per kWh, null when empty, or 'invalid'
 */
function readRate(raw: string): number | null | 'invalid' {
  if (!raw.trim()) return null
  const cents = parseGoalInput(raw.replace(/c$/i, ''))
  if (cents === null || cents < GOAL_RATE_CENTS.min || cents > GOAL_RATE_CENTS.max) return 'invalid'
  return Math.round(cents * 100) / 10000
}

function formatCents(ratePerKwh: number): string {
  return String(Math.round(ratePerKwh * 1000) / 10)
}

type Props = {
  title: string
  headingRef?: Ref<HTMLHeadingElement>
  /** Pre-filled from the saved baseline or the profile, when there is one. */
  initialBattery: GoalBattery
  /** Rate (AUD per kWh) given last time, so a newer file starts from it. */
  initialRatePerKwh: number | null
  bundle: MethodologyBundle
  onReady: (draft: BaselineDraft) => void
  onCancel?: () => void
}

/**
 * BaselineStep
 * @param props.initialBattery - Battery answers to start from
 * @param props.initialRatePerKwh - Rate to pre-fill, or null
 * @param props.onReady - Called with the baseline month once a file passes the checks
 * @returns The battery questions and the upload area for a recent file
 *
 * The battery is asked first because it sets the largest value a row may hold.
 * The rate is optional: without it, the typical Victorian rate is used and the
 * person is told so.
 */
export function BaselineStep({
  title,
  headingRef,
  initialBattery,
  initialRatePerKwh,
  bundle,
  onReady,
  onCancel,
}: Props) {
  const [battery, setBattery] = useState<GoalBattery>(initialBattery)
  const [rateText, setRateText] = useState(() =>
    initialRatePerKwh === null ? '' : String(Math.round(initialRatePerKwh * 10000) / 100),
  )
  const [rateShown, setRateShown] = useState(false)
  const rateId = useId()
  const [problem, setProblem] = useState<MessageCode | null>(null)
  // SearchSelect only writes catalogue values, so an unknown model means none chosen yet.
  const modelOk = isAllowedBatteryModel(battery.model)
  const rate = readRate(rateText)
  const rateError = rateShown && rate === 'invalid' ? RATE_ERROR : undefined
  const typicalCents = formatCents(bundle.methodology.defaultRetailRate)

  function setModel(model: string) {
    setProblem(null)
    setBattery((state) => ({ ...state, model }))
  }

  return (
    <>
      <section className="dashboard-card goals-setup" aria-labelledby="goals-setup-title">
        <h2 id="goals-setup-title" ref={headingRef} tabIndex={-1}>
          {title}
        </h2>
        <p className="goals-setup__step">Step 1 of 2: your battery and a recent file</p>
        <p className="dashboard-card__lede">
          We use one recent month of your own battery file to suggest a realistic range for your
          goals. Choose a file from this month or the {BASELINE_RULES.recentMonths} months before
          it, with at least {BASELINE_RULES.minCompleteDays} complete days.
        </p>
        <div className="goals-form">
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
            onChange={setModel}
            info="If your model is not listed, choose Not sure and we’ll use a baseline."
          />
          <TextField
            id={rateId}
            label="Your electricity usage rate (optional)"
            hint="It is on your electricity bill or contract, usually shown as cents per kWh. Adding it makes your savings tracking accurate."
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
          {rate === null ? (
            <Callout tone="accent" icon={<BulbIcon />}>
              If you leave this empty, we use the typical Victorian rate of {typicalCents} c/kWh,
              so your savings are an estimate. Add your own rate for accurate tracking.
            </Callout>
          ) : null}
          {!modelOk ? (
            <p className="goals-upload__hint">Choose your battery model to add your file.</p>
          ) : rate === 'invalid' ? (
            <p className="goals-upload__hint">Fix the rate, or leave it empty, to add your file.</p>
          ) : null}
        </div>
        {onCancel ? (
          <div className="goals-form__actions">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        ) : null}
      </section>

      {modelOk && rate !== 'invalid' ? (
        <UploadArea
          title="Upload a recent battery file"
          locked={false}
          canGoToSetup={false}
          onGoToSetup={() => undefined}
          limits={{ maxIntervalKwh: maxIntervalKwh(battery, bundle) }}
          onContinue={(read) => {
            const context = buildCalculationContext(rate, bundle)
            // Today's Melbourne date decides which months still count as recent.
            const picked = pickBaseline(
              read.days.map((day) => calculateDay(day, context)),
              melbourneDate(Date.now()),
            )
            if (!picked.ok) {
              setProblem(picked.reason)
              return
            }
            setProblem(null)
            onReady({
              baseline: {
                month: picked.month,
                days: picked.days.length,
                monthly: picked.monthly,
                battery,
                ratePerKwh: rate,
              },
              days: picked.days,
              sourceId: read.sourceId,
            })
          }}
        />
      ) : null}

      {problem ? <GoalMessage code={problem} /> : null}
    </>
  )
}
