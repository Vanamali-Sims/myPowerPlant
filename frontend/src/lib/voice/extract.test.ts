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

describe('chunked speech — why the rolling window exists', () => {
  /* The recogniser splits fast speech at arbitrary points. These two tests are
     the bug report: alone, a fragment loses the binding; joined, it survives.
     useVoiceInput extracts over a 9s window of finals for exactly this reason. */

  it('gets an answer WRONG when a phrase is split across two finals', () => {
    // "there is 4" has a number with no anchor, so it is correctly dropped.
    const first = slotsFor('there is 4', 'household')
    expect(first.get('people')).toBeUndefined()

    // The orphaned remainder is the real damage: "us" and "3" are now adjacent
    // with nothing between them, so the household size binds to the bedroom
    // count. The user said four people and the form says three.
    const second = slotsFor('of us in a 3 bedroom place', 'household')
    expect(second.get('people')).toBe('3')
    expect(second.get('rooms')).toBe('3')
  })

  it('recovers it when the finals are joined before extracting', () => {
    const joined = slotsFor('there is 4 of us in a 3 bedroom place', 'household')
    expect(joined.get('people')).toBe('4')
    expect(joined.get('rooms')).toBe('3')
  })

  it('re-extracting a growing window is stable, so nothing double-fires', () => {
    const partial = slotsFor('we have got gas', 'household')
    const grown = slotsFor('we have got gas and 2 fridges', 'household')
    expect(partial.get('gas')).toBe('yes')
    expect(grown.get('gas')).toBe('yes')
    expect(grown.get('refrigerators')).toBe('2')
  })
})

describe('solar: panel count vs panel wattage', () => {
  it('does not turn a system size into a panel count', () => {
    // "7.1 kilowatts of panels" bound 7.1 to panelCount, and a numeric input
    // renders that as 71. A count is a whole number of things.
    expect(value('seven point one kilowatts of panels', 'solar', 'panelCount')).toBeUndefined()
  })

  it('still reads a real panel count', () => {
    expect(value('i have 18 panels', 'solar', 'panelCount')).toBe('18')
  })

  it('reads wattage when the recogniser mangles "watts"', () => {
    // "watts" comes back as "what's" often enough to be worth handling.
    expect(value('the panels are 400 whats each', 'solar', 'panelWatts')).toBe('400')
    expect(value("each panel is 370 what's", 'solar', 'panelWatts')).toBe('370')
  })

  it('reads a plain wattage', () => {
    expect(value('18 panels at 400 watts', 'solar', 'panelWatts')).toBe('400')
    expect(value('each panel is 370 w', 'solar', 'panelWatts')).toBe('370')
  })

  it('derives per-panel wattage from a system size and a count', () => {
    expect(value('six point six kilowatt system with 18 panels', 'solar', 'panelWatts')).toBe('367')
  })

  it('takes a bare three-digit number as wattage, but flags it', () => {
    // On this step it cannot be the panel count, which caps at 100.
    const slot = extractSlots('about 370', 'solar').slots.find((s) => s.field === 'panelWatts')
    expect(slot?.value).toBe('370')
    expect(slot?.confidence).toBe('confirm')
  })
})

describe('heating and cooling: the ways people actually say it', () => {
  it('understands not having heating, however it is phrased', () => {
    expect(value('we do not have heating', 'household', 'heating')).toBe('none')
    expect(value('no heater in this place', 'household', 'heating')).toBe('none')
    expect(value('no heating', 'household', 'heating')).toBe('none')
  })

  it('understands not being sure', () => {
    expect(value('not sure what the heating is', 'household', 'heating')).toBe('not_sure')
  })

  it('reads the common systems', () => {
    expect(value('we have got an electric heater', 'household', 'heating')).toBe('electric')
    expect(value('gas ducted heating', 'household', 'heating')).toBe('gas')
    expect(value('we heat with a wood fire', 'household', 'heating')).toBe('wood')
    expect(value('hydronic heating', 'household', 'heating')).toBe('electric')
  })

  it('does not take a gas connection as a gas heater', () => {
    // "we have gas" answers the gas question, not the heating one.
    expect(value('we have gas', 'household', 'heating')).toBeUndefined()
  })

  it('handles cooling the same way', () => {
    expect(value('we do not have cooling', 'household', 'cooling')).toBe('none')
    expect(value('just a ceiling fan', 'household', 'cooling')).toBe('fans')
    expect(value('evaporative', 'household', 'cooling')).toBe('evaporative')
    expect(value('ducted air conditioning', 'household', 'cooling')).toBe('air_conditioning')
  })

  it('still fills both from one phrase', () => {
    const slots = slotsFor('we have reverse cycle', 'household')
    expect(slots.get('heating')).toBe('electric')
    expect(slots.get('cooling')).toBe('air_conditioning')
  })
})

