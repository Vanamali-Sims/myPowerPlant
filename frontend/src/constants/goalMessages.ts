/**
 * Reason codes for the Goals upload flow, with a plain message for each.
 *
 * Every problem the flow can report has a fixed code here so the wording lives
 * in one place. Severity, next steps, and the shared message component are
 * added on top of these codes rather than replacing them.
 */

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

export const REASON_MESSAGES: Record<ReasonCode, string> = {
  not_csv: 'This file is not a CSV file.',
  empty_file: 'This file is empty.',
  file_too_large: 'This file is too large to read. Try exporting a single month.',
  unreadable: 'We could not read this file.',
  malformed_csv: 'This file is not laid out as a CSV table we can read.',
  missing_columns: 'This file is missing columns we need.',
  no_rows: 'This file has column names but no rows of battery data.',
  mixed_intervals: 'This file mixes different interval lengths, so we cannot tell which days are complete.',
  no_complete_days: 'This file has no complete days we can count.',
  source_not_supported: 'We cannot read files from this source yet.',
  estimates_unavailable: 'Estimates are unavailable right now.',
  storage_full: 'There is no room left to save goals on this device. Nothing was changed.',
  write_failed:
    'We could not save on this device. Check that this site is allowed to store data, then try again.',
}

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
