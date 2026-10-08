/**
 * Validity limit for one interval of battery energy.
 */
import { MAX_INTERVAL_KWH_FACTOR } from '../../constants/batterySources'
import { FIELD_BOUNDS, clampNumber } from '../../constants/validation'
import type { ProfileData } from '../../types/profile'
import type { MethodologyBundle } from '../methodologyApi'

/**
 * maxIntervalKwh
 * @param profile - Saved household answers (battery model and units)
 * @param bundle - Methodology data with usable capacity per battery model
 * @returns The largest kWh one interval may hold before the row is treated as invalid
 *
 * A battery cannot move more than its usable capacity in a single interval,
 * so anything above capacity × MAX_INTERVAL_KWH_FACTOR is a bad value, not a
 * real reading. Unknown models use the methodology's default model.
 */
export function maxIntervalKwh(profile: ProfileData, bundle: MethodologyBundle): number {
  const match = bundle.batteryModels.find((row) => row.name === profile.batteryModel)
  const fallback = bundle.batteryModels.find((row) => row.isDefault)
  const usable = match?.usableKwh ?? fallback?.usableKwh ?? 0
  const units = clampNumber(
    profile.batteryUnits || 1,
    FIELD_BOUNDS.batteryUnits.min,
    FIELD_BOUNDS.batteryUnits.max,
  )
  return usable * units * MAX_INTERVAL_KWH_FACTOR
}
