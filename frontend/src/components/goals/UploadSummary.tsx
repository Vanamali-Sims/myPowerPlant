/**
 * "This file will add" summary inside the upload dialog, before anything is saved.
 */
import type { CalculationContext, PreviewTotals } from '../../lib/goals/calculate'
import { formatGoalAud, formatGoalKgAmount, formatRate, progressPercent } from '../../lib/goals/goalFormat'
import { fruitCount, stageForStep, treeStep } from '../../lib/goals/progress'
import type { GoalEntry, GoalKind, MonthRecord } from '../../types/goals'

type Props = {
  preview: PreviewTotals
  context: CalculationContext
  goals: Record<GoalKind, GoalEntry>
  /** Totals saved before this file. */
  totals: Record<GoalKind, number>
  monthsBefore: MonthRecord[]
  monthsAfter: MonthRecord[]
  /** Days in the file that were already counted and are left as they were. */
  skippedCount: number
}

function longMonthName(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-AU', { month: 'long', timeZone: 'UTC' })
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function dayWord(count: number): string {
  return count === 1 ? '1 day' : `${count} days`
}

/**
 * UploadSummary
 * @param props.preview - Totals for the new days in the file
 * @returns What the file adds to each goal, and what changes on the tree
 */
export function UploadSummary({ preview, context, goals, totals, monthsBefore, monthsAfter, skippedCount }: Props) {
  const after = { savings: totals.savings + preview.savingsAud, carbon: totals.carbon + preview.carbonKg }
  const percent = (kind: GoalKind, value: number) => progressPercent(value, goals[kind].target)
  const fruitAdded = fruitCount(percent('savings', after.savings)) - fruitCount(percent('savings', totals.savings))
  const stageBefore = stageForStep(treeStep(percent('carbon', totals.carbon)))
  const stageAfter = stageForStep(treeStep(percent('carbon', after.carbon)))
  const completed = monthsAfter.filter((record) => {
    if (record.daysCounted !== record.daysInMonth) return false
    const before = monthsBefore.find((item) => item.month === record.month)
    return !before || before.daysCounted < before.daysInMonth
  })
  const grows = stageAfter !== stageBefore
  const fruit = fruitAdded > 0 ? `${fruitAdded} more orange${fruitAdded === 1 ? '' : 's'}` : ''
  const rate =
    context.rateKind === 'from_you'
      ? `your usage rate (${formatRate(context.rate)})`
      : `the typical Victorian rate (about ${formatRate(context.rate)})`

  return (
    <section className="upload-summary" aria-labelledby="upload-summary-title">
      <p id="upload-summary-title" className="upload-summary__eyebrow">
        This file will add
      </p>
      <div className="upload-summary__figures">
        <div>
          <p className="upload-summary__value">+{formatGoalAud(preview.savingsAud)}</p>
          <p className="upload-summary__after">
            Savings → {formatGoalAud(after.savings)} ({Math.round(percent('savings', after.savings))}%)
          </p>
        </div>
        <div>
          <p className="upload-summary__value">+{formatGoalKgAmount(preview.carbonKg)}</p>
          <p className="upload-summary__after">
            Carbon → {formatGoalKgAmount(after.carbon)} ({Math.round(percent('carbon', after.carbon))}%)
          </p>
        </div>
      </div>
      <p className="upload-summary__tree">
        <span className="upload-summary__orange" aria-hidden="true" />
        <span>
          {fruit && grows ? (
            <>
              {fruit}, and your tree grows into a <strong>{capitalise(stageAfter)}</strong>.
            </>
          ) : fruit ? (
            <>{capitalise(fruit)} on your tree.</>
          ) : grows ? (
            <>
              Your tree grows into a <strong>{capitalise(stageAfter)}</strong>.
            </>
          ) : (
            <>Your tree keeps growing.</>
          )}
          {completed.length
            ? ` ${completed.map((record) => longMonthName(record.month)).join(' and ')} ${
                completed.length === 1 ? 'becomes a full month' : 'become full months'
              }.`
            : ''}
        </span>
      </p>
      <p className="upload-summary__note">
        {dayWord(preview.dayCount)} not counted before
        {skippedCount ? `, ${dayWord(skippedCount)} already counted and skipped` : ''}. Savings use {rate}. Only
        energy your battery gave out counts.
      </p>
    </section>
  )
}
