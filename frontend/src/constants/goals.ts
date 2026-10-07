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
