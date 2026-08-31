import {
  APPLIANCE_DATASET,
  BATTERY_CAPACITY_KWH,
  DEFAULT_BATTERY_KWH,
  DEFAULT_FEED_IN_RATE,
  DEFAULT_RETAIL_RATE,
  MELBOURNE_PEAK_SUN_HOURS,
  ORIENTATION_FACTOR,
  SOLAR_PERFORMANCE_RATIO,
  TYPICAL_POTENTIAL_KW,
  VIC_GRID_KG_CO2_PER_KWH,
  type ApplianceSpec,
} from '../data/appliances'
import { VPP_PLANS, type VppPlan } from '../data/vppPlans'
import { locationFromPostcode } from '../data/profileOptions'
import type { PeakPeriod, ProfileData } from '../types/profile'

export type Timeframe = 'daily' | 'weekly' | 'monthly'

export type ValueKind = 'estimate' | 'from_you' | 'sourced'

export type ApplianceLine = {
  spec: ApplianceSpec
  units: number
  hoursPerWeek: number
  weeklyKwh: number
  fromYou: boolean
}

export type BalancePeriod = {
  id: PeakPeriod
  label: string
  hint: string
  consumptionKwh: number
  generationKwh: number
}

export type Assumption = {
  title: string
  detail: string
  kind: ValueKind
}

export type PlanComparison = {
  plan: VppPlan
  weeklySavings: number
  isCurrent: boolean
  isRecommended: boolean
}

export type KpiReport = {
  locationLabel: string
  hasSolar: boolean
  solarIsPotential: boolean
  consumptionKind: ValueKind
  retailRate: number
  retailRateKind: ValueKind
  weekly: {
    consumptionKwh: number
    generationKwh: number
    selfConsumedKwh: number
    surplusKwh: number
    energyDistributedKwh: number
    savingsAud: number
    carbonAvoidedKg: number
  }
  appliances: ApplianceLine[]
  periods: BalancePeriod[]
  currentPlan: PlanComparison | null
  matchedPlans: PlanComparison[]
  recommended: PlanComparison
  assumptions: Assumption[]
}

const PERIODS: { id: PeakPeriod; label: string; hint: string }[] = [
  { id: 'morning', label: 'Morning', hint: '6am – 12pm' },
  { id: 'afternoon', label: 'Afternoon', hint: '12pm – 6pm' },
  { id: 'evening', label: 'Evening', hint: '6pm – 10pm' },
  { id: 'night', label: 'Night', hint: '10pm – 6am' },
]

const SOLAR_SHARE: Record<PeakPeriod, number> = {
  morning: 0.28,
  afternoon: 0.55,
  evening: 0.15,
  night: 0.02,
}

export function parseCount(value: string): number {
  const n = Number.parseInt(String(value).replace('+', ''), 10)
  return Number.isFinite(n) ? n : 0
}

export function scaleKwh(weekly: number, timeframe: Timeframe): number {
  if (timeframe === 'daily') return weekly / 7
  if (timeframe === 'monthly') return weekly * 4
  return weekly
}

export function scaleAud(weekly: number, timeframe: Timeframe): number {
  return scaleKwh(weekly, timeframe)
}

function fieldIsUser(profile: ProfileData, field: keyof ProfileData): boolean {
  return profile.fieldSources[field] === 'user'
}

function applianceLines(profile: ProfileData): ApplianceLine[] {
  const people = Math.max(parseCount(profile.people), 1)
  const rooms = Math.max(parseCount(profile.rooms), 1)
  const fridges = Math.max(parseCount(profile.refrigerators), 0)
  const dryerWeek = parseCount(profile.dryerWeek)
  const dryerWeekend = parseCount(profile.dryerWeekend)
  const lines: ApplianceLine[] = []

  function add(
    id: keyof typeof APPLIANCE_DATASET,
    units: number,
    hours?: number,
    fromYou = false,
  ) {
    if (units <= 0) return
    const spec = APPLIANCE_DATASET[id]
    const hoursPerWeek = hours ?? spec.typicalHoursPerWeek
    lines.push({
      spec,
      units,
      hoursPerWeek,
      weeklyKwh: units * spec.powerKw * hoursPerWeek,
      fromYou,
    })
  }

  add('tv', 1)
  if (profile.wfh === 'yes') add('monitor', 1, 40, fieldIsUser(profile, 'wfh'))
  add(
    'refrigerator',
    fridges || 1,
    APPLIANCE_DATASET.refrigerator.typicalHoursPerWeek,
    fieldIsUser(profile, 'refrigerators'),
  )
  add('dishwasher', people >= 3 ? 1 : 0)
  add('washer', 1, Math.max(2, people))
  if (profile.dryer === 'yes') {
    const cycles = Math.max(dryerWeek + dryerWeekend, 1)
    add('dryer', 1, cycles, fieldIsUser(profile, 'dryer'))
  }
  if (profile.cooling === 'air_conditioning') {
    add('aircon', 1, Math.min(28, 8 + rooms * 1.5), fieldIsUser(profile, 'cooling'))
  } else if (profile.cooling === 'evaporative') {
    add('evaporative', 1, 12, fieldIsUser(profile, 'cooling'))
  }
  if (profile.heating === 'electric') {
    add('heater', 1, Math.min(24, 6 + rooms), fieldIsUser(profile, 'heating'))
  }
  if (profile.hotWater === 'yes' && profile.gas !== 'yes') {
    add('waterHeater', 1, 8, fieldIsUser(profile, 'hotWater'))
  }

  return lines
}

