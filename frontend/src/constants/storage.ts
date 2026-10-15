/**
 * localStorage key for the household profile.
 *
 * Changing this key orphans existing saved data on the user's device.
 */

export const PROFILE_STORAGE_KEY = 'mypowerplant.profile'

/** Matt vs Rain path — separate from the household profile blob. */
export const JOURNEY_STORAGE_KEY = 'mypowerplant.journey'

/** Reminders downloaded from the Reminders tab, listed on the improve-flow profile. */
export const REMINDERS_STORAGE_KEY = 'mypowerplant.reminders'

/** Which flow tutorials were finished or skipped, so each shows once. */
export const TUTORIAL_STORAGE_KEY = 'mypowerplant.tutorials'

/** Bolt's one-time hello on the path-choice screen (this browser session). */
export const BOLT_HELLO_STORAGE_KEY = 'mypowerplant.boltHello'

/** Reject a stored blob larger than this so a tampered key cannot fill the origin quota. */
export const PROFILE_MAX_JSON_BYTES = 8192

/** Shown on setup and profile. There is no server copy and no scheduled purge. */
export const DEVICE_STORAGE_NOTE =
  'Your answers stay on this device until you reset or clear site data. We do not keep a server copy.'
