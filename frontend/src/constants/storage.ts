/**
 * localStorage key for the household profile.
 *
 * Changing this key orphans existing saved data on the user's device.
 */

export const PROFILE_STORAGE_KEY = 'mypowerplant.profile'

/** Reject a stored blob larger than this so a tampered key cannot fill the origin quota. */
export const PROFILE_MAX_JSON_BYTES = 8192

/** Shown on setup and profile. There is no server copy and no scheduled purge. */
export const DEVICE_STORAGE_NOTE =
  'Your answers stay on this device until you reset or clear site data. We do not keep a server copy.'
