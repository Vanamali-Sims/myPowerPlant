/**
 * Seed-shaped methodology bundle for KPI self-tests.
 *
 * Mirrors Alembic 003 so tests do not need a running API.
 */
import { mapMethodologyPayload, type MethodologyBundle } from './methodologyApi'

const SOURCE = 'Sample plan terms (CDR-shaped). Not a live CDR feed yet.'

/**
 * seedMethodologyBundle
 * @returns The same lookup data Alembic seeds into Postgres
 *
 * Used only by kpis.selftest. Production dashboard fetches GET /api/methodology.
 */
export function seedMethodologyBundle(): MethodologyBundle {
  return mapMethodologyPayload({
    methodology: {
      melbourne_peak_sun_hours: 4.2,
      solar_performance_ratio: 0.8,
      typical_potential_kw: 6.6,
      vic_grid_kg_co2_per_kwh: 0.77,
      default_retail_rate: 0.32,
      default_feed_in_rate: 0.05,
      battery_shift_factor: 0.5,
      consumption_share_base: 0.2,
      consumption_share_peak: 0.4,
      dishwasher_min_people: 3,
      wfh_monitor_hours: 40,
      washer_min_hours: 2,
      aircon_base_hours: 8,
      aircon_hours_per_room: 1.5,
      aircon_max_hours: 28,
      evaporative_hours: 12,
      heater_base_hours: 6,
      heater_max_hours: 24,
      water_heater_hours: 8,
    },
    appliances: [
      {
        id: 'tv',
        category: 'Entertainment',
        name: 'TV',
        power_kw: 0.117,
        typical_hours_per_week: 21,
      },
      {
        id: 'monitor',
        category: 'Entertainment',
        name: 'Computer monitor',
        power_kw: 0.025,
        typical_hours_per_week: 35,
      },
      {
        id: 'refrigerator',
        category: 'Kitchen & Household',
        name: 'Refrigerator',
        power_kw: 1.92,
        typical_hours_per_week: 168,
      },
      {
        id: 'dishwasher',
        category: 'Kitchen & Household',
        name: 'Dishwasher',
        power_kw: 0.213,
        typical_hours_per_week: 4,
      },
      {
        id: 'washer',
        category: 'Laundry',
        name: 'Clothes washer',
        power_kw: 0.551,
        typical_hours_per_week: 3,
      },
      {
        id: 'dryer',
        category: 'Laundry',
        name: 'Clothes dryer',
        power_kw: 0.884,
        typical_hours_per_week: 3,
      },
      {
        id: 'aircon',
        category: 'Heating / Cooling',
        name: 'Air conditioner',
        power_kw: 1.92,
        typical_hours_per_week: 14,
      },
      {
        id: 'evaporative',
        category: 'Heating / Cooling',
        name: 'Evaporative cooler',
        power_kw: 0.7,
        typical_hours_per_week: 12,
      },
      {
        id: 'heater',
        category: 'Heating / Cooling',
        name: 'Electric heater',
        power_kw: 2.1,
        typical_hours_per_week: 10,
      },
      {
        id: 'waterHeater',
        category: 'Heating / Cooling',
        name: 'Electric water heater',
        power_kw: 3.6,
        typical_hours_per_week: 8,
      },
    ],
    battery_models: [
      { name: 'Tesla Powerwall 2', usable_kwh: 13.5, is_default: false },
      { name: 'Sungrow SBR HV', usable_kwh: 12.8, is_default: false },
      { name: 'BYD Battery-Box Premium LVL', usable_kwh: 13.8, is_default: false },
      { name: 'AlphaESS SMILE5', usable_kwh: 10.1, is_default: false },
      { name: 'Goodwe Lynx Home F', usable_kwh: 10.24, is_default: false },
      { name: 'SonnenBatterie', usable_kwh: 10, is_default: true },
    ],
    orientation_factors: [
      { direction: 'N', factor: 1 },
      { direction: 'NE', factor: 0.95 },
      { direction: 'NW', factor: 0.95 },
      { direction: 'E', factor: 0.85 },
      { direction: 'W', factor: 0.85 },
      { direction: 'SE', factor: 0.7 },
      { direction: 'SW', factor: 0.7 },
      { direction: 'S', factor: 0.55 },
      { direction: 'not_sure', factor: 0.85 },
    ],
    peak_periods: [
      { id: 'morning', label: 'Morning', hint: '6am – 12pm', sort_order: 1, solar_share: 0.28 },
      { id: 'afternoon', label: 'Afternoon', hint: '12pm – 6pm', sort_order: 2, solar_share: 0.55 },
      { id: 'evening', label: 'Evening', hint: '6pm – 10pm', sort_order: 3, solar_share: 0.15 },
      { id: 'night', label: 'Night', hint: '10pm – 6am', sort_order: 4, solar_share: 0.02 },
    ],
    vpp_plans: [
      {
        id: 'agl-vpp',
        brand: 'AGL Energy',
        name: 'AGL Virtual Power Plant',
        export_rate: 0.15,
        lock_in_months: 0,
        dispatch_note: 'Your battery may be called a few times a week. You keep the reserve you set.',
        signup_bonus: 150,
        href: 'https://www.agl.com.au/solar-batteries/batteries/virtual-power-plant',
        source_label: SOURCE,
        compatible_batteries: ['Tesla Powerwall 2', 'Sungrow SBR HV', 'SonnenBatterie'],
      },
      {
        id: 'origin-loop',
        brand: 'Origin Energy',
        name: 'Origin Loop VPP',
        export_rate: 0.12,
        lock_in_months: 12,
        dispatch_note: 'Origin can draw from your battery during grid peaks, within your reserve.',
        signup_bonus: 100,
        href: 'https://www.originenergy.com.au/solar/batteries/origin-loop/',
        source_label: SOURCE,
        compatible_batteries: [
          'Tesla Powerwall 2',
          'AlphaESS SMILE5',
          'Goodwe Lynx Home F',
          'BYD Battery-Box Premium LVL',
        ],
      },
      {
        id: 'ea-power-response',
        brand: 'EnergyAustralia',
        name: 'EnergyAustralia PowerResponse',
        export_rate: 0.1,
        lock_in_months: 0,
        dispatch_note: 'Event-based dispatch. You can usually opt out of a single event.',
        signup_bonus: 50,
        href: 'https://www.energyaustralia.com.au/home/electricity-and-gas/solar/virtual-power-plant',
        source_label: SOURCE,
        compatible_batteries: [
          'Tesla Powerwall 2',
          'Sungrow SBR HV',
          'BYD Battery-Box Premium LVL',
        ],
      },
      {
        id: 'simply-vpp',
        brand: 'Simply Energy',
        name: 'Simply VPP',
        export_rate: 0.18,
        lock_in_months: 24,
        dispatch_note: 'Higher credit, longer contract. Check the exit fee before you switch.',
        signup_bonus: 0,
        href: 'https://www.simplyenergy.com.au/residential/solar-and-batteries/vpp',
        source_label: SOURCE,
        compatible_batteries: ['Tesla Powerwall 2', 'SonnenBatterie', 'Goodwe Lynx Home F'],
      },
      {
        id: 'red-vpp',
        brand: 'Red Energy',
        name: 'Red Energy VPP',
        export_rate: 0.11,
        lock_in_months: 0,
        dispatch_note: 'No lock-in on this sample offer. Credits apply when your battery is dispatched.',
        signup_bonus: 75,
        href: 'https://www.redenergy.com.au/residential/solar/vpp',
        source_label: SOURCE,
        compatible_batteries: ['Tesla Powerwall 2', 'AlphaESS SMILE5', 'Sungrow SBR HV'],
      },
    ],
  })
}
