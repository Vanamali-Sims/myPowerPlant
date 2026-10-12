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

/** v2 added the battery-file baseline. v1 stores are read and moved up with no baseline. */
export const GOALS_STORE_VERSION = 2

/** Reject a stored blob larger than this so a tampered key cannot fill the origin quota. */
export const GOALS_MAX_JSON_BYTES = 65536

/** About ten years of monthly records. */
export const MAX_STORED_MONTHS = 120

/**
 * Goal suggestion rule: months of the baseline month's savings and carbon.
 * The baseline month is added to progress when goals are saved, so the lowest
 * goal is two months to leave at least one month still to go.
 * To be confirmed by the team.
 */
export const GOAL_SUGGESTION_MONTHS = {
  min: 2,
  suggested: 3,
  max: 13,
} as const

/**
 * Baseline rules for the battery file read before goals are set.
 * The current month counts as recent too, alongside the full months before it.
 * To be confirmed by the team.
 */
export const BASELINE_RULES = {
  /** Fewest complete days a month needs before it can be the baseline. */
  minCompleteDays: 14,
  /** Average month length used to scale a part-month to a full month. */
  daysPerMonth: 30.4,
  /** How many full months before the current one still count as recent. */
  recentMonths: 3,
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

/**
 * Accepted usage rate, in cents per kWh, when the person types theirs from a
 * bill or contract. Wide enough for any Victorian plan. To be confirmed by the team.
 */
export const GOAL_RATE_CENTS = {
  min: 5,
  max: 100,
  example: 32,
} as const

/** The tree grows one step for every this many percent of the carbon goal. */
export const TREE_GROWTH_STEP_PERCENT = 5

/** Steps from seed (0) to full canopy (100 percent and above). */
export const TREE_MAX_STEP = 100 / TREE_GROWTH_STEP_PERCENT

/**
 * Stage names by tree step (inclusive): seed from 0%, sprout from 20%, sapling
 * from 40%, young tree from 60%, and harvest at 100% of the carbon goal.
 * To be confirmed by the team.
 */
export const TREE_STAGE_LABELS = [
  { from: 0, to: 3, label: 'seed' },
  { from: 4, to: 7, label: 'sprout' },
  { from: 8, to: 11, label: 'sapling' },
  { from: 12, to: 19, label: 'young tree' },
  { from: 20, to: 20, label: 'harvest' },
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

/**
 * Carbon one tree absorbs, for the "tree equivalent" comparison. Taken from a
 * secondary source only. Source to be confirmed by the team.
 */
export const KG_CO2_PER_TREE = 268

export const TREE_FIGURE_SOURCE = 'Tree figure: about 268 kg of CO2 per tree. Source to be confirmed.'

/** How long the confetti runs, in milliseconds. */
export const CONFETTI_DURATION_MS = 3000

/**
 * How far a month's discharge or intake kWh may differ from what was saved
 * before the month is treated as possibly revised. To be confirmed by the team.
 */
export const REVISION_TOLERANCE_KWH = 0.05

/** Round battery figures used in the worked carbon examples. */
export const CARBON_EXAMPLE_KWH = [10, 100] as const

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

/** Copy for the Goals page once goals are set. */
export const GOALS_PAGE = {
  eyebrow: 'Goals',
  title: 'Grow your savings. Grow your tree.',
  /** How the tree reads, shown one sentence per line inside the green card. */
  legend: ['Each orange is 5% of your savings goal.', 'The tree grows with every 5% of your carbon goal.'],
  /** Under the title: what to do to see progress. */
  uploadPrompt: 'Upload your battery CSV to see your progress. Nothing counts until a file is added.',
  uploadPromptAgain: 'Upload your latest battery CSV each month to keep your progress up to date.',
  edit: 'Edit goals',
  upload: 'Upload battery CSV',
  footer: 'All figures are estimates, not a bill or metered result. Goals and history stay on this device.',
  clear: 'Clear goals and history',
} as const

/** Copy for the upload dialog. */
export const GOALS_UPLOAD = {
  title: 'Upload this month’s file',
  lede: 'Add your battery activity file to update your goals and grow your tree.',
  drop: 'Drop your CSV here, or',
  browse: 'browse',
  hint: 'Your Tesla or Amber battery export (.csv) — we’ll detect which one.',
  guide: 'How to get your file',
  privacy: 'Read on this device only. Never uploaded or kept.',
  confirm: 'Update my goals',
  willAdd: 'This file will add',
} as const

export const GOALS_DEVICE_NOTE =
  'Your goals and progress stay on this device. There is no account and no server copy.'
