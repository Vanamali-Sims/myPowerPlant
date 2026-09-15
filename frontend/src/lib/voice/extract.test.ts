/**
 * Extractor fixtures.
 *
 * Doubles as the measurement set for ENABLER-5.1. The reject cases matter more
 * than the accept cases: a matcher that never rejects will pass an accuracy bar
 * and still be unusable, because it fills fields with confident nonsense.
 */
import { describe, expect, it } from 'vitest'
import { extractSlots, normalise, wordsToDigits } from './extract'
import type { ProfileData, SetupStepId } from '../../types/profile'

function slotsFor(text: string, step: SetupStepId) {
  const map = new Map<string, string | number>()
  for (const slot of extractSlots(text, step).slots) map.set(slot.field as string, slot.value)
  return map
}

function value(text: string, step: SetupStepId, field: keyof ProfileData) {
  return slotsFor(text, step).get(field as string)
}

describe('wordsToDigits', () => {
  it('handles compound and multiplied numbers', () => {
    expect(wordsToDigits('twenty one')).toBe('21')
    expect(wordsToDigits('six hundred')).toBe('600')
    expect(wordsToDigits('four hundred watt')).toBe('400 watt')
  })

  it('handles the decimal people use for system size', () => {
    expect(normalise('six point six kilowatt')).toContain('6.6')
  })
})

describe('self-anchoring enums', () => {
  it('reads a plain yes', () => {
    expect(value('we have got gas', 'household', 'gas')).toBe('yes')
  })

  it('respects negation', () => {
    expect(value('no gas at all we are all electric', 'household', 'gas')).toBe('no')
  })

  it('treats uncertainty as a real answer, not a blank', () => {
    expect(value('no idea about the hot water it is a rental', 'household', 'hotWater')).toBe('not_sure')
  })

  it('fills two fields from one phrase', () => {
    const slots = slotsFor('we have reverse cycle', 'household')
    expect(slots.get('heating')).toBe('electric')
    expect(slots.get('cooling')).toBe('air_conditioning')
  })

  it('derives gas from a gas heater', () => {
    const slots = slotsFor('we have gas heating', 'household')
    expect(slots.get('heating')).toBe('gas')
    expect(slots.get('gas')).toBe('yes')
  })

  it('derives zero dryer loads when there is no dryer', () => {
    const slots = slotsFor('we do not have a dryer', 'household')
    expect(slots.get('dryer')).toBe('no')
    expect(slots.get('dryerWeek')).toBe('0')
    expect(slots.get('dryerWeekend')).toBe('0')
  })
})

describe('anchored numbers', () => {
  it('binds three bare numbers to the right nouns', () => {
    const slots = slotsFor('four of us in a three bedroom place with two fridges', 'household')
    expect(slots.get('people')).toBe('4')
    expect(slots.get('rooms')).toBe('3')
    expect(slots.get('refrigerators')).toBe('2')
  })

  it('understands living alone', () => {
    expect(value('just me', 'household', 'people')).toBe('1')
  })

  it('reads a couple as two', () => {
    expect(value('we have got a couple of fridges', 'household', 'refrigerators')).toBe('2')
  })

  it('rejects a quantity with no number', () => {
    expect(value('a few bedrooms', 'household', 'rooms')).toBeUndefined()
  })

  it('splits dryer use across week and weekend', () => {
    const slots = slotsFor('dryer twice during the week once on the weekend', 'household')
    expect(slots.get('dryerWeek')).toBe('2')
    expect(slots.get('dryerWeekend')).toBe('1')
  })

  it('refuses to split a single dryer number', () => {
    const slots = slotsFor('we use the dryer about three times', 'household')
    expect(slots.get('dryerWeek')).toBeUndefined()
    expect(slots.get('dryerWeekend')).toBeUndefined()
  })
})

describe('unit-anchored numbers', () => {
  it('takes a stated monthly bill at face value', () => {
    expect(value('about three hundred a month', 'usage', 'monthlyBill')).toBe('300')
  })

  it('converts a quarterly bill to monthly', () => {
    expect(value('five hundred and forty a quarter', 'usage', 'monthlyBill')).toBe('180')
  })

  it('flags a bare amount for confirmation rather than guessing the period', () => {
    const slot = extractSlots('around five hundred dollars', 'usage').slots
      .find((s) => s.field === 'monthlyBill')
    expect(slot?.confidence).toBe('confirm')
  })

  it('reads per-panel wattage', () => {
    expect(value('four hundred watt panels', 'solar', 'panelWatts')).toBe('400')
  })

  it('derives per-panel wattage from system size', () => {
    expect(value('it is a six point six kilowatt system with 18 panels', 'solar', 'panelWatts')).toBe('367')
  })

  it('reads a reserve preference', () => {
    expect(value('keep twenty percent in reserve', 'battery', 'reservePercent')).toBe('20')
  })
})

describe('closed lists', () => {
  it('matches a provider said as letters', () => {
    expect(value('we are with agl', 'provider', 'provider')).toBe('AGL Energy')
  })

  it('survives a plausible mis-transcription of AGL', () => {
    expect(value('we are with agile', 'provider', 'provider')).toBe('AGL Energy')
  })

  it('matches a two-word provider', () => {
    expect(value('we are with energy australia', 'provider', 'provider')).toBe('EnergyAustralia')
  })

  it('matches a battery by its common short name', () => {
    expect(value('we have a tesla powerwall', 'battery', 'batteryModel')).toBe('Tesla Powerwall 2')
  })

  it('matches a battery said as separated letters', () => {
    expect(value('it is a b y d', 'battery', 'batteryModel')).toBe('BYD Battery-Box Premium LVL')
  })

  it('REJECTS a real retailer that is not on our list', () => {
    expect(value('we are with momentum', 'provider', 'provider')).toBeUndefined()
  })

  it('always asks before accepting a list match', () => {
    const slot = extractSlots('we are with origin', 'provider').slots[0]
    expect(slot.confidence).toBe('confirm')
    expect(slot.options).toContain('Origin Energy')
  })
})

describe('postcode', () => {
  it('reads digits spoken singly', () => {
    expect(value('three one two one', 'household', 'postcode')).toBe('3121')
  })

  it('reads digits spoken in pairs', () => {
    expect(value('thirty one twenty one', 'household', 'postcode')).toBe('3121')
  })

  it('rejects an interstate postcode', () => {
    expect(value('two thousand', 'household', 'postcode')).toBeUndefined()
  })
})

describe('the real mode — one sentence, many answers', () => {
  it('fills most of the household step from a single utterance', () => {
    const slots = slotsFor(
      'there is four of us in 3121 three bedroom place we have got gas heating evaporative cooling and two fridges',
      'household',
    )
    expect(slots.get('people')).toBe('4')
    expect(slots.get('postcode')).toBe('3121')
    expect(slots.get('rooms')).toBe('3')
    expect(slots.get('gas')).toBe('yes')
    expect(slots.get('heating')).toBe('gas')
    expect(slots.get('cooling')).toBe('evaporative')
    expect(slots.get('refrigerators')).toBe('2')
    expect(slots.size).toBeGreaterThanOrEqual(7)
  })
})

describe('step scoping', () => {
  it('does not fill a field belonging to another step', () => {
    expect(value('we are with agl', 'household', 'provider')).toBeUndefined()
  })
})

describe('must reject', () => {
  it('fills nothing from hesitation', () => {
    expect(extractSlots('um we have got hang on', 'household').slots).toHaveLength(0)
  })

  it('fills nothing from an unanchored number', () => {
    expect(extractSlots('about two hundred', 'household').slots).toHaveLength(0)
  })
})
