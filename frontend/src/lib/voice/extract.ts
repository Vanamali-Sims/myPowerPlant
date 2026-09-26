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
  /**
   * Inferred rather than said, for a question the form is not even showing.
   * The value is still written; it just has no business appearing in a list
   * headed "Filled from what you said".
   */
  derived?: true
}

export type ExtractResult = {
  transcript: string
  slots: ExtractedSlot[]
}

/* Normalisation */

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

/* Primitives*/

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

/* Closed-list matching*/

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

/*Field rules*/

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
  'aircon', 'ac', 'conditioner', 'conditioning', 'hours', 'loads',
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
      // "no gas but yes we have a dryer": the negation belongs to the clause
      // before, and an explicit yes standing closer to the cue outranks it.
      const window = 4
      let negAt = -1
      let yesAt = -1
      for (let i = Math.max(0, at - window); i < at; i += 1) {
        if (NEGATORS.includes(tokens[i])) negAt = i
        if (tokens[i] === 'yes') yesAt = i
      }
      const value = negAt !== -1 && negAt > yesAt ? 'no' : 'yes'
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
      const hit = lastCue(text, table)
      return hit ? { ...hit, confidence } : null
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


/**
 * applianceRule
 * @param field - The profile field to fill
 * @param subject - Words that name the appliance, e.g. heating / heater
 * @param table - Specific systems, checked in order
 * @returns Rule
 *
 * `enumRule` only matches literal cues, which meant "we don't have heating"
 * filled nothing: the contraction normalises to "not", so the cue "no heating"
 * never appears. Negation and uncertainty are handled here the way `yesNoRule`
 * already handles them, and only when they sit near the appliance being named —
 * "not sure about the dryer" must not decide the heating.
 */

/**
 * lastCue
 * @param text - The whole normalised window
 * @param table - Values and the phrases that indicate them
 * @returns The value whose phrase was said LAST
 *
 * Table order used to decide, which meant the window's first mention won and a
 * correction could never land: saying "wood heater, no actually electric" kept
 * wood, because wood sat higher in the table. The rolling window holds the
 * whole utterance, so the later phrase is the one the speaker meant.
 */
function lastCue(
  text: string,
  table: { value: string; cues: string[] }[],
): { value: string; heard: string; confidence: SlotConfidence } | null {
  let best: { value: string; cue: string; at: number } | null = null
  for (const row of table) {
    for (const cue of row.cues) {
      const at = text.lastIndexOf(cue)
      if (at === -1) continue
      if (!best || at > best.at) best = { value: row.value, cue, at }
    }
  }
  if (!best) return null
  return { value: best.value, heard: best.cue, confidence: 'accept' }
}

function applianceRule(
  field: keyof ProfileData,
  subject: string[],
  table: { value: string; cues: string[] }[],
): Rule {
  return {
    field,
    run: (tokens, text) => {
      const at = firstCueIndex(tokens, subject)

      if (at !== -1) {
        const near = tokens.slice(Math.max(0, at - 4), at + 5).join(' ')
        if (/(not sure|no idea|dunno|not certain)/.test(near)) {
          return { value: 'not_sure', heard: 'not sure', confidence: 'accept' }
        }
        if (negatedBefore(tokens, at)) {
          return { value: 'none', heard: `no ${tokens[at]}`, confidence: 'accept' }
        }
      }

      return lastCue(text, table)
    },
  }
}


/* Dryer counts
   Two fields sharing one anchor, and the hardest thing in the whole extractor.
   The rolling window means every other answer is in the same string, so these
   must read a clause around the word "dryer" rather than the whole text —
   otherwise "washing machine 5 times a week" answers the dryer. */

/**
 * dryerClause
 * @param tokens - The normalised window
 * @returns Just the part of it that can be about the dryer
 *
 * Looking back a fixed number of tokens is not enough: "washing machine 5
 * times a week AND the dryer 2 times a week" reaches back over the conjunction
 * and answers the dryer with the washing machine's five. So the clause starts
 * after the last joining word before "dryer", when there is one.
 */
