/**
 * Household KPI model: consumption, solar, VPP savings, and transparency notes.
 *
 * Numbers are simulated from the saved profile plus published typical ratings
 * loaded from GET /api/methodology. Nothing here is a live meter reading.
 */
import {
  DAYS_PER_WEEK,
  DEFAULT_PEAK_PERIOD,
  WEEKS_PER_FORTNIGHT,
  WEEKS_PER_MONTH,
} from '../constants/kpiMethodology'
import { DEFAULT_LOCATION_LABEL, FIELD_BOUNDS, clampNumber } from '../constants/validation'
import { locationFromPostcode } from '../data/profileOptions'
import { currentSeason, SEASON_LABELS, type Season } from './season'
import type { PeakPeriod, ProfileData } from '../types/profile'
import type {
  ApplianceSpec,
  MethodologyBundle,
  VppPlan,
} from './methodologyApi'

export type Timeframe = 'daily' | 'weekly' | 'fortnightly'

export type ValueKind = 'estimate' | 'from_you' | 'sourced' | 'sample' | 'unavailable'

export type ApplianceLine = {
  spec: ApplianceSpec
  units: number
  /** Reference hours after the household answer and the seasonal factor. */
  hoursPerWeek: number
  seasonFactor: number
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
  season: Season
  hasSolar: boolean
  solarIsPotential: boolean
  consumptionKind: ValueKind
  retailRate: number | null
  retailRateKind: ValueKind
  weekly: {
    consumptionKwh: number
    generationKwh: number
    selfConsumedKwh: number
    surplusKwh: number
    energyDistributedKwh: number
    /** Null when no retail tariff could be sourced (R4 / §8.2). */
    savingsAud: number | null
    /** (generation − consumption) × retail rate. Null without a tariff. */
    netEnergyValueAud: number | null
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
 * scaleWeekly
 * @param weekly - Any modelled weekly quantity
 * @param timeframe - Daily, weekly, or monthly display period
 * @returns The same quantity scaled to the requested period
 *
 * Daily divides by 7. Fortnightly uses weekly × 2, so the toggle stays a
 * simple multiple of the modelled week rather than a calendar month.
 */
export function scaleWeekly(weekly: number, timeframe: Timeframe): number {
  if (timeframe === 'daily') return weekly / DAYS_PER_WEEK
  if (timeframe === 'fortnightly') return weekly * WEEKS_PER_FORTNIGHT
  return weekly
}

/** Kilowatt-hours on the timeframe toggle. */
export function scaleKwh(weekly: number, timeframe: Timeframe): number {
  return scaleWeekly(weekly, timeframe)
}

/** Dollars on the timeframe toggle, so money and energy stay in lockstep. */
export function scaleAud(weekly: number, timeframe: Timeframe): number {
  return scaleWeekly(weekly, timeframe)
}

function fieldIsUser(profile: ProfileData, field: keyof ProfileData): boolean {
  return profile.fieldSources[field] === 'user'
}

/**
 * dryerHoursPerWeek
 * @param spec - Clothes dryer row, whose hoursPerWeek is a per-person figure
 * @param cycles - Loads a week the household reported, or 0 if unanswered
 * @param people - Household size, at least 1
 * @returns Weekly runtime hours for the dryer
 *
 * The saved dryer counts beat the published average, so they win when present.
 * The fallback scales by household size because the source figure was reported
 * per person, from a 2.5-person household.
 */
function dryerHoursPerWeek(spec: ApplianceSpec, cycles: number, people: number): number {
  if (cycles > 0 && spec.hoursPerCycle) return cycles * spec.hoursPerCycle
  return spec.hoursPerWeek * people
}

/**
 * parseOptionalCount
 * @param raw - A field the wizard lets the user leave blank
 * @param bounds - Inclusive min/max so a tampered localStorage value cannot inflate KPIs
 * @returns null when left blank (published estimate applies), else the count clamped to bounds
 */
function parseOptionalCount(raw: string, bounds: { min: number; max: number }): number | null {
  if (!raw.trim()) return null
  return clampNumber(parseCount(raw), bounds.min, bounds.max)
}

function applianceLines(
  profile: ProfileData,
  data: MethodologyBundle,
  season: Season,
): ApplianceLine[] {
  const { methodology, appliances } = data
  const people = clampNumber(parseCount(profile.people), FIELD_BOUNDS.people.min, FIELD_BOUNDS.people.max)
  const fridges = clampNumber(
    parseCount(profile.refrigerators),
    FIELD_BOUNDS.refrigerators.min,
    FIELD_BOUNDS.refrigerators.max,
  )
  const dryerCycles =
    clampNumber(parseCount(profile.dryerWeek), FIELD_BOUNDS.dryerWeek.min, FIELD_BOUNDS.dryerWeek.max) +
    clampNumber(
      parseCount(profile.dryerWeekend),
      FIELD_BOUNDS.dryerWeekend.min,
      FIELD_BOUNDS.dryerWeekend.max,
    )
  const lines: ApplianceLine[] = []

  function add(id: string, units: number, hours?: number, fromYou = false) {
    if (units <= 0) return
    const spec = appliances[id]
    if (!spec) return
    // Heating and cooling figures are surveyed in their peak season, so they
    // are scaled down (to nothing, out of season) rather than charged all year.
    const seasonFactor = data.seasonalFactors[spec.seasonBasis]?.[season] ?? 1
    const hoursPerWeek = (hours ?? spec.hoursPerWeek) * seasonFactor
    lines.push({
      spec,
      units,
      hoursPerWeek,
      seasonFactor,
      weeklyKwh: units * spec.powerKw * hoursPerWeek,
      fromYou,
    })
  }

  const tvHours = parseOptionalCount(profile.tvHoursPerWeek, FIELD_BOUNDS.tvHoursPerWeek)
  if (tvHours === null) {
    add('tv', 1)
  } else if (tvHours > 0) {
    add('tv', 1, tvHours, fieldIsUser(profile, 'tvHoursPerWeek'))
  }

  if (profile.wfh === 'yes') {
    add('monitor', 1, undefined, fieldIsUser(profile, 'wfh'))
  }

  // refrigerators is a required field — an explicit 0 excludes it via add()'s units<=0 check.
  add('refrigerator', fridges, undefined, fieldIsUser(profile, 'refrigerators'))

  const washerCycles = parseOptionalCount(profile.washerCyclesPerWeek, FIELD_BOUNDS.washerCyclesPerWeek)
  const washerSpec = appliances.washer
  if (washerCycles === null) {
    add('washer', 1)
  } else if (washerCycles > 0) {
    const hours = washerSpec?.hoursPerCycle ? washerCycles * washerSpec.hoursPerCycle : undefined
    add('washer', 1, hours, fieldIsUser(profile, 'washerCyclesPerWeek'))
  }

  const dishwasherCycles = parseOptionalCount(
    profile.dishwasherCyclesPerWeek,
    FIELD_BOUNDS.dishwasherCyclesPerWeek,
  )
  const dishwasherSpec = appliances.dishwasher
  if (dishwasherCycles === null) {
    // No answer: fall back to the previous heuristic — large enough households
    // justify a weekly load.
    add('dishwasher', people >= methodology.dishwasherMinPeople ? 1 : 0)
  } else if (dishwasherCycles > 0) {
    const hours = dishwasherSpec?.hoursPerCycle
      ? dishwasherCycles * dishwasherSpec.hoursPerCycle
      : undefined
    add('dishwasher', 1, hours, fieldIsUser(profile, 'dishwasherCyclesPerWeek'))
  }

  if (profile.dryer === 'yes') {
    const spec = appliances.dryer
    add(
      'dryer',
      1,
      spec ? dryerHoursPerWeek(spec, dryerCycles, people) : undefined,
      dryerCycles > 0 &&
        (fieldIsUser(profile, 'dryerWeek') || fieldIsUser(profile, 'dryerWeekend')),
    )
  }
  if (profile.cooling === 'air_conditioning') {
    const aircHours = parseOptionalCount(profile.airconHoursPerWeek, FIELD_BOUNDS.airconHoursPerWeek)
    if (aircHours === null) {
      add('aircon', 1, undefined, fieldIsUser(profile, 'cooling'))
    } else if (aircHours > 0) {
      add('aircon', 1, aircHours, fieldIsUser(profile, 'airconHoursPerWeek'))
    }
  } else if (profile.cooling === 'evaporative') {
    add('evaporative', 1, undefined, fieldIsUser(profile, 'cooling'))
  }
  if (profile.heating === 'electric') {
    add('heater', 1, undefined, fieldIsUser(profile, 'heating'))
  }
  // Gas hot water is not on the electricity model; only electric HW is counted.
  if (profile.hotWater === 'yes' && profile.gas !== 'yes') {
    add('waterHeater', 1, undefined, fieldIsUser(profile, 'hotWater'))
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
    : (clampNumber(parseCount(profile.panelCount), FIELD_BOUNDS.panelCount.min, FIELD_BOUNDS.panelCount.max) *
        clampNumber(parseCount(profile.panelWatts), FIELD_BOUNDS.panelWatts.min, FIELD_BOUNDS.panelWatts.max)) /
      1000
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
  const units = clampNumber(profile.batteryUnits || 0, 0, FIELD_BOUNDS.batteryUnits.max)
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
): { rate: number | null; kind: ValueKind } {
  const rawBill = Number.parseFloat(profile.monthlyBill)
  const rawKwh = Number.parseFloat(profile.monthlyKwh)
  const bill = clampNumber(rawBill, FIELD_BOUNDS.monthlyBill.min, FIELD_BOUNDS.monthlyBill.max)
  const kwh = clampNumber(rawKwh, FIELD_BOUNDS.monthlyKwh.min, FIELD_BOUNDS.monthlyKwh.max)
  if (rawBill > 0 && rawKwh > 0) {
    return {
      rate: bill / kwh,
      kind:
        fieldIsUser(profile, 'monthlyBill') || fieldIsUser(profile, 'monthlyKwh')
          ? 'from_you'
          : 'estimate',
    }
  }
  // R4 / §8.2: a missing tariff is unavailable — never a typical Victorian rate.
  return { rate: null, kind: 'unavailable' }
}

function compatiblePlans(profile: ProfileData, data: MethodologyBundle): VppPlan[] {
  const model = data.batteryModels.some((row) => row.name === profile.batteryModel)
    ? profile.batteryModel
    : ''
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
 * seasonalNote
 * @param lines - Appliance lines already scaled for the season
 * @param season - Australian season the report was built for
 * @returns Plain-language explanation for the transparency list
 */
function seasonalNote(lines: ApplianceLine[], season: Season): string {
  const label = SEASON_LABELS[season].toLowerCase()
  const seasonal = lines.filter((line) => line.spec.seasonBasis !== 'year_round')
  if (!seasonal.length) {
    return `It is ${label}. Nothing in your profile heats or cools with electricity, so there is no seasonal adjustment.`
  }
  const parts = seasonal.map(
    (line) => `${line.spec.name.toLowerCase()} at ${Math.round(line.seasonFactor * 100)}%`,
  )
  return `Heating and cooling are surveyed in the season people use them most, so we scale them to the time of year. It is ${label}, so we count ${parts.join(' and ')} of the published hours.`
}

/**
 * buildKpiReport
 * @param profile - Saved household answers, including fieldSources
 * @param data - Appliances, rates, and VPP plans from GET /api/methodology
 * @param now - Day to read the season from; defaults to today
 * @returns Consumption, generation, savings, appliance lines, and assumptions
 *
 * Prefers billed monthly kWh when present; otherwise sums typical appliances.
 * Solar, battery shift, and VPP credits are estimates — never live telemetry.
 */
export function buildKpiReport(
  profile: ProfileData,
  data: MethodologyBundle,
  now: Date = new Date(),
): KpiReport {
  const season = currentSeason(now)
  const appliances = applianceLines(profile, data, season)
  const modelledWeekly = appliances.reduce((sum, line) => sum + line.weeklyKwh, 0)
  const billedMonthlyRaw = Number.parseFloat(profile.monthlyKwh)
  const hasBilled = billedMonthlyRaw > 0
  const billedMonthly = hasBilled
    ? clampNumber(billedMonthlyRaw, FIELD_BOUNDS.monthlyKwh.min, FIELD_BOUNDS.monthlyKwh.max)
    : billedMonthlyRaw
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

  const { rate, kind: retailRateKind } = retailRate(profile)
  const plans = compatiblePlans(profile, data)
  const knownBrands = new Set(data.vppPlans.map((plan) => plan.brand))
  const currentBrand = knownBrands.has(profile.provider) ? profile.provider : ''
  const pricedRate = rate ?? 0
  const comparisons: PlanComparison[] = plans
    .map((plan) => ({
      plan,
      weeklySavings: weeklySavingsFrom(
        selfConsumed,
        energyDistributed,
        pricedRate,
        plan.exportRate,
      ),
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
  // Headline savings shown on the card: value of what you make against what you
  // use, at your retail rate. Absent when R4 forbids substituting a tariff.
  const netEnergyValueAud =
    rate == null ? null : (generationWeekly - consumptionWeekly) * rate
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
      title: 'Appliance hours',
      detail:
        'Weekly hours come from published Australian usage surveys, listed against each appliance below. Your dryer counts replace the published average when you have saved them.',
      kind: 'sourced',
    },
    {
      title: `Season (${SEASON_LABELS[season]})`,
      detail: seasonalNote(appliances, season),
      kind: 'estimate',
    },
    {
      title: 'Appliance power ratings',
      detail:
        'Power (kW) is a typical rating, not a meter reading. The refrigerator uses the average draw its energy label implies, because it cycles on and off all day rather than running flat out.',
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
        rate == null
          ? 'No complete bill figures were saved, so the retail rate is unavailable. Dollar figures are not filled in with a typical Victorian tariff.'
          : retailRateKind === 'from_you'
            ? `Taken from your monthly bill ÷ monthly kWh ($${rate.toFixed(2)} / kWh).`
            : `Taken from the saved monthly bill ÷ monthly kWh ($${rate.toFixed(2)} / kWh).`,
      kind: retailRateKind,
    },
    {
      title: 'VPP credit',
      detail: `Matched plan “${headline.plan.name}” uses a sample export rate of $${headline.plan.exportRate.toFixed(2)} / kWh. These are CDR-shaped placeholders, not a live plan feed. Standard feed-in without a VPP is about $${m.defaultFeedInRate.toFixed(2)}.`,
      kind: 'sample',
    },
    {
      title: 'Carbon avoided',
      detail: `Estimated energy distributed × ${m.vicGridKgCo2PerKwh} kg CO₂-e / kWh (Victorian grid average). This is an estimate, not a certificate.`,
      kind: 'estimate',
    },
    {
      title: 'Timeframes',
      detail: 'Daily = weekly ÷ 7. Weekly is the modelled week. Fortnightly = weekly × 2.',
      kind: 'estimate',
    },
  ]

  return {
    locationLabel: place || DEFAULT_LOCATION_LABEL,
    season,
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
      savingsAud: rate == null ? null : headline.weeklySavings,
      netEnergyValueAud,
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
 * The sign sits before the dollar symbol so negatives read as "-$73".
 */
export function formatAud(value: number): string {
  const abs = Math.abs(value)
  const rounded = abs >= 10 ? abs.toFixed(0) : abs.toFixed(2)
  return `${value < 0 ? '-' : ''}$${rounded}`
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
