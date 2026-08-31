/**
 * Typical running power (kW) used by the KPI methodology: E = N × P × H.
 *
 * Power rates for named GEMS categories come from Energy Rating Data for
 * Household Appliances (GEMS Regulator / data.gov.au), as recorded in the
 * project appliance table. Hours are typical weekly use — the table has none.
 */
export type ApplianceSpec = {
  id: string
  category: 'Entertainment' | 'Kitchen & Household' | 'Laundry' | 'Heating / Cooling'
  name: string
  powerKw: number
  typicalHoursPerWeek: number
}

export const APPLIANCE_DATASET: Record<string, ApplianceSpec> = {
  tv: {
    id: 'tv',
    category: 'Entertainment',
    name: 'TV',
    powerKw: 0.117,
    typicalHoursPerWeek: 21,
  },
  monitor: {
    id: 'monitor',
    category: 'Entertainment',
    name: 'Computer monitor',
    powerKw: 0.025,
    typicalHoursPerWeek: 35,
  },
  refrigerator: {
    id: 'refrigerator',
    category: 'Kitchen & Household',
    name: 'Refrigerator',
    powerKw: 1.92,
    typicalHoursPerWeek: 168,
  },
  dishwasher: {
    id: 'dishwasher',
    category: 'Kitchen & Household',
    name: 'Dishwasher',
    powerKw: 0.213,
    typicalHoursPerWeek: 4,
  },
  washer: {
    id: 'washer',
    category: 'Laundry',
    name: 'Clothes washer',
    powerKw: 0.551,
    typicalHoursPerWeek: 3,
  },
  dryer: {
    id: 'dryer',
    category: 'Laundry',
    name: 'Clothes dryer',
    powerKw: 0.884,
    typicalHoursPerWeek: 3,
  },
  aircon: {
    id: 'aircon',
    category: 'Heating / Cooling',
    name: 'Air conditioner',
    powerKw: 1.92,
    typicalHoursPerWeek: 14,
  },
  evaporative: {
    id: 'evaporative',
    category: 'Heating / Cooling',
    name: 'Evaporative cooler',
    powerKw: 0.7,
    typicalHoursPerWeek: 12,
  },
  heater: {
    id: 'heater',
    category: 'Heating / Cooling',
    name: 'Electric heater',
    powerKw: 2.1,
    typicalHoursPerWeek: 10,
  },
  waterHeater: {
    id: 'waterHeater',
    category: 'Heating / Cooling',
    name: 'Electric water heater',
    powerKw: 3.6,
    typicalHoursPerWeek: 8,
  },
}

/** Typical usable battery capacity (kWh) when the user has not given a kWh rating. */
export const BATTERY_CAPACITY_KWH: Record<string, number> = {
  'Tesla Powerwall 2': 13.5,
  'Sungrow SBR HV': 12.8,
  'BYD Battery-Box Premium LVL': 13.8,
  'AlphaESS SMILE5': 10.1,
  'Goodwe Lynx Home F': 10.24,
  SonnenBatterie: 10,
}

export const DEFAULT_BATTERY_KWH = 10

/** Melbourne-area peak sun hours used until Open-Meteo is wired in. */
export const MELBOURNE_PEAK_SUN_HOURS = 4.2

export const SOLAR_PERFORMANCE_RATIO = 0.8

/** North-facing is best in Victoria. South-facing is the weakest. */
export const ORIENTATION_FACTOR: Record<string, number> = {
  N: 1,
  NE: 0.95,
  NW: 0.95,
  E: 0.85,
  W: 0.85,
  SE: 0.7,
  SW: 0.7,
  S: 0.55,
  not_sure: 0.85,
}

/** Typical rooftop size used only as solar *potential* when the home has no panels. */
export const TYPICAL_POTENTIAL_KW = 6.6

/** Victorian grid emissions intensity (kg CO2-e per kWh sent to the grid). */
export const VIC_GRID_KG_CO2_PER_KWH = 0.77

export const DEFAULT_RETAIL_RATE = 0.32
export const DEFAULT_FEED_IN_RATE = 0.05