function dryerClause(tokens: string[]): string | null {
  const at = tokens.indexOf('dryer')
  if (at === -1) return null

  const joiners = ['and', 'then', 'also', 'plus', 'but']
  let start = Math.max(0, at - 6)
  for (let i = at - 1; i >= start; i -= 1) {
    if (joiners.includes(tokens[i])) {
      start = i + 1
      break
    }
  }
  // Fourteen tokens forward was not enough: "for the clothes dryer i use it 5
  // times during the week and 2 times on the weekend" puts "weekend" at 14, so
  // the weekend count fell off the end. Reach further, but stop at whatever
  // appliance is spoken about next.
  const others = [
    'washing', 'washer', 'dishwasher', 'tv', 'television',
    'fridge', 'fridges', 'refrigerator', 'refrigerators',
    'aircon', 'conditioner', 'conditioning', 'heating', 'heater', 'cooling',
  ]
  let end = Math.min(tokens.length, at + 24)
  for (let i = at + 1; i < end; i += 1) {
    if (others.includes(tokens[i])) {
      end = i
      break
    }
  }
  return tokens.slice(start, end).join(' ')
}

// The boxes are labelled "Week (Monday–Friday)" and "Weekend (Saturday–Sunday)",
// so people read the days back rather than saying "week". Those spellings have
// to be here or the commonest way of answering this question scores nothing.
// "weekly" sits ahead of the bare "week" branch: alternation takes the first
// branch that matches, and bare "week" would strand the "ly".
const MON_FRI = '(?:mon(?:day)?s?\\s*(?:to|through|thru|until|till)\\s*fri(?:day)?s?)'
const WEEKDAY = `(?:${MON_FRI}|week ?days?|weekdays?|midweek|weekly|week)`
const WEEKEND = '(?:week ?ends?|weekends?|saturdays?|sundays?|sats?\\b|suns?\\b)'

// The joining words people put between the count and the period. One missing
// preposition drops the whole answer silently — "2 at the weekend" read
// nothing, which looks like a broken weekend box rather than an unknown "at".
const PERIOD_JOINERS = 'a|per|on|in|at|over|during|throughout|each|every'

/**
 * periodCount
 * @param clause - Text around the word "dryer"
 * @param period - Which of the two period patterns to read
 * @returns The count and the words it came from, or null
 *
 * Accepts the number on either side of the period word. People say both
 * "three times a week" and "week three" — the second is common when the two
 * labelled boxes are visible and they are reading them off.
 */
function periodCount(clause: string, period: 'week' | 'weekend') {
  const word = period === 'weekend' ? WEEKEND : `${WEEKDAY}\\b(?!end)`
  // After-form first, since in "week 3 weekend 1" the before-form would read
  // "3 weekend" and hand the weekend the weekday's count. But it only applies
  // where the period word is a label rather than the tail of a phrase: in
  // "during the week 1 times on the weekend" the 1 belongs to what follows,
  // hence the lookbehind.
  const after = clause.match(
    new RegExp(`(?<!\\b(?:a|per|the|during|on|in|every)\\s)${word}\\s*(?:is|are|it is)?\\s*(\\d+)`),
  )
  if (after) return { value: after[1], heard: after[0] }
  const before = clause.match(
    new RegExp(`(\\d+)\\s*(?:times?|loads?|cycles?)?\\s*(?:${PERIOD_JOINERS})?\\s*(?:the\\s*)?${word}`),
  )
  if (before) return { value: before[1], heard: before[0] }
  // "never on the weekend" is an answer — zero — and was being dropped as a
  // missing one, which left the box empty and the user repeating themselves.
  // Up to three words of slack, because the refusal and the period are rarely
  // adjacent: "I do not *use the dryer* on weekends". Digits are excluded from
  // the slack, and this only runs once a real number has failed to match, so a
  // stated count always wins over an inferred zero.
  const none = clause.match(
    new RegExp(
      `(?:never|none|nothing|not|no)(?:\\s+[a-z]+){0,3}?\\s*(?:${PERIOD_JOINERS})?\\s*(?:the\\s*)?${word}`,
    ),
  )
  if (none) return { value: '0', heard: none[0] }
  return null
}

