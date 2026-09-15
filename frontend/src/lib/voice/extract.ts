/**
 * Turns a spoken sentence into setup-form answers.
 *
 * The design point: dictation into one field at a time is no faster than tapping.
 * The win voice has over a mouse is that ONE sentence can answer SEVERAL questions
 * — "four of us in a three bedroom place with two fridges" fills three. So the
 * extractor is scoped to the step the user is on (which narrows what a bare number
 * can mean) and returns every slot it can defend.
 *
 * Nothing here is a language model. Every field is a closed vocabulary, a number
 * bound to a noun, or a short list — so the rules are auditable and testable, and
 * a wrong answer can be explained rather than shrugged at.
 */
import { STEP_FIELDS } from '../../constants/setup'
import {
  batteryModels,
  energyProviders,
} from '../../data/profileOptions'
import type { ProfileData, SetupStepId } from '../../types/profile'

/** How sure we are. `confirm` still fills the field, but flags it for a look. */
export type SlotConfidence = 'accept' | 'confirm'

export type ExtractedSlot = {
  field: keyof ProfileData
  value: string | number
  /** The words this was taken from, shown back to the user. */
  heard: string
  confidence: SlotConfidence
  /** Present for closed-list fields, so a rejected match can offer the list. */
  options?: string[]
}

export type ExtractResult = {
  transcript: string
  slots: ExtractedSlot[]
}

/* ------------------------------------------------------------------ *
 * Normalisation
 * ------------------------------------------------------------------ */

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
}

const MULTIPLIERS: Record<string, number> = { hundred: 100, thousand: 1000 }

/**
 * wordsToDigits
 * @param text - Lower-cased transcript
 * @returns string - Same text with spoken numbers rewritten as digits
 *
 * Runs left to right accumulating consecutive number words, so "thirty one
 * twenty one" becomes "31 21" and "six hundred" becomes "600". Handles the
 * decimal in "six point six" because system sizes are always said that way.
 */
export function wordsToDigits(text: string): string {
  const tokens = text.split(/\s+/)
  const out: string[] = []
  let acc: number | null = null
  let pending: number | null = null

  const flush = () => {
    const total = (pending ?? 0) + (acc ?? 0)
    if (acc !== null || pending !== null) out.push(String(total))
    acc = null
    pending = null
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const raw = tokens[i].replace(/[^a-z0-9.]/g, '')

    if (raw === 'point' && acc !== null && NUMBER_WORDS[tokens[i + 1]] !== undefined) {
      const decimal = NUMBER_WORDS[tokens[i + 1]]
      out.push(`${(pending ?? 0) + acc}.${decimal}`)
      acc = null
      pending = null
      i += 1
      continue
    }

    if (NUMBER_WORDS[raw] !== undefined) {
      const value = NUMBER_WORDS[raw]
      // "twenty one" -> 21, but "four four" stays two separate numbers.
      if (acc !== null && acc % 10 === 0 && acc >= 20 && value < 10) acc += value
      else if (acc !== null) { flush(); acc = value }
      else acc = value
      continue
    }

    if (MULTIPLIERS[raw] !== undefined && acc !== null) {
      pending = (pending ?? 0) + acc * MULTIPLIERS[raw]
      acc = null
      continue
    }

    // "five hundred and forty" is one number, not two either side of a word.
    if (raw === 'and' && (acc !== null || pending !== null)) continue

    flush()
    out.push(tokens[i])
  }
  flush()
  return out.join(' ')
}

