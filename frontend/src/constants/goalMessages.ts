/**
 * Message catalogue for the Goals upload flow.
 *
 * Every message the flow can show has a fixed code here, with a severity, a
 * plain title, and a next step, so wording lives in one place and the shared
 * GoalMessage component can show any of them the same way. No message blames
 * the person or guesses at a fix.
 */
import { BASELINE_RULES } from './goals'

/** Reasons a file cannot be read or a save cannot happen. */
export type ReasonCode =
  | 'not_csv'
  | 'empty_file'
  | 'file_too_large'
  | 'unreadable'
  | 'malformed_csv'
  | 'missing_columns'
  | 'no_rows'
  | 'mixed_intervals'
  | 'no_complete_days'
  | 'source_not_supported'
  | 'estimates_unavailable'
  | 'storage_full'
  | 'write_failed'
  | 'baseline_not_recent'
  | 'baseline_too_few_days'

/** Things worth knowing about a file that could be read. */
export type NoticeCode =
  | 'invalid_rows'
  | 'missing_days'
  | 'already_counted'
  | 'possibly_revised'
  | 'revision_unchecked'

export type MessageCode = ReasonCode | NoticeCode

export type RowProblemCode =
  | 'malformed_row'
  | 'bad_time'
  | 'time_not_exist'
  | 'bad_interval'
  | 'missing_value'
  | 'not_a_number'
  | 'negative_value'
  | 'too_large'
  | 'duplicate_time'
  | 'misaligned_time'

export type MessageSeverity = 'error' | 'warning' | 'info'

export type GoalMessageSpec = {
  severity: MessageSeverity
  title: string
  nextStep: string
}

const CHOOSE_ANOTHER = 'Choose another file, or open "How to get your file" to check the steps and columns.'

/**
 * One message for any file we cannot read as a battery file: wrong type,
 * unreadable, wrong layout, missing columns, no data rows, or an unknown
 * source. "How to get your file" shows the format we accept.
 */
export const FORMAT_NOT_ACCEPTED = {
  title: 'The uploaded format is not accepted.',
  nextStep: 'Click How to get your file for the correct format.',
} as const

/** Reasons that mean the file's format is wrong, so they share FORMAT_NOT_ACCEPTED. */
export const FORMAT_REASONS = [
  'not_csv',
  'unreadable',
  'malformed_csv',
  'missing_columns',
  'no_rows',
  'source_not_supported',
] as const

export const GOAL_MESSAGES: Record<MessageCode, GoalMessageSpec> = {
  not_csv: {
    severity: 'error',
    ...FORMAT_NOT_ACCEPTED,
  },
  empty_file: {
    severity: 'error',
    title: 'This file is empty.',
    nextStep: `Download the file again from your provider's app. ${CHOOSE_ANOTHER}`,
  },
  file_too_large: {
    severity: 'error',
    title: 'This file is too large to read.',
    nextStep: "Export a single month from your provider's app, then choose that file.",
  },
  unreadable: {
    severity: 'error',
    ...FORMAT_NOT_ACCEPTED,
  },
  malformed_csv: {
    severity: 'error',
    ...FORMAT_NOT_ACCEPTED,
  },
  missing_columns: {
    severity: 'error',
    ...FORMAT_NOT_ACCEPTED,
  },
  no_rows: {
    severity: 'error',
    ...FORMAT_NOT_ACCEPTED,
  },
  mixed_intervals: {
    severity: 'error',
    title: 'This file mixes different interval lengths, so we cannot tell which days are complete.',
    nextStep: `Use one interval length, such as 15 minutes, for every row. ${CHOOSE_ANOTHER}`,
  },
  no_complete_days: {
    severity: 'error',
    title: 'This file has no complete days we can count.',
    nextStep: 'Choose a file that covers at least one whole day, with every interval present.',
  },
  source_not_supported: {
    severity: 'error',
    ...FORMAT_NOT_ACCEPTED,
  },
  estimates_unavailable: {
    severity: 'error',
    title: 'Estimates are unavailable right now.',
    nextStep: 'Try again later. Your saved goals and history are not affected.',
  },
  storage_full: {
    severity: 'error',
    title: 'There is no room left to save goals on this device. Nothing was changed.',
    nextStep: 'Clear your goals and history under Start over, or free up space in this browser.',
  },
  write_failed: {
    severity: 'error',
    title: 'We could not save on this device. Nothing was changed.',
    nextStep: 'Check that this site is allowed to store data in your browser, then try again.',
  },
  baseline_not_recent: {
    severity: 'error',
    title: 'This file has no complete days from the last few months.',
    nextStep: `Choose a file from this month or the ${BASELINE_RULES.recentMonths} months before it, so your goals start from how your battery works now.`,
  },
  baseline_too_few_days: {
    severity: 'error',
    title: `No recent month in this file has at least ${BASELINE_RULES.minCompleteDays} complete days.`,
    nextStep: `Choose a file that covers at least ${BASELINE_RULES.minCompleteDays} whole days of one recent month.`,
  },
  invalid_rows: {
    severity: 'warning',
    title: 'Some rows could not be used, so their days are left out.',
    nextStep:
      'You can continue with the days that are fully valid, or cancel, fix the rows, and read the file again.',
  },
  missing_days: {
    severity: 'warning',
    title: 'Some days are missing and will not be counted.',
    nextStep:
      'Those months will show as partial. Upload a file that includes the missing days to fill the gap.',
  },
  already_counted: {
    severity: 'info',
    title: 'Every day in this file is already counted.',
    nextStep: 'There is nothing new to add. Choose a file with later days.',
  },
  possibly_revised: {
    severity: 'warning',
    title: 'This file has different figures for days you already counted.',
    nextStep:
      'Your saved figures are kept unless you choose "Replace with the new figures".',
  },
  revision_unchecked: {
    severity: 'info',
    title: 'We could not check whether earlier days in some months were revised.',
    nextStep:
      'This file only covers part of what was counted for those months, so those days are kept as they were.',
  },
}

/** Titles by reason, for places that only need the short message. */
export const REASON_MESSAGES = Object.fromEntries(
  Object.entries(GOAL_MESSAGES).map(([code, spec]) => [code, spec.title]),
) as Record<MessageCode, string>

export const ROW_PROBLEM_MESSAGES: Record<RowProblemCode, string> = {
  malformed_row: 'This row has fewer values than the column names.',
  bad_time: 'The time is not in a format we can read.',
  time_not_exist: 'This time does not exist in Melbourne because clocks moved forward.',
  bad_interval: 'The interval length is not one we accept.',
  missing_value: 'A battery value is empty.',
  not_a_number: 'A battery value is not a number.',
  negative_value: 'A battery value is below zero.',
  too_large: 'A battery value is far above what this battery can hold.',
  duplicate_time: 'This time appears more than once.',
  misaligned_time: 'This time does not start on an interval boundary.',
}

/** Severity names shown as text beside the icon, so colour is never the only signal. */
export const SEVERITY_LABELS: Record<MessageSeverity, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Information',
}
