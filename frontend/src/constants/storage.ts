/**
 * localStorage key for the household profile.
 *
 * Changing this key orphans existing saved data on the user's device.
 */

export const PROFILE_STORAGE_KEY = 'mypowerplant.profile'

/** Reject a stored blob larger than this so a tampered key cannot fill the origin quota. */
export const PROFILE_MAX_JSON_BYTES = 8192