const COUNT = '(\\d+)\\s*(?:times?|uses?|loads?|cycles?)?'
const GAP = `\\s*(?:and\\s*)?(?:${PERIOD_JOINERS})?\\s*(?:the\\s*)?`

/**
 * bothCounts
 * @param clause - Text around the word "dryer"
 * @returns Both counts when the speaker read the two boxes in order
 *
 * The two boxes are on screen and labelled, so people answer them as one
 * sentence — "4 Monday to Friday, 2 Saturday Sunday". Read one box at a time
 * that is ambiguous: in "4 monday to friday 2 saturday sunday" the 2 sits
 * directly after the weekday label and looks exactly like "week 3 weekend 1",
 * where the number after the label *is* that label's answer. Matching the pair
 * in one go is the only way to tell those apart, so it runs first.
 */
function bothCounts(clause: string): { week: string; weekend: string } | null {
  const WD = `${WEEKDAY}\\b(?!end)`
  const shapes: [string, boolean][] = [
    [`${COUNT}${GAP}${WD}${GAP}${COUNT}${GAP}${WEEKEND}`, true],
    [`${WD}${GAP}${COUNT}${GAP}${WEEKEND}${GAP}${COUNT}`, true],
    [`${COUNT}${GAP}${WEEKEND}${GAP}${COUNT}${GAP}${WD}`, false],
    [`${WEEKEND}${GAP}${COUNT}${GAP}${WD}${GAP}${COUNT}`, false],
  ]
  for (const [source, weekdayFirst] of shapes) {
    const hit = clause.match(new RegExp(source))
    if (hit) {
      return weekdayFirst
        ? { week: hit[1], weekend: hit[2] }
        : { week: hit[2], weekend: hit[1] }
    }
  }
  return null
}

/** "Every day" answers both boxes at once: five weekdays, two weekend days. */
function everyDay(clause: string, period: 'week' | 'weekend') {
  if (!/\bevery ?days?\b|\bdaily\b/.test(clause)) return null
  return { value: period === 'week' ? '5' : '2', heard: 'every day' }
}