describe('dryer: weekday and weekend counts', () => {
  it('reads the plain phrasing', () => {
    const s = slotsFor('i use the dryer 3 times a week and once on the weekend', 'household')
    expect(s.get('dryerWeek')).toBe('3')
    expect(s.get('dryerWeekend')).toBe('1')
  })

  it('reads the number after the period word', () => {
    const s = slotsFor('for the dryer week 3 weekend 1', 'household')
    expect(s.get('dryerWeek')).toBe('3')
    expect(s.get('dryerWeekend')).toBe('1')
  })

  it('understands weekdays and weekends', () => {
    const s = slotsFor('dryer 4 weekdays and 2 weekends', 'household')
    expect(s.get('dryerWeek')).toBe('4')
    expect(s.get('dryerWeekend')).toBe('2')
  })

  it('takes two bare numbers in box order, and flags them', () => {
    // Both boxes are on screen and labelled, so "3 and 1" is a real answer.
    const slots = extractSlots('the dryer 3 and 1', 'household').slots
    const week = slots.find((s) => s.field === 'dryerWeek')
    expect(week?.value).toBe('3')
    expect(week?.confidence).toBe('confirm')
  })

  it('does not steal another appliance\'s number', () => {
    // The rolling window means every other answer is in the same text.
    const s = slotsFor(
      'washing machine 5 times a week and the dryer 2 times a week',
      'household',
    )
    expect(s.get('dryerWeek')).toBe('2')
    expect(s.get('washerCyclesPerWeek')).toBe('5')
  })

  it('still refuses to split a single unlabelled number', () => {
    const s = slotsFor('we use the dryer about three times', 'household')
    expect(s.get('dryerWeek')).toBeUndefined()
    expect(s.get('dryerWeekend')).toBeUndefined()
  })

  // The reported "weekend never fills" bug. Every one of these was heard
  // correctly by the recogniser and then dropped by the matcher, because the
  // joining word between the count and the period was one we did not list.
  // The weekday count landed each time, which is what made it look like the
  // weekend box itself was broken.
  it('accepts the joining words people actually use', () => {
    const cases: [string, string, string][] = [
      ['we use the dryer 5 times in the week and 2 at the weekend', '5', '2'],
      ['dryer 5 times during the week and 2 over the weekend', '5', '2'],
      ['dryer 5 times during the week and 2 every weekend', '5', '2'],
      ['dryer 3 times throughout the week and 1 throughout the weekend', '3', '1'],
      ['the dryer runs 5 times weekly and 2 times each weekend', '5', '2'],
    ]
    for (const [said, week, weekend] of cases) {
      const s = slotsFor(said, 'household')
      expect([said, s.get('dryerWeek')]).toEqual([said, week])
      expect([said, s.get('dryerWeekend')]).toEqual([said, weekend])
    }
  })

  // The boxes are labelled with the days, so people read the days back.
  it('reads the periods the way the labels name them', () => {
    const cases: [string, string, string][] = [
      ['dryer 3 times monday to friday and 1 on saturday and sunday', '3', '1'],
      ['i use the dryer 3 times mon to fri and twice sat sun', '3', '2'],
      ['dryer 4 monday through friday 2 saturday sunday', '4', '2'],
    ]
    for (const [said, week, weekend] of cases) {
      const s = slotsFor(said, 'household')
      expect([said, s.get('dryerWeek')]).toEqual([said, week])
      expect([said, s.get('dryerWeekend')]).toEqual([said, weekend])
    }
  })

  it('reads a refusal as zero rather than as no answer', () => {
    const cases: [string, string, string][] = [
      ['i use the dryer 4 times during the week but never on the weekend', '4', '0'],
      ['dryer 3 times a week and none on the weekend', '3', '0'],
    ]
    for (const [said, week, weekend] of cases) {
      const s = slotsFor(said, 'household')
      expect([said, s.get('dryerWeek')]).toEqual([said, week])
      expect([said, s.get('dryerWeekend')]).toEqual([said, weekend])
    }
  })

  // The reported "dryer says No when I said yes" bug. The negation is about
  // using the dryer, not owning one, but it sits close enough to the cue to
  // read as ownership — and a No hides both count boxes, so the user could
  // never correct it by speaking.
  it('does not let a usage negation turn the dryer off', () => {
    const s = slotsFor(
      'i do not use the dryer on weekends but 5 times during the week',
      'household',
    )
    expect(s.get('dryer')).toBe('yes')
    expect(s.get('dryerWeek')).toBe('5')
    expect(s.get('dryerWeekend')).toBe('0')
  })

  it('still hears a genuine no', () => {
    const s = slotsFor('no we do not have a dryer', 'household')
    expect(s.get('dryer')).toBe('no')
    expect(s.get('dryerWeek')).toBe('0')
  })

  it('splits "every day" across the two boxes, flagged', () => {
    const slots = extractSlots('i use the dryer every day', 'household').slots
    const week = slots.find((s) => s.field === 'dryerWeek')
    const weekend = slots.find((s) => s.field === 'dryerWeekend')
    expect(week?.value).toBe('5')
    expect(weekend?.value).toBe('2')
    // Our reading of it, not something they said — so it asks to be checked.
    expect(week?.confidence).toBe('confirm')
  })

  it('keeps each count with its own period when the weekend is said first', () => {
    // Order is not the cue — the period word is. Reading positionally here
    // would put the weekend figure in the weekday box.
    const s = slotsFor('i use the dryer 5 times at the weekend and 3 times during the week', 'household')
    expect(s.get('dryerWeek')).toBe('3')
    expect(s.get('dryerWeekend')).toBe('5')
  })
})

