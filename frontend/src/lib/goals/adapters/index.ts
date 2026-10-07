/**
 * Pluggable list of battery file readers, keyed by source.
 *
 * Every source uses the template reader for now. A provider-specific reader
 * can replace its entry here once its own export is mapped to the template.
 */
import type { BatterySourceId } from '../../../constants/batterySources'
import { readGenericCsv } from './generic'
import type { BatteryAdapter } from './types'

export const BATTERY_ADAPTERS: Partial<Record<BatterySourceId, BatteryAdapter>> = {
  tesla: readGenericCsv,
  amber: readGenericCsv,
}

export function getAdapter(sourceId: BatterySourceId): BatteryAdapter | null {
  return BATTERY_ADAPTERS[sourceId] ?? null
}
