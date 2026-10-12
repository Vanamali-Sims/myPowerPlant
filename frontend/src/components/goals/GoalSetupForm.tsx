/**
 * Savings and carbon goal fields, used for first-visit setup and for editing.
 */
import { useEffect, useId, useState, type FormEvent, type Ref } from 'react'
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
import { GoalMessage } from './GoalMessage'
import { GoalsCarbonExplainerDetails, GoalsRangeExplainerDetails } from './GoalsFormExplainer'
import { GoalsOnboardingInfoTip } from './GoalsOnboardingInfoTips'

type Values = Record<GoalKind, string>

type Props = {
  /** next: a new goal after reaching one, which must be above the total so far. */
  mode: 'create' | 'edit' | 'next'
  layout?: 'onboarding' | 'panel'
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
  /** Panel layout: parent disables Save when true. */
  onSaveDisabledChange?: (disabled: boolean) => void
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
      <div className="goals-panel-field__label-row">
        <label className="goals-panel-field__label" htmlFor={inputId}>{label}</label>
        <GoalsOnboardingInfoTip kind={kind} />
      </div>
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

function PanelGoalField({
  kind,
  range,
  value,
  error,
  inputId,
  currentGoal,
  onChange,
  onBlur,
}: {
  kind: GoalKind
  range: GoalRange | null
  value: string
  error?: string
  inputId: string
  currentGoal: number | null
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
      <div className="goals-panel-field__label-head">
        <label className="goals-panel-field__label" htmlFor={inputId}>{label}</label>
        {currentGoal !== null ? (
          <span className={`goals-panel-field__current goals-panel-field__current--${kind}`}>
            Current: {formatGoalValue(kind, currentGoal)}
          </span>
        ) : null}
      </div>
      <div className="goals-panel-field__group">
        {kind === 'savings' ? <span className="goals-panel-field__prefix" aria-hidden>$</span> : null}
        <input
          id={inputId}
          className="goals-panel-field__input goals-panel-field__input--panel"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => onBlur()}
        />
        <span className="goals-panel-field__suffix" aria-hidden>
          {kind === 'savings' ? 'AUD' : 'kg'}
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
          Your battery file shows nothing counted for this goal, so we cannot suggest a value. Try a
          file from another month.
        </p>
      )}
      {error ? (
        <p className="goals-panel-field__error" id={ids.error} role="alert">{error}</p>
      ) : null}
    </div>
  )
}

function goalsChanged(
  kinds: readonly GoalKind[],
  values: Values,
  mode: Props['mode'],
  current: Record<GoalKind, number | null>,
): boolean {
  if (mode !== 'edit') return true
  return kinds.some((kind) => {
    const parsed = parseGoalInput(values[kind])
    if (parsed === null) return true
    return normaliseGoal(kind, parsed) !== current[kind]
  })
}

export function GoalSetupForm(props: Props) {
  const {
    mode,
    layout = 'panel',
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
    onSaveDisabledChange,
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

  const saveBlocked =
    !goalsChanged(kinds, values, mode, current) ||
    kinds.some((kind) => Boolean(errorFor(kind, values[kind])) || !suggestions[kind])

  useEffect(() => {
    onSaveDisabledChange?.(saveBlocked)
  }, [onSaveDisabledChange, saveBlocked])

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
      const range = suggestions[kind]
      const raw = range ? clampToRange(kind, values[kind], range) : values[kind]
      targets[kind] = normaliseGoal(kind, parseGoalInput(raw) ?? 0)
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

  const showSavingsExplainer = mode !== 'next' && kinds.includes('savings')
  const showCarbonExplainer = mode !== 'next' && kinds.includes('carbon')

  return (
    <form
      ref={formRef}
      id={formId}
      className="goals-panel-form goals-panel-form--board"
      onSubmit={submit}
      noValidate
    >
      {note ? <p className="goals-form-board__note">{note}</p> : null}
      <div className="goals-panel-form__grid">
        <div className="goals-panel-form__fields goals-panel-form__fields--columns">
          {kinds.map((kind) => {
            const range = suggestions[kind]
            const inputId = `${idBase}-${kind}`
            const error = shown[kind] ? errorFor(kind, values[kind]) : undefined
            return (
              <PanelGoalField
                key={kind}
                kind={kind}
                range={range}
                value={values[kind]}
                error={error}
                inputId={inputId}
                currentGoal={mode === 'edit' ? current[kind] : null}
                onChange={(raw) => update(kind, raw)}
                onBlur={() => setShown((state) => ({ ...state, [kind]: true }))}
              />
            )
          })}
        </div>
        {showSavingsExplainer || showCarbonExplainer ? (
          <div className="goals-panel-form__explainers">
            {showSavingsExplainer ? (
              <GoalsRangeExplainerDetails
                suggestions={suggestions}
                baseline={baseline}
                context={context}
              />
            ) : null}
            {showCarbonExplainer ? (
              <GoalsCarbonExplainerDetails
                factor={context.factor}
                suggestedKg={suggestions.carbon?.suggested ?? null}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {saveError ? <GoalMessage code={saveError} /> : null}

      {saveInFooter ? null : (
        <div className="goals-panel-form__actions">
          <Button type="submit" variant="primary" disabled={saveBlocked}>
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