describe('the reports from testing', () => {
  it('reads air conditioner hours however it is named', () => {
    // "air conditioner" is two tokens, so anchoring on "aircon" alone found
    // nothing at all.
    expect(value('the air conditioner is used 20 hours a week', 'household', 'airconHoursPerWeek')).toBe('20')
    expect(value('aircon about 12 hours a week', 'household', 'airconHoursPerWeek')).toBe('12')
    expect(value('air conditioning 8 hours', 'household', 'airconHoursPerWeek')).toBe('8')
  })

  it('reads hot water however it is named', () => {
    expect(value('we have hot water', 'household', 'hotWater')).toBe('yes')
    expect(value('gas hot water service', 'household', 'hotWater')).toBe('yes')
    expect(value('there is a hot water system', 'household', 'hotWater')).toBe('yes')
  })

  it('reaches the weekend at the end of a long dryer sentence', () => {
    const s = slotsFor(
      'for the clothes dryer i use it 5 times during the week and 2 times on the weekend',
      'household',
    )
    expect(s.get('dryerWeek')).toBe('5')
    expect(s.get('dryerWeekend')).toBe('2')
  })

  it('reads battery age without the word "old"', () => {
    expect(value('the battery is 3 years old', 'battery', 'batteryAge')).toBe('3')
    expect(value('the battery is about 2 years', 'battery', 'batteryAge')).toBe('2')
    expect(value('battery age 4', 'battery', 'batteryAge')).toBe('4')
  })

  it('takes the period from the phrase, not just from after the number', () => {
    // "my monthly bill is 300" says monthly up front, so it should not be
    // flagged as an unknown period.
    const slot = extractSlots('my monthly bill is 300', 'usage').slots
      .find((s) => s.field === 'monthlyBill')
    expect(slot?.value).toBe('300')
    expect(slot?.confidence).toBe('accept')
    expect(value('my quarterly bill is 540', 'usage', 'monthlyBill')).toBe('180')
  })
})

describe('corrections and plain words', () => {
  it('reads plain "electric"', () => {
    // Every electric cue was a compound — "electric heat", "heat pump" — so
    // simply saying "electric" matched nothing.
    expect(value('electric', 'household', 'heating')).toBe('electric')
    expect(value('we heat with electricity', 'household', 'heating')).toBe('electric')
  })

  it('lets a later answer correct an earlier one', () => {
    // The rolling window holds both, so the one said LAST has to win.
    expect(value('we have a wood heater no actually electric', 'household', 'heating')).toBe('electric')
    expect(value('electric heating sorry i mean wood', 'household', 'heating')).toBe('wood')
    // Not "evaporative no air conditioning" — that genuinely means none, and
    // reading it as a correction would be the wrong call.
    expect(value('evaporative sorry i mean air conditioning', 'household', 'cooling')).toBe(
      'air_conditioning',
    )
  })

  it('an explicit yes beats a negation further away', () => {
    expect(value('no gas but yes we have a dryer', 'household', 'dryer')).toBe('yes')
    expect(value('i do not have a dryer', 'household', 'dryer')).toBe('no')
  })
})
