/**
 * Dashboard display config: timeframes, assumption filters, and value-kind labels.
 *
 * KPI numbers are computed in lib/kpis; this file only holds how they are
 * labelled and which transparency rows stay hidden.
 */
import type { Timeframe, ValueKind } from '../lib/kpis'

export const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export const HIDDEN_ASSUMPTIONS = new Set(['Carbon avoided'])

export const KIND_LABELS: Record<ValueKind, string> = {
  from_you: 'From you',
  sourced: 'Sourced terms',
  estimate: 'Estimate',
}
