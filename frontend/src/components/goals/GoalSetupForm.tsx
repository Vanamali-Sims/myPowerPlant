/**
 * Savings and carbon goal fields, used for first-visit setup and for editing.
 */
import { useId, useState, type FormEvent } from 'react'
import { GOAL_LABELS } from '../../constants/goals'
import { fieldMessageIds } from '../../lib/fieldIds'
import { formatGoalValue } from '../../lib/goals/goalFormat'
import {
  normaliseGoal,
  parseGoalInput,
  validateGoal,
  type GoalRange,
  type GoalSuggestions,
} from '../../lib/goals/goalSetup'
import { GOAL_KINDS, type GoalKind } from '../../types/goals'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { CarbonExamples } from './CarbonExamples'
import { RangeExplainer } from './RangeExplainer'

type Values = Record<GoalKind, string>

type Props = {
  /** next: a new goal after reaching one, which must be above the total so far. */
  mode: 'create' | 'edit' | 'next'
  /** Which goals to show; both unless a single reached goal is being replaced. */
  kinds?: readonly GoalKind[]
  /** Shown above the fields, for example how the next goal is worked out. */
  note?: string
  suggestions: GoalSuggestions
  /** Monthly profile estimate per goal, explained in the allowed-range disclosure. */
  monthly: Record<GoalKind, number>
  factor: number
  /** Saved goals when editing; suggestions are used when creating. */
  current: Record<GoalKind, number | null>
  saveError: string
  onSave: (targets: Partial<Record<GoalKind, number>>) => void
  onCancel?: () => void
}

function initialValues(props: Props): Values {
  const out = {} as Values
  for (const kind of GOAL_KINDS) {
    const value = props.current[kind] ?? props.suggestions[kind]?.suggested ?? null
    out[kind] = value === null ? '' : String(value)
  }
  return out
}

/**
 * GoalSetupForm
 * @param props.mode - create on first visit, edit for saved goals
 * @param props.suggestions - Suggested value and allowed range per goal
 * @returns A form that saves only when both goals are valid
 *
 * Each field shows only its allowed range; how the range and the pre-filled
 * suggestion are worked out sits in a disclosure. Invalid text is kept in the
 * field, saved goals are untouched until Save succeeds, and Cancel leaves them
 * as they were.
 */
export function GoalSetupForm(props: Props) {
  const { mode, suggestions, monthly, factor, current, saveError, onSave, onCancel, note } = props
  const kinds = props.kinds ?? GOAL_KINDS
  const idBase = useId()
  const [values, setValues] = useState<Values>(() => initialValues(props))
  const [shown, setShown] = useState<Record<GoalKind, boolean>>({ savings: false, carbon: false })

  function focusInput(kind: GoalKind) {
    document.getElementById(`${idBase}-${kind}`)?.focus()
  }

  function errorFor(kind: GoalKind, raw: string): string | undefined {
    const range = suggestions[kind]
    if (!range) return 'We cannot suggest this goal from your profile yet.'
    return validateGoal(kind, raw, range)
  }

  function update(kind: GoalKind, raw: string) {
    setValues((state) => ({ ...state, [kind]: raw }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
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
                  : 'Your profile estimate for this goal is zero, so we cannot suggest a value. Check your profile answers.'}
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
        {mode === 'next' ? null : <RangeExplainer suggestions={suggestions} monthly={monthly} />}
        <CarbonExamples factor={factor} suggestedKg={suggestions.carbon?.suggested ?? null} />
      </div>

      {saveError ? (
        <p className="goals-form__save-error" role="alert">
          {saveError}
        </p>
      ) : null}

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
