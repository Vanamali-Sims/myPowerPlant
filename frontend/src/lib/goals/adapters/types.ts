/**
 * Common shape every battery file reader returns.
 *
 * Daily figures live only in memory. They are never written to the device.
 */
import type { BatterySourceId } from '../../../constants/batterySources'
import type { ReasonCode, RowProblemCode } from '../../../constants/goalMessages'

/** One complete Melbourne calendar day from the file. */
export type DayReading = {
  date: string
  intervals: number
  dischargeKwh: number
  /** null when the file has no intake column, which is not the same as zero. */
  intakeKwh: number | null
}

export type RowProblem = {
  line: number
  /** Melbourne date of the row when it could be read, else null. */
  date: string | null
  code: RowProblemCode
}

export type IncompleteDay = {
  date: string
  found: number
  expected: number
}

export type FileDetails = {
  sourceId: BatterySourceId
  intervalMinutes: number | null
  hasIntakeColumn: boolean
  /** Days left out because some intervals are missing. */
  incompleteDays: IncompleteDay[]
  /** Days left out because at least one row could not be used. */
  problemDays: string[]
  /** First rows with problems, capped; rowProblemCount has the full number. */
  rowProblems: RowProblem[]
  rowProblemCount: number
}

export type ReadResult =
  | ({ ok: true; days: DayReading[] } & FileDetails)
  | ({ ok: false; reason: ReasonCode; missingColumns?: string[] } & Partial<FileDetails>)

export type ReadLimits = {
  /** Largest kWh a single interval may hold before the row is invalid. */
  maxIntervalKwh: number
}

export type BatteryAdapter = (
  text: string,
  limits: ReadLimits,
  sourceId: BatterySourceId,
) => ReadResult