function weeklySolarKwh(profile: ProfileData, potential: boolean): number {
  const orientation =
    ORIENTATION_FACTOR[profile.solarDirection] ?? ORIENTATION_FACTOR.not_sure
  const kw = potential
    ? TYPICAL_POTENTIAL_KW
    : (parseCount(profile.panelCount) * parseCount(profile.panelWatts)) / 1000
  if (kw <= 0) return 0
  const daily = kw * MELBOURNE_PEAK_SUN_HOURS * SOLAR_PERFORMANCE_RATIO * orientation
  return daily * 7
}

function consumptionShares(peak: PeakPeriod | ''): Record<PeakPeriod, number> {
  const shares: Record<PeakPeriod, number> = {
    morning: 0.2,
    afternoon: 0.2,
    evening: 0.2,
    night: 0.2,
  }
  const peakId = peak || 'evening'
  shares[peakId] = 0.4
  return shares
}

function batteryUsableKwh(profile: ProfileData): number {
  const units = Math.max(profile.batteryUnits || 0, 0)
  if (units <= 0) return 0
  const capacity = BATTERY_CAPACITY_KWH[profile.batteryModel] ?? DEFAULT_BATTERY_KWH
  const reserve = Math.min(Math.max(parseCount(profile.reservePercent), 0), 80) / 100
  return units * capacity * (1 - reserve)
}

function retailRate(profile: ProfileData): { rate: number; kind: ValueKind } {
  const bill = Number.parseFloat(profile.monthlyBill)
  const kwh = Number.parseFloat(profile.monthlyKwh)
  if (bill > 0 && kwh > 0) {
    return {
      rate: bill / kwh,
      kind:
        fieldIsUser(profile, 'monthlyBill') || fieldIsUser(profile, 'monthlyKwh')
          ? 'from_you'
          : 'estimate',
    }
  }
  return { rate: DEFAULT_RETAIL_RATE, kind: 'estimate' }
}

function compatiblePlans(profile: ProfileData): VppPlan[] {
  const model = profile.batteryModel
  const matches = VPP_PLANS.filter(
    (plan) => !model || plan.compatibleBatteries.includes(model),
  )
  return matches.length ? matches : VPP_PLANS
}

function weeklySavingsFrom(
  selfConsumed: number,
  distributed: number,
  retail: number,
  exportRate: number,
): number {
  return selfConsumed * retail + distributed * exportRate
}

