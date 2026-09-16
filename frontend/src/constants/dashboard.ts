/**
 * Dashboard display config: timeframes, river copy, and value-kind labels.
 *
 * KPI numbers are computed in lib/kpis; this file only holds how they are labelled.
 */
import type { RiverFork } from '../lib/energyRiver'
import type { Timeframe, ValueKind } from '../lib/kpis'

export const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
]

export const KIND_LABELS: Record<ValueKind, string> = {
  from_you: 'From you',
  sourced: 'Sourced terms',
  estimate: 'Estimate',
  sample: 'Sample terms',
  unavailable: 'Unavailable',
}

export const VPP_STORY_HEADINGS: Record<
  RiverFork,
  { eyebrow: string; title: string; lede: string }
> = {
  surplus: {
    eyebrow: 'From that leftover',
    title: 'Plans that can take that discharge',
    lede: 'These Victorian plans fit this battery. They are how leftover power can be discharged into the VPP.',
  },
  deficit: {
    eyebrow: 'From that gap',
    title: 'Plans that can cover that borrow',
    lede: 'These Victorian plans fit this battery. They are how this home can borrow from nearby batteries — and still earn when the grid calls.',
  },
  balanced: {
    eyebrow: 'From this battery',
    title: 'Plans that put this battery to work',
    lede: 'The house already breaks even. These Victorian plans still pay when the network needs the battery.',
  },
}

export const VPP_DEFAULT_HEADING = {
  eyebrow: 'Plans that could fit this home',
  title: 'VPP Suggestions',
  lede: '',
}

export const RIVER_DISCLAIMER =
  'These figures are modelled estimates, not a meter reading or a guaranteed payment.'
