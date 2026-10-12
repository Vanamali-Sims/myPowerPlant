/**
 * Savings and carbon goal fields, used for first-visit setup and for editing.
 */
import { useId, useState, type FormEvent, type Ref } from 'react'
import { GOAL_LABELS } from '../../constants/goals'
import { fieldMessageIds } from '../../lib/fieldIds'
import type { CalculationContext } from '../../lib/goals/calculate'
import { formatGoalValue } from '../../lib/goals/goalFormat'
import {
  normaliseGoal,
  parseGoalInput,
  validateGoal,
  type GoalRange,
  type GoalSuggestions,
} from '../../lib/goals/goalSetup'
import { GOAL_KINDS, type GoalBaseline, type GoalKind } from '../../types/goals'
import type { MessageCode } from '../../constants/goalMessages'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { CarbonExamples, CarbonExamplesPanel } from './CarbonExamples'
import { GoalMessage } from './GoalMessage'
import { RangeExplainer, RangeExplainerPanel } from './RangeExplainer'

type Values = Record<GoalKind, string>

type Props = {
  /** next: a new goal after reaching one, which must be above the total so far. */
  mode: 'create' | 'edit' | 'next'
  layout?: 'classic' | 'onboarding'
  /** When onboarding layout: fields are placeholders until a file is read. */
  unlocked?: boolean
  /** Which goals to show; both unless a single reached goal is being replaced. */
  kinds?: readonly GoalKind[]
  /** Shown above the fields, for example how the next goal is worked out. */
  note?: string
  suggestions: GoalSuggestions
  /** Battery-file month the ranges come from, explained in the allowed-range disclosure. */
  baseline: Pick<GoalBaseline, 'month' | 'days' | 'monthly'>
  /** Rate and emissions factor the baseline was valued with. */
  context: CalculationContext
  /** Saved goals when editing; suggestions are used when creating. */
  current: Record<GoalKind, number | null>
  /** Why the last save failed, or null. */
  saveError: MessageCode | null
  onSave: (targets: Partial<Record<GoalKind, number>>) => void
  onCancel?: () => void
  formRef?: Ref<HTMLFormElement>
  formId?: string
  /** Onboarding: submit button lives in the page footer. */
  saveInFooter?: boolean
}

function initialValues(props: Props): Values {
  const out = {} as Values
  for (const kind of GOAL_KINDS) {
    const value = props.current[kind] ?? props.suggestions[kind]?.suggested ?? null
    out[kind] = value === null ? '' : String(value)
  }
  return out
}

function clampToRange(kind: GoalKind, raw: string, range: GoalRange | null): string {
  if (!range) return raw
  const parsed = parseGoalInput(raw)
  if (parsed === null) return raw
  const clamped = Math.min(range.max, Math.max(range.min, parsed))
  return String(normaliseGoal(kind, clamped))
}

function OnboardingGoalField({
  kind,
  range,
  value,
  error,
  inputId,
  onChange,
  onBlur,
}: {
  kind: GoalKind
  range: GoalRange | null
  value: string
  error?: string
  inputId: string
  onChange: (raw: string) => void
  onBlur: () => void
}) {
  const sliderId = `${inputId}-slider`
  const rangeRowId = `${inputId}-range-row`
  const ids = fieldMessageIds(inputId)
  const describedBy = [error ? ids.error : '', rangeRowId].filter(Boolean).join(' ')
  const label = `${GOAL_LABELS[kind].title} (${GOAL_LABELS[kind].unitLabel})`
  const parsed = parseGoalInput(value)
  const sliderValue =
    range && parsed !== null
      ? Math.min(range.max, Math.max(range.min, parsed))
      : range?.suggested ?? range?.min ?? 0

  return (
    <div className={`goals-panel-field goals-panel-field--${kind}`}>
      <label className="goals-panel-field__label" htmlFor={inputId}>{label}</label>
      <div className="goals-panel-field__group">
        {kind === 'savings' ? <span className="goals-panel-field__prefix" aria-hidden>$</span> : null}
        <input
          id={inputId}
          className="goals-panel-field__input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            onBlur()
            if (range) onChange(clampToRange(kind, value, range))
          }}
        />
        <span className="goals-panel-field__suffix" aria-hidden>
          {kind === 'savings' ? 'AUD' : 'kg CO2e'}
        </span>
      </div>
      {range ? (
        <>
          <input
            id={sliderId}
            className="goals-panel-field__slider"
            type="range"
            min={range.min}
            max={range.max}
            step={1}
            value={sliderValue}
            aria-labelledby={inputId}
            onChange={(event) => onChange(event.target.value)}
          />
          <div className="goals-panel-field__range-labels" id={rangeRowId}>
            <span>{formatGoalValue(kind, range.min)}</span>
            <span>Allowed range</span>
            <span>{formatGoalValue(kind, range.max)}</span>
          </div>
        </>
      ) : (
        <p className="goals-panel-field__no-range" id={rangeRowId}>
          Your battery file shows nothing counted for this goal, so we cannot suggest a value.
        </p>
      )}
      {error ? (
        <p className="goals-panel-field__error" id={ids.error} role="alert">{error}</p>
      ) : null}
    </div>
  )
}