export function buildKpiReport(profile: ProfileData): KpiReport {
  const appliances = applianceLines(profile)
  const modelledWeekly = appliances.reduce((sum, line) => sum + line.weeklyKwh, 0)
  const billedMonthly = Number.parseFloat(profile.monthlyKwh)
  const hasBilled = billedMonthly > 0
  const consumptionWeekly = hasBilled ? billedMonthly / 4 : modelledWeekly
  const consumptionKind: ValueKind = hasBilled
    ? fieldIsUser(profile, 'monthlyKwh')
      ? 'from_you'
      : 'estimate'
    : 'estimate'

  const hasSolar = profile.hasSolar === 'yes'
  const solarIsPotential = !hasSolar
  const generationWeekly = weeklySolarKwh(profile, solarIsPotential)

  const shares = consumptionShares(profile.peakPeriod)
  const periods: BalancePeriod[] = PERIODS.map((period) => ({
    ...period,
    consumptionKwh: consumptionWeekly * shares[period.id],
    generationKwh: generationWeekly * SOLAR_SHARE[period.id],
  }))

  const daytimeShare = shares.morning + shares.afternoon
  const selfConsumedRaw = Math.min(generationWeekly, consumptionWeekly * daytimeShare)
  const leftoverExport = Math.max(0, generationWeekly - selfConsumedRaw)
  const usableBattery = batteryUsableKwh(profile)
  const shifted = Math.min(usableBattery, leftoverExport * 0.5, consumptionWeekly * shares.evening)
  const selfConsumed = selfConsumedRaw + shifted
  const energyDistributed = Math.max(0, generationWeekly - selfConsumed)
  const surplus = Math.max(0, generationWeekly - consumptionWeekly)

  const { rate, kind: retailRateKind } = retailRate(profile)
  const plans = compatiblePlans(profile)
  const currentBrand = profile.provider
  const comparisons: PlanComparison[] = plans
    .map((plan) => ({
      plan,
      weeklySavings: weeklySavingsFrom(selfConsumed, energyDistributed, rate, plan.exportRate),
      isCurrent: Boolean(currentBrand) && plan.brand === currentBrand,
      isRecommended: false,
    }))
    .sort((a, b) => b.weeklySavings - a.weeklySavings)

  const currentPlan = comparisons.find((item) => item.isCurrent) ?? null
  const recommendedIndex = comparisons.findIndex((item) => !item.isCurrent)
  const recommended =
    comparisons[recommendedIndex >= 0 ? recommendedIndex : 0] ?? comparisons[0]
  const matchedPlans = comparisons.map((item) => ({
    ...item,
    isRecommended: item.plan.id === recommended.plan.id,
  }))

  const headline = matchedPlans.find((item) => item.isRecommended) ?? recommended
  const carbonAvoidedKg = energyDistributed * VIC_GRID_KG_CO2_PER_KWH
  const place = locationFromPostcode(profile.postcode)

  const assumptions: Assumption[] = [
    {
      title: 'Energy consumption',
      detail: hasBilled
        ? `We used your average monthly usage (${billedMonthly} kWh) and converted it with the methodology rule monthly = weekly × 4.`
        : `We added up typical appliances with E = N × P × H, because no monthly kWh was saved.`,
      kind: consumptionKind,
    },
    {
      title: 'Appliance ratings',
      detail:
        'Power (kW) comes from a typical-appliance dataset, not a meter. Hours use your dryer counts and work-from-home answer where we have them; otherwise typical hours.',
      kind: 'estimate',
    },
    {
      title: hasSolar ? 'Solar generation' : 'Solar potential',
      detail: hasSolar
        ? `Panel count × watt rating × ${MELBOURNE_PEAK_SUN_HOURS} peak sun hours × ${SOLAR_PERFORMANCE_RATIO} performance ratio, adjusted for roof direction. No IoT device is used.`
        : `You said this home has no solar, so we show potential for a typical ${TYPICAL_POTENTIAL_KW} kW north-west-to-north roof. Live Open-Meteo irradiance is not wired yet.`,
      kind: 'estimate',
    },
    {
      title: 'Retail electricity rate',
      detail:
        retailRateKind === 'from_you'
          ? `Taken from your monthly bill ÷ monthly kWh ($${rate.toFixed(2)} / kWh).`
          : `No complete bill figures, so we used a typical Victorian retail rate of $${DEFAULT_RETAIL_RATE.toFixed(2)} / kWh.`,
      kind: retailRateKind,
    },
    {
      title: 'VPP credit',
      detail: `Matched plan “${headline.plan.name}” credits $${headline.plan.exportRate.toFixed(2)} / kWh on energy sent to the grid. Standard feed-in without a VPP is about $${DEFAULT_FEED_IN_RATE.toFixed(2)}.`,
      kind: 'sourced',
    },
    {
      title: 'Carbon avoided',
      detail: `Estimated energy distributed × ${VIC_GRID_KG_CO2_PER_KWH} kg CO₂-e / kWh (Victorian grid average). This is an estimate, not a certificate.`,
      kind: 'estimate',
    },
    {
      title: 'Timeframes',
      detail: 'Daily = weekly ÷ 7. Weekly is the modelled week. Monthly = weekly × 4, as specified in the KPI methodology.',
      kind: 'sourced',
    },
  ]

  return {
    locationLabel: place || 'VIC',
    hasSolar,
    solarIsPotential,
    consumptionKind,
    retailRate: rate,
    retailRateKind,
    weekly: {
      consumptionKwh: consumptionWeekly,
      generationKwh: generationWeekly,
      selfConsumedKwh: selfConsumed,
      surplusKwh: surplus,
      energyDistributedKwh: energyDistributed,
      savingsAud: headline.weeklySavings,
      carbonAvoidedKg,
    },
    appliances,
    periods,
    currentPlan: currentPlan
      ? { ...currentPlan, isRecommended: currentPlan.plan.id === headline.plan.id }
      : null,
    matchedPlans,
    recommended: headline,
    assumptions,
  }
}

export function formatKwh(value: number): string {
  if (value >= 100) return `${Math.round(value)} kWh`
  if (value >= 10) return `${value.toFixed(1)} kWh`
  return `${value.toFixed(2)} kWh`
}

export function formatAud(value: number): string {
  const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(2)
  return `$${rounded}`
}

export function formatKg(value: number): string {
  if (value >= 10) return `${Math.round(value)} kg`
  return `${value.toFixed(1)} kg`
}
