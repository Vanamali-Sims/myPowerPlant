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
    eyebrow: 'Next step',
    title: 'VPP plans that can help you achieve this saving',
    lede: 'These Victorian plans fit this battery. They are how leftover power can go out through a VPP instead of a standard feed-in.',
  },
  deficit: {
    eyebrow: 'Next step',
    title: 'VPP plans that can help you achieve this saving',
    lede: 'These Victorian plans fit this battery. They can cover the gap from nearby batteries — and still earn when the grid calls.',
  },
  balanced: {
    eyebrow: 'Next step',
    title: 'VPP plans that can help you achieve this saving',
    lede: 'The roof already covers use. These plans still pay when the network needs your battery.',
  },
}

export const VPP_DEFAULT_HEADING = {
  eyebrow: 'Plans that could fit this home',
  title: 'VPP Suggestions',
  lede: '',
}

export const RIVER_DISCLAIMER =
  'These figures are modelled estimates, not a meter reading or a guaranteed payment.'

export const DASHBOARD_PLANS_CTA = 'Save me money'

/** The band under the balance card: three steps, the plans button, and the yearly saving. */
export const DASHBOARD_PATH = {
  eyebrow: '3 steps to start saving',
  steps: [
    { title: 'Compare plans', hint: (kwh: string) => `Matched to your ${kwh}` },
    { title: 'Pick one', hint: () => 'See what each pays' },
    { title: 'Start earning', hint: () => 'Credits land on your bill' },
  ],
  /** Fallback for the first hint when there is nothing left over or short. */
  matchedToHome: 'Matched to your home',
  /** Label on the line from the VPP card down to the yearly saving. */
  via: {
    surplus: 'via discharge credits',
    deficit: 'via cheaper VPP energy',
    balanced: 'via event payments',
  },
} as const

export const DASHBOARD_POTENTIAL_SAVINGS_LABEL = 'Potential money saved'
