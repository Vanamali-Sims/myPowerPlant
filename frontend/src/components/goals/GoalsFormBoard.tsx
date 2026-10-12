import { useId, useState, type ReactNode, type Ref } from 'react'
import { GOALS_FORM, GOALS_PAGE } from '../../constants/goals'
import { formatMonthLabel } from '../../lib/goals/goalFormat'
import type { CalculationContext } from '../../lib/goals/calculate'
import type { GoalSuggestions } from '../../lib/goals/goalSetup'
import type { GoalBaseline } from '../../types/goals'
import type { MessageCode } from '../../constants/goalMessages'
import { Button } from '../ui/Button'
import { CalendarIcon, InfoIcon, TrashIcon } from '../ui/icons'
import { GoalSetupForm } from './GoalSetupForm'
import { GoalsFormTreeIcon } from './GoalsFormTreeIcon'

type Props = {
  title: string
  helper: string
  headingRef?: Ref<HTMLHeadingElement>
  baselineMonth: string
  note?: string
  formMode: 'create' | 'edit' | 'next'
  kinds?: readonly ('savings' | 'carbon')[]
  suggestions: GoalSuggestions
  baseline: Pick<GoalBaseline, 'month' | 'days' | 'monthly'>
  context: CalculationContext
  current: Record<'savings' | 'carbon', number | null>
  saveError: MessageCode | null
  onSave: (targets: Partial<Record<'savings' | 'carbon', number>>) => void
  onCancel?: () => void
  showUtilityFooter: boolean
  onClear: () => void
  beforeForm?: ReactNode
}

export function GoalsFormBoard({
  title,
  helper,
  headingRef,
  baselineMonth,
  note,
  formMode,
  kinds,
  suggestions,
  baseline,
  context,
  current,
  saveError,
  onSave,
  onCancel,
  showUtilityFooter,
  onClear,
  beforeForm,
}: Props) {
  const formId = useId()
  const [saveDisabled, setSaveDisabled] = useState(formMode === 'edit')
  const monthLabel = formatMonthLabel(baselineMonth)

  return (
    <div className="goals-form-shell">
      <section className="goals-form-card" aria-labelledby="goals-form-title">
        <header className="goals-form-card__band">
          <div className="goals-form-card__band-left">
            <span className="goals-form-card__badge">
              <GoalsFormTreeIcon />
            </span>
            <div className="goals-form-card__band-copy">
              <h2 id="goals-form-title" className="goals-form-card__title" ref={headingRef} tabIndex={-1}>
                {title}
              </h2>
              <p className="goals-form-card__helper">{helper}</p>
            </div>
          </div>
          <p className="goals-form-card__season">
            <CalendarIcon className="goals-form-card__season-icon" width={18} height={18} aria-hidden />
            {GOALS_FORM.seasonPill(monthLabel)}
          </p>
        </header>

        <div className="goals-form-card__body">
          {beforeForm}
          <GoalSetupForm
            key={kinds ? `next-${kinds.join('-')}` : `goals-${formMode}`}
            formId={formId}
            layout="panel"
            mode={formMode}
            kinds={kinds}
            note={note}
            suggestions={suggestions}
            baseline={baseline}
            context={context}
            current={current}
            saveError={saveError}
            onSave={onSave}
            saveInFooter
            onSaveDisabledChange={setSaveDisabled}
          />
        </div>

        <footer className="goals-form-card__footer">
          {onCancel ? (
            <Button type="button" variant="secondary" className="goals-form-card__cancel" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            form={formId}
            variant="primary"
            className="goals-form-card__save"
            disabled={saveDisabled}
          >
            Save goals
          </Button>
        </footer>
      </section>

      {showUtilityFooter ? (
        <div className="goals-form-utility">
          <p className="goals-form-utility__note">
            <InfoIcon width={18} height={18} aria-hidden className="goals-form-utility__info" />
            {GOALS_PAGE.footer}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="goals-form-utility__clear"
            onClick={onClear}
          >
            <TrashIcon width={18} height={18} aria-hidden />
            {GOALS_PAGE.clear}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
