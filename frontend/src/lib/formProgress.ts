/**
 * How far through the setup form a household actually is.
 *
 * The wizard used to report progress as `step / totalSteps`, which is badly
 * wrong here because the steps are not the same size — 15 / 4 / 4 / 4 / 1.
 * Finishing step one is over half the work and reported 20%; the last step is
 * a single question and owned the final 20% of the bar. Measuring answers
 * instead of steps is the whole fix.
 *
 * Only *applicable* fields count. Several questions are hidden when they would
 * be meaningless — dryer frequency without a dryer, panel details without
 * solar — so counting all 28 would leave those households unable to reach 100%.
 */
import { STEP_FIELDS } from '../constants/setup'
import type { ProfileData, SetupStepId } from '../types/profile'

/** Fields the form will actually show, given what has been answered so far. */
export function applicableFields(profile: ProfileData): (keyof ProfileData)[] {
  const all = (Object.keys(STEP_FIELDS) as SetupStepId[]).flatMap((step) => STEP_FIELDS[step])

  const hidden = new Set<string>()
  if (profile.dryer !== 'yes') {
    hidden.add('dryerWeek')
    hidden.add('dryerWeekend')
  }
  if (profile.cooling !== 'air_conditioning') {
    hidden.add('airconHoursPerWeek')
  }
  if (profile.hasSolar !== 'yes') {
    hidden.add('solarDirection')
    hidden.add('panelCount')
    hidden.add('panelWatts')
  }

  return all.filter((field) => !hidden.has(field as string))
}

/** True when a field holds something the model can use. */
function isAnswered(profile: ProfileData, field: keyof ProfileData): boolean {
  const value = profile[field]
  if (typeof value === 'number') return value > 0
  if (typeof value === 'string') return value.trim() !== ''
  return false
}

export type FormProgress = {
  answered: number
  total: number
  percent: number
  /** Whole minutes left, floored at 1 while anything is outstanding. */
  minutesLeft: number
}

/**
 * formProgress
 * @param profile - Current answers
 * @returns Answered and applicable counts, a percentage, and a time estimate
 *
 * The estimate assumes roughly eight seconds a question, which is about what a
 * tap-or-short-number field costs. It is deliberately rounded up: a form that
 * finishes sooner than promised is a pleasant surprise, the reverse is not.
 */
export function formProgress(profile: ProfileData): FormProgress {
  const fields = applicableFields(profile)
  const answered = fields.filter((field) => isAnswered(profile, field)).length
  const total = fields.length
  const percent = total === 0 ? 0 : Math.round((answered / total) * 100)
  const remaining = Math.max(0, total - answered)
  const minutesLeft = remaining === 0 ? 0 : Math.max(1, Math.ceil((remaining * 8) / 60))
  return { answered, total, percent, minutesLeft }
}