const RULES: Rule[] = [
  /* household */
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
  // "air conditioner" tokenises as two words, so anchoring on "aircon" alone
  // matched nothing at all for anyone who said it in full.
  countRule('airconHoursPerWeek', ['aircon', 'ac', 'conditioner', 'conditioning'], { min: 0, max: 168 }),
  yesNoRule('gas', ['gas']),
  yesNoRule('dryer', ['dryer', 'tumble']),
  yesNoRule('hotWater', ['hot water', 'hot water system', 'hot water service', 'hws']),
  {
    field: 'dryerWeek',
    run: (tokens) => {
      const clause = dryerClause(tokens)
      if (!clause) return null
      const boxes = bothCounts(clause)
      if (boxes) {
        return { value: boxes.week, heard: `${boxes.week} and ${boxes.weekend}`, confidence: 'accept' }
      }
      const hit = periodCount(clause, 'week')
      if (hit) return { value: hit.value, heard: hit.heard, confidence: 'accept' }
      // Flagged, not accepted: splitting "every day" across the two boxes is
      // our reading of it, not something the user said.
      const daily = everyDay(clause, 'week')
      if (daily) return { value: daily.value, heard: daily.heard, confidence: 'confirm' }
      // Both boxes are on screen and labelled, so a bare pair is a real answer
      // given in box order. Flagged, because the order is our assumption.
      const pair = clause.match(/\b(\d+)\b[^\d]{1,12}\b(\d+)\b/)
      if (pair && !/week/.test(clause)) {
        return { value: pair[1], heard: `${pair[1]} and ${pair[2]}`, confidence: 'confirm' }
      }
      return null
    },
  },
  {
    field: 'dryerWeekend',
    run: (tokens) => {
      const clause = dryerClause(tokens)
      if (!clause) return null
      const boxes = bothCounts(clause)
      if (boxes) {
        return { value: boxes.weekend, heard: `${boxes.week} and ${boxes.weekend}`, confidence: 'accept' }
      }
      const hit = periodCount(clause, 'weekend')
      if (hit) return { value: hit.value, heard: hit.heard, confidence: 'accept' }
      // Flagged, not accepted: splitting "every day" across the two boxes is
      // our reading of it, not something the user said.
      const daily = everyDay(clause, 'weekend')
      if (daily) return { value: daily.value, heard: daily.heard, confidence: 'confirm' }
      const pair = clause.match(/\b(\d+)\b[^\d]{1,12}\b(\d+)\b/)
      if (pair && !/week/.test(clause)) {
        return { value: pair[2], heard: `${pair[1]} and ${pair[2]}`, confidence: 'confirm' }
      }
      return null
    },
  },
  applianceRule(
    'heating',
    ['heating', 'heater', 'heaters', 'heat'],
    [
      // Gas stays qualified: a bare "gas" answers the gas connection question,
      // not this one.
      { value: 'gas', cues: ['gas heating', 'gas heater', 'ducted gas', 'gas ducted', 'gas central', 'gas fire'] },
      {
        value: 'electric',
        cues: [
          'reverse cycle',
          'heat pump',
          'split system',
          'electric heat',
          'electric heater',
          'hydronic',
          'panel heater',
          'column heater',
          // Every other cue was a compound, so the single commonest answer to
          // "how do you heat your home" matched nothing at all.
          'electricity',
          'electric',
        ],
      },
      { value: 'wood', cues: ['wood', 'fireplace', 'fire place', 'combustion', 'pot belly'] },
      { value: 'none', cues: ['no heating', 'no heater'] },
    ],
  ),
  applianceRule(
    'cooling',
    ['cooling', 'cooler', 'aircon', 'air'],
    [
      { value: 'evaporative', cues: ['evaporative', 'evap'] },
      {
        value: 'air_conditioning',
        cues: ['air conditioning', 'air con', 'aircon', 'reverse cycle', 'split system', 'ducted cooling'],
      },
      { value: 'fans', cues: ['fans only', 'just fans', 'ceiling fan', 'pedestal fan', 'fans', 'fan'] },
      { value: 'none', cues: ['no cooling', 'no air con'] },
    ],
  ),

  /* usage */
  {
    field: 'monthlyBill',
    run: (_tokens, text) => {
      const money = text.match(/(?:\$\s*)?(\d{2,5})\s*(?:dollars?)?/)
      if (!money) return null
      const amount = Number(money[1])
      if (amount < 20 || amount > 20000) return null

      // The period is at least as often said BEFORE the amount — "my monthly
      // bill is 300" — as after it. Reading only the tail flagged every one of
      // those as an unknown period.
      const after = text.match(/\d+\s*(?:dollars?)?\s*(?:a|per|every)\s*(month|quarter|fortnight|week)/)
      const phrase = text.match(/\b(monthly|month|quarterly|quarter|fortnightly|fortnight|weekly|week)\b/)
      const said = after?.[1] ?? phrase?.[1]
      const period = said
        ? said.replace(/ly$/, '').replace('quarter', 'quarter')
        : null

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
      // No period anywhere. Australian bills are usually quarterly, so guessing
      // monthly risks a silent 3x error through the whole dashboard.
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

  /* solar */
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
  {
    field: 'panelCount',
    run: (tokens, text) => {
      const hit = anchoredNumber(tokens, ['panel', 'panels'], ALL_ANCHORS, { min: 1, max: 100 })
      if (!hit) return null
      // A count is a whole number of things. "7.1 kilowatts of panels" is a
      // system size, and a numeric input renders 7.1 as 71 — a wrong answer
      // that looks like a typed one.
      if (!Number.isInteger(hit.value)) return null
      // Nor is a figure that carries a power unit a count of anything.
      const asText = String(hit.value).replace('.', '\\.')
      if (new RegExp(`${asText}\\s*(?:kilo\\s*watts?|kw|watts?|w)\\b`).test(text)) return null
      return { value: String(hit.value), heard: hit.heard, confidence: 'accept' }
    },
  },
  {
    field: 'panelWatts',
    run: (_tokens, text) => {
      // "watts" is transcribed as "what's" or "wats" often enough that not
      // handling it reads to the user as the field simply being broken.
      const WATT = "(?:watts?|watt's|what's|whats|wats|wat|w)"
      const direct = text.match(new RegExp(`(\\d{2,4})\\s*${WATT}\\b`))
      if (direct) {
        const each = Number(direct[1])
        if (each >= 80 && each <= 900) {
          return { value: direct[1], heard: direct[0], confidence: 'accept' }
        }
      }

      // Households know their array as "6.6 kilowatt", not as per-panel watts.
      const kw = text.match(/(\d+(?:\.\d+)?)\s*(?:kilo\s*watts?|kw)\b/)
      const panels = text.match(/(\d+)\s*panels?\b/)
      if (kw && panels) {
        const each = Math.round((Number(kw[1]) * 1000) / Number(panels[1]))
        if (each >= 100 && each <= 1000) {
          return {
            value: String(each),
            heard: `${kw[0]} over ${panels[1]} panels`,
            confidence: 'confirm',
          }
        }
      }

      // A bare three-digit number on this step cannot be the panel count,
      // which caps at 100, and nothing else here is numeric. Flagged, because
      // the user never actually said what it was.
      const bare = text.match(/\b(\d{3})\b/)
      if (bare) {
        const each = Number(bare[1])
        if (each >= 150 && each <= 800) {
          return { value: bare[1], heard: bare[1], confidence: 'confirm' }
        }
      }

      return null
    },
  },

  /* battery */
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
      // "old" was mandatory, so "the battery is about two years" read nothing.
      const said = text.match(/(\d{1,2})\s*(?:years?|yrs?)(?:\s*old)?/)
      if (said) return { value: said[1], heard: said[0], confidence: 'accept' }
      // "battery age 4", which is how people answer a labelled box.
      const labelled = text.match(/age\s*(?:is|of)?\s*(\d{1,2})\b/)
      if (labelled) return { value: labelled[1], heard: labelled[0], confidence: 'accept' }
      return null
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

  /* provider */
  {
    field: 'provider',
    run: (_tokens, text) => {
      const hit = matchFromList(text, energyProviders, PROVIDER_ALIASES)
      if (!hit) return null
      return { value: hit.value, heard: hit.heard, confidence: 'confirm', options: energyProviders }
    },
  },
]

/* Entry point */

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

  // "I don't use the dryer on weekends" negates the *using*, not the owning —
  // but the negation sits close enough to the cue to read as "no dryer", which
  // then hides the two count boxes entirely. A count above zero is proof the
  // appliance exists, so it overrules the negation. Flagged, because we are
  // overriding something the user actually said.
  const owned = slots.find((s) => s.field === 'dryer')
  if (owned?.value === 'no') {
    const used = slots.some(
      (s) => (s.field === 'dryerWeek' || s.field === 'dryerWeekend') && Number(s.value) > 0,
    )
    if (used) {
      owned.value = 'yes'
      owned.confidence = 'confirm'
    }
  }

  // No dryer means no dryer loads, which the user should not have to say twice.
  const dryer = slots.find((s) => s.field === 'dryer')
  if (dryer?.value === 'no') {
    for (const field of ['dryerWeek', 'dryerWeekend'] as const) {
      if (inStep.has(field) && !slots.some((s) => s.field === field)) {
        slots.push({ field, value: '0', heard: 'no dryer', confidence: 'accept', derived: true })
      }
    }
  }

  return { transcript, slots }
}