export function GoalSetupForm(props: Props) {
  const {
    mode,
    layout = 'classic',
    unlocked = true,
    suggestions,
    baseline,
    context,
    current,
    saveError,
    onSave,
    onCancel,
    note,
    formRef,
    formId,
    saveInFooter,
  } = props
  const kinds = props.kinds ?? GOAL_KINDS
  const idBase = useId()
  const [values, setValues] = useState<Values>(() => initialValues(props))
  const [shown, setShown] = useState<Record<GoalKind, boolean>>({ savings: false, carbon: false })

  function focusInput(kind: GoalKind) {
    document.getElementById(`${idBase}-${kind}`)?.focus()
  }

  function errorFor(kind: GoalKind, raw: string): string | undefined {
    const range = suggestions[kind]
    if (!range) return 'We cannot suggest this goal from your battery file.'
    return validateGoal(kind, raw, range)
  }

  function update(kind: GoalKind, raw: string) {
    setValues((state) => ({ ...state, [kind]: raw }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!unlocked) return
    setShown({ savings: true, carbon: true })
    const invalid = kinds.find((kind) => errorFor(kind, values[kind]))
    if (invalid) {
      focusInput(invalid)
      return
    }
    const targets: Partial<Record<GoalKind, number>> = {}
    for (const kind of kinds) {
      targets[kind] = normaliseGoal(kind, parseGoalInput(values[kind]) ?? 0)
    }
    onSave(targets)
  }

  if (layout === 'onboarding' && unlocked) {
    return (
      <form
        ref={formRef}
        id={formId}
        className="goals-panel-form"
        onSubmit={submit}
        noValidate
      >
        <div className="goals-panel-form__fields">
          {kinds.map((kind) => {
            const range = suggestions[kind]
            const inputId = `${idBase}-${kind}`
            const error = shown[kind] ? errorFor(kind, values[kind]) : undefined
            return (
              <OnboardingGoalField
                key={kind}
                kind={kind}
                range={range}
                value={values[kind]}
                error={error}
                inputId={inputId}
                onChange={(raw) => update(kind, raw)}
                onBlur={() => setShown((state) => ({ ...state, [kind]: true }))}
              />
            )
          })}
        </div>

        <div className="goals-panel-form__details">
          {mode === 'next' ? null : (
            <details className="goals-panel-details">
              <summary>How is the allowed range calculated?</summary>
              <RangeExplainerPanel suggestions={suggestions} baseline={baseline} context={context} />
            </details>
          )}
          <details className="goals-panel-details">
            <summary>How is carbon calculated?</summary>
            <CarbonExamplesPanel
              factor={context.factor}
              suggestedKg={suggestions.carbon?.suggested ?? null}
            />
          </details>
        </div>

        {saveError ? <GoalMessage code={saveError} /> : null}

        {saveInFooter ? null : (
          <div className="goals-panel-form__actions">
            <Button type="submit" variant="primary">
              Save goals
            </Button>
            {onCancel ? (
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
          </div>
        )}
      </form>
    )
  }

  return (
    <form className="goals-form" onSubmit={submit} noValidate>
      {note ? <p className="goals-form__note">{note}</p> : null}
      <div className="goals-form__fields">
        {kinds.map((kind) => {
          const range: GoalRange | null = suggestions[kind]
          const inputId = `${idBase}-${kind}`
          const rangeId = `${inputId}-range`
          const error = shown[kind] ? errorFor(kind, values[kind]) : undefined
          const ids = fieldMessageIds(inputId)
          const describedBy = [error ? ids.error : '', rangeId].filter(Boolean).join(' ')
          const label = `${GOAL_LABELS[kind].title} (${GOAL_LABELS[kind].unitLabel})`
          return (
            <div key={kind} className="goals-form__field">
              <TextField
                id={inputId}
                label={label}
                error={error}
                value={values[kind]}
                inputMode="decimal"
                autoComplete="off"
                prefix={kind === 'savings' ? '$' : undefined}
                suffix={kind === 'carbon' ? 'kg' : undefined}
                aria-describedby={describedBy}
                onChange={(event) => update(kind, event.target.value)}
                onBlur={() => setShown((state) => ({ ...state, [kind]: true }))}
              />
              <p className="goals-form__suggestion" id={rangeId}>
                {range
                  ? `Allowed range: ${formatGoalValue(kind, range.min)} to ${formatGoalValue(kind, range.max)}`
                  : 'Your battery file shows nothing counted for this goal, so we cannot suggest a value. Try a file from another month.'}
              </p>
              {mode === 'edit' && current[kind] !== null ? (
                <p className="goals-form__current">
                  Current goal: {formatGoalValue(kind, current[kind] ?? 0)}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="goals-form__explainers">
        {mode === 'next' ? null : (
          <RangeExplainer suggestions={suggestions} baseline={baseline} context={context} />
        )}
        <CarbonExamples factor={context.factor} suggestedKg={suggestions.carbon?.suggested ?? null} />
      </div>

      {saveError ? <GoalMessage code={saveError} /> : null}

      <div className="goals-form__actions">
        <Button type="submit" variant="primary">
          Save goals
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}
