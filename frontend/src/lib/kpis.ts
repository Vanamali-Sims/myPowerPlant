/**
 * Household KPI model: consumption, solar, VPP savings, and transparency notes.
 *
 * Numbers are simulated from the saved profile plus published typical ratings
 * loaded from GET /api/methodology. Nothing here is a live meter reading.
 */
import { DAYS_PER_WEEK, DEFAULT_PEAK_PERIOD, WEEKS_PER_MONTH } from '../constants/kpiMethodology'
import { DEFAULT_LOCATION_LABEL, FIELD_BOUNDS } from '../constants/validation'
import { locationFromPostcode } from '../data/profileOptions'
import type { PeakPeriod, ProfileData } from '../types/profile'
import type {
  ApplianceSpec,
  MethodologyBundle,
  VppPlan,
} from './methodologyApi'

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

/**
 * parseCount
 * @param value - Select/option string such as "6+" or "3"
 * @returns Parsed integer, or 0 when the value is empty or not a number
 *
 * The trailing "+" on options like "6+" is stripped so household size still
 * contributes a usable count to the appliance model.
 */
export function parseCount(value: string): number {
  const n = Number.parseInt(String(value).replace('+', ''), 10)
  return Number.isFinite(n) ? n : 0
}

/**
 * scaleKwh
 * @param weekly - Modelled weekly kilowatt-hours
 * @param timeframe - Daily, weekly, or monthly display period
 * @returns The same energy scaled to the requested period
 *
 * Daily divides by 7. Monthly uses weekly × 4, matching the KPI methodology
 * rather than a calendar month, so the toggle stays comparable.
 */
export function scaleKwh(weekly: number, timeframe: Timeframe): number {
  if (timeframe === 'daily') return weekly / DAYS_PER_WEEK
  if (timeframe === 'monthly') return weekly * WEEKS_PER_MONTH
  return weekly
}

/**
 * scaleAud
 * @param weekly - Modelled weekly dollar amount
 * @param timeframe - Daily, weekly, or monthly display period
 * @returns The same dollar amount scaled like scaleKwh
 *
 * Savings use the same period rule as energy so the two KPI cards stay in
 * lockstep when the user changes Daily / Weekly / Monthly.
 */
export function scaleAud(weekly: number, timeframe: Timeframe): number {
  return scaleKwh(weekly, timeframe)
}

function fieldIsUser(profile: ProfileData, field: keyof ProfileData): boolean {
  return profile.fieldSources[field] === 'user'
}

