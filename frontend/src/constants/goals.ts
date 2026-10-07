/**
 * Goal tracking config: storage, limits, and figures still to be confirmed.
 *
 * Every value marked "to be confirmed by the team" is a placeholder agreed for
 * the first build. Change it here and nowhere else.
 */

/**
 * localStorage key for goals and monthly history.
 *
 * Separate from the profile key so the /iteration-1/ and /iteration-2/
 * snapshots on the same origin are not affected.
 */
export const GOALS_STORAGE_KEY = 'mypowerplant.goals'

export const GOALS_STORE_VERSION = 1

/** Reject a stored blob larger than this so a tampered key cannot fill the origin quota. */
export const GOALS_MAX_JSON_BYTES = 65536

/** About ten years of monthly records. */
export const MAX_STORED_MONTHS = 120

/**
 * Goal suggestion rule: months of the profile's estimated savings and carbon.
 * To be confirmed by the team.
 */
export const GOAL_SUGGESTION_MONTHS = {
  min: 1,
  suggested: 3,
  max: 12,
} as const

/**
 * Where the Victorian grid emissions factor comes from. The value itself is
 * read from the methodology data, the same field buildKpiReport uses.
 * To be confirmed by the team before this ships to production.
 */
export const EMISSIONS_FACTOR_SOURCE = {
  label: 'Source to be confirmed',
  lastVerified: 'to be confirmed',
} as const

/**
 * Where the typical Victorian retail rate comes from. The value itself is read
 * from the methodology data, the same rate buildKpiReport falls back to.
 * To be confirmed by the team before this ships to production.
 */
export const TYPICAL_RATE_SOURCE = {
  label: 'Source to be confirmed',
  lastVerified: 'to be confirmed',
} as const

/** The tree grows one step for every this many percent of the carbon goal. */
export const TREE_GROWTH_STEP_PERCENT = 5

/** Steps from seed (0) to full canopy (100 percent and above). */
export const TREE_MAX_STEP = 100 / TREE_GROWTH_STEP_PERCENT

/**
 * Stage names for the text and aria-label, by tree step (inclusive).
 * To be confirmed by the team.
 */
export const TREE_STAGE_LABELS = [
  { from: 0, to: 1, label: 'seed' },
  { from: 2, to: 5, label: 'sprout' },
  { from: 6, to: 10, label: 'sapling' },
  { from: 11, to: 19, label: 'tree' },
  { from: 20, to: 20, label: 'full canopy' },
] as const

/** One fruit appears for every this many percent of the savings goal. */
export const SAVINGS_FRUIT_STEP_PERCENT = 5

/** A month within this share of the month before counts as "similar". To be confirmed by the team. */
export const SIMILAR_MONTH_BAND = 0.05

/** Finish estimate rules. To be confirmed by the team. */
export const FINISH_ESTIMATE = {
  lookbackMonths: 3,
  minCompleteMonths: 2,
  maxYears: 5,
} as const

/** Round battery figures used in the worked carbon examples. */
export const CARBON_EXAMPLE_KWH = [10, 100] as const

/**
 * If the profile is incomplete, goals cannot be typed in by hand.
 * To be confirmed by the team.
 */
export const ALLOW_MANUAL_GOALS_WITHOUT_PROFILE = false

export const GOAL_LABELS = {
  savings: {
    title: 'Savings goal',
    unitLabel: 'AUD',
  },
  carbon: {
    title: 'Carbon goal',
    unitLabel: 'kg CO2e',
  },
} as const

export const GOALS_DEVICE_NOTE =
  'Your goals and progress stay on this device. There is no account and no server copy.'