/** Lower-cases, expands contractions and rewrites spoken numbers. */
export function normalise(text: string): string {
  let t = ` ${text.toLowerCase()} `
  t = t
    .replace(/don't|dont|do not/g, ' not ')
    .replace(/doesn't|doesnt/g, ' not ')
    .replace(/haven't|havent|have not/g, ' not ')
    .replace(/we're|were /g, ' we are ')
    .replace(/it's|its /g, ' it is ')
    .replace(/a couple of|a couple/g, ' 2 ')
    .replace(/just me|only me|by myself/g, ' 1 people-anchor ')
    // Frequency words are how people actually count household chores.
    .replace(/\bonce\b/g, ' 1 time ')
    .replace(/\btwice\b/g, ' 2 times ')
    .replace(/\bthrice\b/g, ' 3 times ')
    .replace(/[,.!?;]/g, ' ')
    .replace(/\s+/g, ' ')
  return wordsToDigits(t).replace(/\s+/g, ' ').trim()
}

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

const NEGATORS = ['not', 'no', 'never', 'without', 'none']

/** True when a negation word sits within `window` tokens before `index`. */
function negatedBefore(tokens: string[], index: number, window = 4): boolean {
  for (let i = Math.max(0, index - window); i < index; i += 1) {
    if (NEGATORS.includes(tokens[i])) return true
  }
  return false
}

function firstCueIndex(tokens: string[], cues: string[]): number {
  const joined = tokens.join(' ')
  for (const cue of cues) {
    if (!joined.includes(cue)) continue
    const cueHead = cue.split(' ')[0]
    const at = tokens.indexOf(cueHead)
    if (at !== -1) return at
  }
  return -1
}

function isNumber(token: string): boolean {
  return /^\d+(\.\d+)?$/.test(token)
}

/**
 * anchoredNumber
 * @param tokens - Normalised token list
 * @param anchors - Nouns the number must belong to (e.g. ["bedroom","room"])
 * @param allAnchors - Every anchor in play this step, to detect crossings
 * @returns The number bound to this anchor, or null
 *
 * A number only counts if it sits within a short window of its own anchor AND no
 * competing anchor lies between them. Without that second rule, "four of us in a
 * three bedroom place" silently assigns 4 to rooms.
 */
function anchoredNumber(
  tokens: string[],
  anchors: string[],
  allAnchors: string[],
  opts: { min?: number; max?: number; window?: number } = {},
): { value: number; heard: string } | null {
  const { min = 0, max = 999999, window = 4 } = opts

  for (let i = 0; i < tokens.length; i += 1) {
    if (!anchors.includes(tokens[i])) continue

    for (let d = 1; d <= window; d += 1) {
      for (const j of [i - d, i + d]) {
        if (j < 0 || j >= tokens.length) continue
        if (!isNumber(tokens[j])) continue

        // Reject if another anchor sits between the number and this one.
        const [lo, hi] = j < i ? [j + 1, i] : [i + 1, j]
        let crossed = false
        for (let k = lo; k < hi; k += 1) {
          if (allAnchors.includes(tokens[k]) && !anchors.includes(tokens[k])) crossed = true
        }
        if (crossed) continue

        const value = Number(tokens[j])
        if (value < min || value > max) continue
        const heard = tokens.slice(Math.min(i, j), Math.max(i, j) + 1).join(' ')
        return { value, heard }
      }
    }
  }
  return null
}

/* ------------------------------------------------------------------ *
 * Closed-list matching
 * ------------------------------------------------------------------ */

const BATTERY_ALIASES: Record<string, string[]> = {
  'Tesla Powerwall 2': ['tesla', 'powerwall', 'power wall', 'pw2'],
  'Sungrow SBR HV': ['sungrow', 'sun grow', 'sbr'],
  'BYD Battery-Box Premium LVL': ['byd', 'b y d', 'battery box'],
  'AlphaESS SMILE5': ['alphaess', 'alpha ess', 'smile5', 'smile 5'],
  'Goodwe Lynx Home F': ['goodwe', 'good we', 'lynx'],
  SonnenBatterie: ['sonnen', 'sonnenbatterie'],
}

const PROVIDER_ALIASES: Record<string, string[]> = {
  'AGL Energy': ['agl', 'a g l', 'agile'],
  'Origin Energy': ['origin'],
  EnergyAustralia: ['energy australia', 'energyaustralia'],
  'Red Energy': ['red energy', 'red'],
  'Diamond Energy': ['diamond'],
  'Simply Energy': ['simply'],
  'Alinta Energy': ['alinta'],
  'GloBird Energy': ['globird', 'glo bird'],
}

/**
 * matchFromList
 * @returns The option matched, or null when nothing clears the bar
 *
 * Alias hit first, then a loose containment check. Deliberately conservative:
 * a retailer the user names that is not on our list (Momentum, Amber) must come
 * back null so the UI shows the list, rather than snapping to the nearest string.
 */
function matchFromList(
  text: string,
  options: string[],
  aliases: Record<string, string[]>,
): { value: string; heard: string } | null {
  for (const option of options) {
    for (const alias of aliases[option] ?? []) {
      if (text.includes(alias)) return { value: option, heard: alias }
    }
  }
  for (const option of options) {
    const head = option.toLowerCase().split(/[\s-]/)[0]
    if (head.length >= 4 && text.includes(head)) return { value: option, heard: head }
  }
  return null
}

/* ------------------------------------------------------------------ *
 * Field rules
 * ------------------------------------------------------------------ */

type Rule = {
  field: keyof ProfileData
  run: (tokens: string[], text: string) => Omit<ExtractedSlot, 'field'> | null
}

/** Every counting noun in play, so anchoredNumber can spot a crossing. */
const ALL_ANCHORS = [
  'people-anchor', 'people', 'person', 'adults', 'kids', 'children', 'us',
  'bedroom', 'bedrooms', 'room', 'rooms', 'bed',
  'fridge', 'fridges', 'refrigerator', 'refrigerators', 'freezer',
  'panel', 'panels', 'battery', 'batteries', 'powerwall',
  'dryer', 'tv', 'television', 'washing', 'washer', 'dishwasher',
  'aircon', 'ac', 'hours', 'loads',
]

function yesNoRule(
  field: keyof ProfileData,
  cues: string[],
  allowNotSure = true,
): Rule {
  return {
    field,
    run: (tokens) => {
      const at = firstCueIndex(tokens, cues)
      if (at === -1) return null
      const joined = tokens.join(' ')
      if (allowNotSure && /(not sure|no idea|dunno|don t know|not certain)/.test(joined)) {
        return { value: 'not_sure', heard: 'not sure', confidence: 'accept' }
      }
      const value = negatedBefore(tokens, at) ? 'no' : 'yes'
      return { value, heard: tokens[at], confidence: 'accept' }
    },
  }
}

function enumRule(
  field: keyof ProfileData,
  table: { value: string; cues: string[] }[],
  confidence: SlotConfidence = 'accept',
): Rule {
  return {
    field,
    run: (_tokens, text) => {
      for (const row of table) {
        for (const cue of row.cues) {
          if (text.includes(cue)) {
            return { value: row.value, heard: cue, confidence }
          }
        }
      }
      return null
    },
  }
}

function countRule(
  field: keyof ProfileData,
  anchors: string[],
  opts: { min?: number; max?: number } = {},
): Rule {
  return {
    field,
    run: (tokens) => {
      const hit = anchoredNumber(tokens, anchors, ALL_ANCHORS, opts)
      if (!hit) return null
      return { value: String(hit.value), heard: hit.heard, confidence: 'accept' }
    },
  }
}

const RULES: Rule[] = [
  /* -- household ------------------------------------------------- */
  {
    field: 'postcode',
    // A postcode is dictated in as many shapes as there are speakers — "3121",
    // "three one two one", "thirty one twenty one" — so join runs of adjacent
    // numbers and let the VIC regex decide. The regex is the whole safety net:
    // it rejects interstate and nonsense without us having to recognise them.
    run: (tokens) => {
      for (let i = 0; i < tokens.length; i += 1) {
        if (!isNumber(tokens[i])) continue
        let joined = ''
        for (let j = i; j < tokens.length && isNumber(tokens[j]); j += 1) {
          joined += tokens[j]
          if (joined.length > 4) break
          if (/^[38]\d{3}$/.test(joined)) {
            return {
              value: joined,
              heard: tokens.slice(i, j + 1).join(' '),
              confidence: 'accept',
            }
          }
        }
      }
      return null
    },
  },
  countRule('people', ['people-anchor', 'people', 'person', 'us', 'adults'], { min: 1, max: 12 }),
  countRule('rooms', ['bedroom', 'bedrooms', 'room', 'rooms', 'bed'], { min: 1, max: 20 }),
  countRule('refrigerators', ['fridge', 'fridges', 'refrigerator', 'refrigerators', 'freezer'], { min: 0, max: 8 }),
  countRule('tvHoursPerWeek', ['tv', 'television'], { min: 0, max: 168 }),
  countRule('washerCyclesPerWeek', ['washing', 'washer', 'loads'], { min: 0, max: 40 }),
  countRule('dishwasherCyclesPerWeek', ['dishwasher'], { min: 0, max: 40 }),
  countRule('airconHoursPerWeek', ['aircon', 'ac'], { min: 0, max: 168 }),
  yesNoRule('gas', ['gas']),
  yesNoRule('dryer', ['dryer', 'tumble']),
  yesNoRule('hotWater', ['hot water']),
  {
    field: 'dryerWeek',
    run: (tokens) => {
      const text = tokens.join(' ')
      if (!text.includes('dryer')) return null
      // Both dryer fields share one anchor; without a weekday/weekend word we
      // cannot split a single number across them, so we fill neither.
      const m = text.match(/(\d+)\s*(?:times?\s*)?(?:a|per|during the)?\s*week(?!end)/)
      if (!m) return null
      return { value: m[1], heard: m[0], confidence: 'accept' }
    },
  },
  {
    field: 'dryerWeekend',
    run: (tokens) => {
      const text = tokens.join(' ')
      if (!text.includes('dryer')) return null
      const m = text.match(/(\d+)\s*(?:times?\s*)?(?:a|per|on the)?\s*weekend/)
      if (!m) return null
      return { value: m[1], heard: m[0], confidence: 'accept' }
    },
  },
  enumRule('heating', [
    { value: 'electric', cues: ['reverse cycle', 'heat pump', 'split system', 'electric heat'] },
    { value: 'gas', cues: ['gas heating', 'gas heater', 'ducted gas', 'gas ducted'] },
    { value: 'wood', cues: ['wood', 'fireplace', 'fire place'] },
    { value: 'none', cues: ['no heating'] },
  ]),
  enumRule('cooling', [
    { value: 'evaporative', cues: ['evaporative', 'evap'] },
    { value: 'air_conditioning', cues: ['air conditioning', 'air con', 'aircon', 'reverse cycle', 'split system'] },
    { value: 'fans', cues: ['fans only', 'just fans', 'fans'] },
    { value: 'none', cues: ['no cooling'] },
  ]),

  /* -- usage ----------------------------------------------------- */
  {
    field: 'monthlyBill',
    run: (_tokens, text) => {
      const m = text.match(/(\d+(?:\.\d+)?)\s*(?:dollars?)?\s*(?:a|per|every)?\s*(month|quarter|fortnight|week)?/)
      const money = text.match(/(?:\$\s*)?(\d{2,5})\s*(?:dollars?)?/)
      if (!money) return null
      const amount = Number(money[1])
      if (amount < 20 || amount > 20000) return null
      const period = m?.[2]
      if (period === 'quarter') {
        return { value: String(Math.round(amount / 3)), heard: `${amount} a quarter`, confidence: 'accept' }
      }
      if (period === 'fortnight') {
        return { value: String(Math.round((amount * 26) / 12)), heard: `${amount} a fortnight`, confidence: 'accept' }
      }
      if (period === 'week') {
        return { value: String(Math.round((amount * 52) / 12)), heard: `${amount} a week`, confidence: 'accept' }
      }
      if (period === 'month') {
        return { value: String(amount), heard: `${amount} a month`, confidence: 'accept' }
      }
      // No period stated. Australian bills are usually quarterly, so guessing
      // monthly risks a silent 3x error through the whole dashboard — flag it.
      return { value: String(amount), heard: String(amount), confidence: 'confirm' }
    },
  },
  enumRule('peakPeriod', [
    { value: 'morning', cues: ['morning', 'before school', 'before work'] },
    { value: 'afternoon', cues: ['afternoon'] },
    { value: 'evening', cues: ['evening', 'evenings', 'after work', 'dinner'] },
    { value: 'night', cues: ['night', 'overnight', 'late'] },
  ]),
  enumRule('usageLevel', [
    { value: 'very_high', cues: ['very high', 'huge', 'massive'] },
    { value: 'low', cues: ['careful', 'frugal', 'not much', 'low'] },
    { value: 'high', cues: ['a lot', 'heavy', 'high', 'smash'] },
    { value: 'moderate', cues: ['moderate', 'average', 'typical', 'normal'] },
  ], 'confirm'),
  yesNoRule('wfh', ['work from home', 'working from home', 'study from home', 'wfh']),

  /* -- solar ----------------------------------------------------- */
  yesNoRule('hasSolar', ['solar'], false),
  enumRule('solarDirection', [
    { value: 'NE', cues: ['north east', 'northeast'] },
    { value: 'NW', cues: ['north west', 'northwest'] },
    { value: 'SE', cues: ['south east', 'southeast'] },
    { value: 'SW', cues: ['south west', 'southwest'] },
    { value: 'N', cues: ['north'] },
    { value: 'S', cues: ['south'] },
    { value: 'E', cues: ['east'] },
    { value: 'W', cues: ['west'] },
  ]),
  countRule('panelCount', ['panel', 'panels'], { min: 1, max: 100 }),
  {
    field: 'panelWatts',
    run: (_tokens, text) => {
      const watts = text.match(/(\d{3,4})\s*(?:watt|watts|w)\b/)
      if (watts) return { value: watts[1], heard: watts[0], confidence: 'accept' }
      // Households know their array as "6.6 kilowatt", not as per-panel watts.
      const kw = text.match(/(\d+(?:\.\d+)?)\s*(?:kilowatt|kw)/)
      const panels = text.match(/(\d+)\s*panels?/)
      if (kw && panels) {
        const each = Math.round((Number(kw[1]) * 1000) / Number(panels[1]))
        if (each >= 100 && each <= 1000) {
          return { value: String(each), heard: `${kw[0]} over ${panels[1]} panels`, confidence: 'confirm' }
        }
      }
      return null
    },
  },

  /* -- battery --------------------------------------------------- */
  countRule('batteryUnits', ['battery', 'batteries', 'powerwall'], { min: 1, max: 6 }),
  {
    field: 'reservePercent',
    run: (_tokens, text) => {
      const m = text.match(/(\d{1,3})\s*(?:%|percent)/)
      if (!m) return null
      const value = Number(m[1])
      if (value < 0 || value > 100) return null
      return { value: m[1], heard: m[0], confidence: 'accept' }
    },
  },
  {
    field: 'batteryAge',
    run: (_tokens, text) => {
      const m = text.match(/(\d{1,2})\s*(?:years?|yrs?)\s*old/)
      if (!m) return null
      return { value: m[1], heard: m[0], confidence: 'accept' }
    },
  },
  {
    field: 'batteryModel',
    run: (_tokens, text) => {
      const hit = matchFromList(text, batteryModels, BATTERY_ALIASES)
      if (!hit) return null
      return { value: hit.value, heard: hit.heard, confidence: 'confirm', options: batteryModels }
    },
  },

  /* -- provider -------------------------------------------------- */
  {
    field: 'provider',
    run: (_tokens, text) => {
      const hit = matchFromList(text, energyProviders, PROVIDER_ALIASES)
      if (!hit) return null
      return { value: hit.value, heard: hit.heard, confidence: 'confirm', options: energyProviders }
    },
  },
]

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

/**
 * extractSlots
 * @param transcript - What the engine heard
 * @param stepId - The step the user is on, which scopes the candidate fields
 * @returns ExtractResult - Every slot we can defend, with the words behind it
 *
 * Scoping to the step is what makes a bare number tractable: on the household
 * step "three" is far more likely to be rooms or people than a battery count,
 * and the battery rules are not even consulted.
 */
export function extractSlots(transcript: string, stepId: SetupStepId): ExtractResult {
  const text = normalise(transcript)
  const tokens = text.split(' ')
  const inStep = new Set<string>(STEP_FIELDS[stepId] as string[])
  const slots: ExtractedSlot[] = []

  for (const rule of RULES) {
    if (!inStep.has(rule.field as string)) continue
    const hit = rule.run(tokens, text)
    if (!hit) continue
    slots.push({ field: rule.field, ...hit })
  }

  // "We've got gas heating" answers the gas question too, even though the
  // speaker was describing the heater.
  if (inStep.has('gas') && !slots.some((s) => s.field === 'gas')) {
    const heating = slots.find((s) => s.field === 'heating')
    if (heating?.value === 'gas') {
      slots.push({ field: 'gas', value: 'yes', heard: 'gas heating', confidence: 'accept' })
    }
  }

  // No dryer means no dryer loads, which the user should not have to say twice.
  const dryer = slots.find((s) => s.field === 'dryer')
  if (dryer?.value === 'no') {
    for (const field of ['dryerWeek', 'dryerWeekend'] as const) {
      if (inStep.has(field) && !slots.some((s) => s.field === field)) {
        slots.push({ field, value: '0', heard: 'no dryer', confidence: 'accept' })
      }
    }
  }

  return { transcript, slots }
}