function applianceLines(profile: ProfileData, data: MethodologyBundle): ApplianceLine[] {
  const { methodology, appliances } = data
  const people = Math.max(parseCount(profile.people), 1)
  const rooms = Math.max(parseCount(profile.rooms), 1)
  const fridges = Math.max(parseCount(profile.refrigerators), 0)
  const dryerWeek = parseCount(profile.dryerWeek)
  const dryerWeekend = parseCount(profile.dryerWeekend)
  const lines: ApplianceLine[] = []

  function add(id: string, units: number, hours?: number, fromYou = false) {
    if (units <= 0) return
    const spec = appliances[id]
    if (!spec) return
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
  if (profile.wfh === 'yes') {
    add('monitor', 1, methodology.wfhMonitorHours, fieldIsUser(profile, 'wfh'))
  }
  add(
    'refrigerator',
    fridges || 1,
    appliances.refrigerator?.typicalHoursPerWeek,
    fieldIsUser(profile, 'refrigerators'),
  )
  // Dishwasher only once the household is large enough to justify a weekly load.
  add('dishwasher', people >= methodology.dishwasherMinPeople ? 1 : 0)
  add('washer', 1, Math.max(methodology.washerMinHours, people))
  if (profile.dryer === 'yes') {
    const cycles = Math.max(dryerWeek + dryerWeekend, 1)
    add('dryer', 1, cycles, fieldIsUser(profile, 'dryer'))
  }
  if (profile.cooling === 'air_conditioning') {
    // Hours grow with rooms, then cap so a large house does not run AC all week.
    add(
      'aircon',
      1,
      Math.min(
        methodology.airconMaxHours,
        methodology.airconBaseHours + rooms * methodology.airconHoursPerRoom,
      ),
      fieldIsUser(profile, 'cooling'),
    )
  } else if (profile.cooling === 'evaporative') {
    add('evaporative', 1, methodology.evaporativeHours, fieldIsUser(profile, 'cooling'))
  }
  if (profile.heating === 'electric') {
    add(
      'heater',
      1,
      Math.min(methodology.heaterMaxHours, methodology.heaterBaseHours + rooms),
      fieldIsUser(profile, 'heating'),
    )
  }
  // Gas hot water is not on the electricity model; only electric HW is counted.
  if (profile.hotWater === 'yes' && profile.gas !== 'yes') {
    add('waterHeater', 1, methodology.waterHeaterHours, fieldIsUser(profile, 'hotWater'))
  }

  return lines
}

function weeklySolarKwh(
  profile: ProfileData,
  potential: boolean,
  data: MethodologyBundle,
): number {
  const orientation =
    data.orientationFactors[profile.solarDirection] ??
    data.orientationFactors.not_sure ??
    1
  const kw = potential
    ? data.methodology.typicalPotentialKw
    : (parseCount(profile.panelCount) * parseCount(profile.panelWatts)) / 1000
  if (kw <= 0) return 0
  const daily =
    kw *
    data.methodology.melbournePeakSunHours *
    data.methodology.solarPerformanceRatio *
    orientation
  return daily * DAYS_PER_WEEK
}

function consumptionShares(
  peak: PeakPeriod | '',
  data: MethodologyBundle,
): Record<PeakPeriod, number> {
  const base = data.methodology.consumptionShareBase
  const shares: Record<PeakPeriod, number> = {
    morning: base,
    afternoon: base,
    evening: base,
    night: base,
  }
  const peakId = peak || DEFAULT_PEAK_PERIOD
  // Peak period takes a double share; the other three stay at the base weight.
  shares[peakId] = data.methodology.consumptionSharePeak
  return shares
}

function batteryUsableKwh(profile: ProfileData, data: MethodologyBundle): number {
  const units = Math.max(profile.batteryUnits || 0, 0)
  if (units <= 0) return 0
  const match = data.batteryModels.find((row) => row.name === profile.batteryModel)
  const fallback =
    data.batteryModels.find((row) => row.isDefault)?.usableKwh ?? 10
  const capacity = match?.usableKwh ?? fallback
  const reserve =
    Math.min(
      Math.max(parseCount(profile.reservePercent), FIELD_BOUNDS.reservePercent.min),
      FIELD_BOUNDS.reservePercent.max,
    ) / 100
  return units * capacity * (1 - reserve)
}

function retailRate(
  profile: ProfileData,
  data: MethodologyBundle,
): { rate: number; kind: ValueKind } {
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
  return { rate: data.methodology.defaultRetailRate, kind: 'estimate' }
}

function compatiblePlans(profile: ProfileData, data: MethodologyBundle): VppPlan[] {
  const model = profile.batteryModel
  const matches = data.vppPlans.filter(
    (plan) => !model || plan.compatibleBatteries.includes(model),
  )
  return matches.length ? matches : data.vppPlans
}

function weeklySavingsFrom(
  selfConsumed: number,
  distributed: number,
  retail: number,
  exportRate: number,
): number {
  return selfConsumed * retail + distributed * exportRate
}

/**
 * buildKpiReport
 * @param profile - Saved household answers, including fieldSources
 * @param data - Appliances, rates, and VPP plans from GET /api/methodology
 * @returns Consumption, generation, savings, appliance lines, and assumptions
 *
 * Prefers billed monthly kWh when present; otherwise sums typical appliances.
 * Solar, battery shift, and VPP credits are estimates — never live telemetry.
 */
export function buildKpiReport(profile: ProfileData, data: MethodologyBundle): KpiReport {
  const appliances = applianceLines(profile, data)
  const modelledWeekly = appliances.reduce((sum, line) => sum + line.weeklyKwh, 0)
  const billedMonthly = Number.parseFloat(profile.monthlyKwh)
  const hasBilled = billedMonthly > 0
  const consumptionWeekly = hasBilled ? billedMonthly / WEEKS_PER_MONTH : modelledWeekly
  const consumptionKind: ValueKind = hasBilled
    ? fieldIsUser(profile, 'monthlyKwh')
      ? 'from_you'
      : 'estimate'
    : 'estimate'

  const hasSolar = profile.hasSolar === 'yes'
  const solarIsPotential = !hasSolar
  const generationWeekly = weeklySolarKwh(profile, solarIsPotential, data)

  const shares = consumptionShares(profile.peakPeriod, data)
  const periods: BalancePeriod[] = data.peakPeriods.map((period) => ({
    id: period.id,
    label: period.label,
    hint: period.hint,
    consumptionKwh: consumptionWeekly * shares[period.id],
    generationKwh: generationWeekly * period.solarShare,
  }))

  const daytimeShare = shares.morning + shares.afternoon
  const selfConsumedRaw = Math.min(generationWeekly, consumptionWeekly * daytimeShare)
  const leftoverExport = Math.max(0, generationWeekly - selfConsumedRaw)
  const usableBattery = batteryUsableKwh(profile, data)
  // Battery can only shift part of leftover export into evening — not all of it.
  const shifted = Math.min(
    usableBattery,
    leftoverExport * data.methodology.batteryShiftFactor,
    consumptionWeekly * shares.evening,
  )
  const selfConsumed = selfConsumedRaw + shifted
  const energyDistributed = Math.max(0, generationWeekly - selfConsumed)
  const surplus = Math.max(0, generationWeekly - consumptionWeekly)

  const { rate, kind: retailRateKind } = retailRate(profile, data)
  const plans = compatiblePlans(profile, data)
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
  if (!recommended) {
    throw new Error('Methodology bundle has no VPP plans')
  }
  const matchedPlans = comparisons.map((item) => ({
    ...item,
    isRecommended: item.plan.id === recommended.plan.id,
  }))

  const headline = matchedPlans.find((item) => item.isRecommended) ?? recommended
  const carbonAvoidedKg = energyDistributed * data.methodology.vicGridKgCo2PerKwh
  const place = locationFromPostcode(profile.postcode)
  const m = data.methodology

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
        ? `Panel count × watt rating × ${m.melbournePeakSunHours} peak sun hours × ${m.solarPerformanceRatio} performance ratio, adjusted for roof direction. No IoT device is used.`
        : `You said this home has no solar, so we show potential for a typical ${m.typicalPotentialKw} kW north-west-to-north roof. Live Open-Meteo irradiance is not wired yet.`,
      kind: 'estimate',
    },
    {
      title: 'Retail electricity rate',
      detail:
        retailRateKind === 'from_you'
          ? `Taken from your monthly bill ÷ monthly kWh ($${rate.toFixed(2)} / kWh).`
          : `No complete bill figures, so we used a typical Victorian retail rate of $${m.defaultRetailRate.toFixed(2)} / kWh.`,
      kind: retailRateKind,
    },
    {
      title: 'VPP credit',
      detail: `Matched plan “${headline.plan.name}” credits $${headline.plan.exportRate.toFixed(2)} / kWh on energy sent to the grid. Standard feed-in without a VPP is about $${m.defaultFeedInRate.toFixed(2)}.`,
      kind: 'sourced',
    },
    {
      title: 'Carbon avoided',
      detail: `Estimated energy distributed × ${m.vicGridKgCo2PerKwh} kg CO₂-e / kWh (Victorian grid average). This is an estimate, not a certificate.`,
      kind: 'estimate',
    },
    {
      title: 'Timeframes',
      detail: 'Daily = weekly ÷ 7. Weekly is the modelled week. Monthly = weekly × 4, as specified in the KPI methodology.',
      kind: 'sourced',
    },
  ]

  return {
    locationLabel: place || DEFAULT_LOCATION_LABEL,
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

/**
 * formatKwh
 * @param value - Kilowatt-hours to display
 * @returns Rounded string with a kWh suffix
 *
 * Larger totals drop decimals so the KPI cards stay readable.
 * Small totals keep two decimals so a daily view does not look like zero.
 */
export function formatKwh(value: number): string {
  if (value >= 100) return `${Math.round(value)} kWh`
  if (value >= 10) return `${value.toFixed(1)} kWh`
  return `${value.toFixed(2)} kWh`
}

/**
 * formatAud
 * @param value - Dollar amount to display
 * @returns Currency string with a leading $
 *
 * Ten dollars and above round to a whole dollar for the savings card.
 * Smaller amounts keep cents so a daily view still shows a figure.
 */
export function formatAud(value: number): string {
  const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(2)
  return `$${rounded}`
}

/**
 * formatKg
 * @param value - Kilograms of CO2-e
 * @returns Rounded string with a kg suffix
 *
 * Kept for the carbon line if it is shown again later.
 * Rounding matches the energy formatters so the report looks consistent.
 */
export function formatKg(value: number): string {
  if (value >= 10) return `${Math.round(value)} kg`
  return `${value.toFixed(1)} kg`
}
