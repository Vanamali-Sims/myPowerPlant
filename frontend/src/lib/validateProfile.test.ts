/**
 * Unit tests for the browser-side profile validation rules.
 *
 * Case IDs (VAL-xx) map to testing/02-test-cases/validation-test-cases.md.
 * Technique: equivalence partitioning + boundary value analysis, as set out in
 * testing/01-test-plan.md section 3.
 *
 * These rules are a usability feature, not a security control - the equivalent
 * server-side rules in backend/app/models.py are authoritative and are covered
 * by backend/tests/test_input_validation.py.
 */
import { describe, expect, it } from 'vitest'

import { BASELINE_PROFILE } from '../data/baselines'
import { emptyProfile, type ProfileData } from '../types/profile'
import { hasErrors, isVictorianPostcode, validateStep } from './validateProfile'

/** A complete, valid profile. Every test mutates one field away from valid. */
function validProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    ...emptyProfile(),
    ...BASELINE_PROFILE,
    fieldSources: {},
    lastUpdated: null,
    ...overrides,
  }
}

describe('baseline profile', () => {
  it.each(['household', 'usage', 'solar', 'battery', 'provider'] as const)(
    'passes validation for the %s step',
    (step) => {
      expect(validateStep(step, validProfile())).toEqual({})
    },
  )
})

// -------------------------------------------------------------------------
// VAL-01 .. VAL-06 - postcode equivalence classes
// -------------------------------------------------------------------------

describe('VAL-01..06 postcode equivalence classes', () => {
  const cases: [string, string, boolean, string][] = [
    ['VAL-01', '3000', true, 'valid 3xxx Victorian postcode'],
    ['VAL-02', '8007', true, 'valid 8xxx Victorian postcode'],
    ['VAL-03', '2000', false, 'NSW postcode - product is Victoria-only'],
    ['VAL-04', '300', false, 'too short'],
    ['VAL-05', 'abcd', false, 'non-numeric'],
    ['VAL-06', '', false, 'empty - required field'],
  ]

  it.each(cases)('%s %s -> accepted=%s (%s)', (_id, postcode, accepted) => {
    expect(isVictorianPostcode(postcode)).toBe(accepted)

    const errors = validateStep('household', validProfile({ postcode }))
    expect('postcode' in errors).toBe(!accepted)
  })

  it('VAL-03 rejects every non-Victorian state prefix', () => {
    for (const prefix of ['1', '2', '4', '5', '6', '7', '9', '0']) {
      expect(isVictorianPostcode(`${prefix}000`)).toBe(false)
    }
  })

  it('VAL-04 rejects a 5-digit postcode', () => {
    expect(isVictorianPostcode('30000')).toBe(false)
  })

  it('accepts a postcode with surrounding whitespace', () => {
    expect(isVictorianPostcode('  3000  ')).toBe(true)
  })
})

// -------------------------------------------------------------------------
// VAL-07 .. VAL-14 - boundary value analysis on bounded numerics
// -------------------------------------------------------------------------

type BoundarySpec = {
  id: string
  field: keyof ProfileData
  step: 'usage' | 'solar' | 'battery' | 'household'
  min: number
  max: number
  /** Extra fields needed for the rule to be reachable. */
  context?: Partial<ProfileData>
}

const boundaries: BoundarySpec[] = [
  { id: 'VAL-07', field: 'monthlyBill', step: 'usage', min: 1, max: 5000 },
  { id: 'VAL-08', field: 'monthlyKwh', step: 'usage', min: 1, max: 5000 },
  {
    id: 'VAL-09',
    field: 'panelCount',
    step: 'solar',
    min: 1,
    max: 80,
    context: { hasSolar: 'yes', solarDirection: 'N', panelWatts: '400' },
  },
  {
    id: 'VAL-10',
    field: 'panelWatts',
    step: 'solar',
    min: 50,
    max: 500,
    context: { hasSolar: 'yes', solarDirection: 'N', panelCount: '12' },
  },
  { id: 'VAL-11', field: 'reservePercent', step: 'battery', min: 0, max: 80 },
  { id: 'VAL-12', field: 'batteryAge', step: 'battery', min: 0, max: 40 },
]

describe.each(boundaries)(
  '$id boundary value analysis: $field ($min..$max)',
  ({ field, step, min, max, context }) => {
    function errorsFor(value: string) {
      return validateStep(step, validProfile({ ...context, [field]: value }))
    }

    it(`rejects min-1 (${min - 1})`, () => {
      expect(errorsFor(String(min - 1))).toHaveProperty(field)
    })

    it(`accepts min (${min})`, () => {
      expect(errorsFor(String(min))).not.toHaveProperty(field)
    })

    it(`accepts max (${max})`, () => {
      expect(errorsFor(String(max))).not.toHaveProperty(field)
    })

    it(`rejects max+1 (${max + 1})`, () => {
      expect(errorsFor(String(max + 1))).toHaveProperty(field)
    })

    it('rejects a non-numeric value', () => {
      expect(errorsFor('not a number')).toHaveProperty(field)
    })

    it('rejects an empty value', () => {
      expect(errorsFor('')).toHaveProperty(field)
    })
  },
)

describe('VAL-14 battery units boundaries', () => {
  const errorsFor = (batteryUnits: number) =>
    validateStep('battery', validProfile({ batteryUnits }))

  it('accepts the minimum of 1 unit', () => {
    expect(errorsFor(1)).not.toHaveProperty('batteryUnits')
  })

  it('accepts the maximum of 8 units', () => {
    expect(errorsFor(8)).not.toHaveProperty('batteryUnits')
  })

  it('rejects 9 units', () => {
    expect(errorsFor(9)).toHaveProperty('batteryUnits')
  })

  /**
   * Documents a known client/server divergence rather than asserting it is
   * correct: the browser rejects 0 units, but the server schema allows ge=0
   * (backend/app/models.py). See the VAL-14 note in the test case document.
   */
  it('rejects 0 units in the browser, which the API accepts (known divergence)', () => {
    expect(errorsFor(0)).toHaveProperty('batteryUnits')
  })
})

// -------------------------------------------------------------------------
// VAL-15 .. VAL-20 - allow-list fields
// -------------------------------------------------------------------------

describe('VAL-15..17 battery model allow-list', () => {
  it('VAL-15 accepts a model on the list', () => {
    const errors = validateStep(
      'battery',
      validProfile({ batteryModel: 'Tesla Powerwall 2' }),
    )
    expect(errors).not.toHaveProperty('batteryModel')
  })

  it('VAL-16 accepts "Not sure" as an explicit escape hatch', () => {
    const errors = validateStep('battery', validProfile({ batteryModel: 'Not sure' }))
    expect(errors).not.toHaveProperty('batteryModel')
  })

  it('VAL-17 rejects an off-list model and points the user at "Not sure"', () => {
    const errors = validateStep(
      'battery',
      validProfile({ batteryModel: 'Acme SuperCell' }),
    )
    expect(errors.batteryModel).toBeDefined()
    expect(errors.batteryModel).toContain('Not sure')
  })

  it('rejects an empty model', () => {
    const errors = validateStep('battery', validProfile({ batteryModel: '' }))
    expect(errors).toHaveProperty('batteryModel')
  })
})

describe('VAL-18..20 provider allow-list', () => {
  it('VAL-18 accepts a provider on the list', () => {
    const errors = validateStep('provider', validProfile({ provider: 'AGL Energy' }))
    expect(errors).not.toHaveProperty('provider')
  })

  it('VAL-19 accepts "Other" because the list is not exhaustive', () => {
    const errors = validateStep('provider', validProfile({ provider: 'Other' }))
    expect(errors).not.toHaveProperty('provider')
  })

  it('VAL-19 accepts "Not sure"', () => {
    const errors = validateStep('provider', validProfile({ provider: 'Not sure' }))
    expect(errors).not.toHaveProperty('provider')
  })

  it('VAL-20 rejects an off-list provider', () => {
    const errors = validateStep(
      'provider',
      validProfile({ provider: 'Totally Fake Energy' }),
    )
    expect(errors).toHaveProperty('provider')
  })

  it('rejects an empty provider', () => {
    expect(validateStep('provider', validProfile({ provider: '' }))).toHaveProperty(
      'provider',
    )
  })
})

// -------------------------------------------------------------------------
// VAL-21 .. VAL-24 - conditional fields, both branches
// -------------------------------------------------------------------------

describe('VAL-21/22 dryer conditional fields', () => {
  it('VAL-21 does not require dryer frequency when the home has no dryer', () => {
    const errors = validateStep(
      'household',
      validProfile({ dryer: 'no', dryerWeek: '', dryerWeekend: '' }),
    )
    expect(errors).not.toHaveProperty('dryerWeek')
    expect(errors).not.toHaveProperty('dryerWeekend')
    expect(hasErrors(errors)).toBe(false)
  })

  it('VAL-22 requires both frequency fields when the home has a dryer', () => {
    const errors = validateStep(
      'household',
      validProfile({ dryer: 'yes', dryerWeek: '', dryerWeekend: '' }),
    )
    expect(errors).toHaveProperty('dryerWeek')
    expect(errors).toHaveProperty('dryerWeekend')
  })
})

describe('VAL-23/24 solar conditional fields', () => {
  it('VAL-23 does not require panel details when the home has no solar', () => {
    const errors = validateStep(
      'solar',
      validProfile({
        hasSolar: 'no',
        solarDirection: '',
        panelCount: '',
        panelWatts: '',
      }),
    )
    expect(hasErrors(errors)).toBe(false)
  })

  it('VAL-24 requires direction, count and watts when the home has solar', () => {
    const errors = validateStep(
      'solar',
      validProfile({
        hasSolar: 'yes',
        solarDirection: '',
        panelCount: '',
        panelWatts: '',
      }),
    )
    expect(errors).toHaveProperty('solarDirection')
    expect(errors).toHaveProperty('panelCount')
    expect(errors).toHaveProperty('panelWatts')
  })

  it('requires an answer to the solar question itself', () => {
    expect(validateStep('solar', validProfile({ hasSolar: '' }))).toHaveProperty(
      'hasSolar',
    )
  })
})

// -------------------------------------------------------------------------
// Required-field coverage (supports FUN-03 step gating)
// -------------------------------------------------------------------------

describe('FUN-03 required fields block step advancement', () => {
  const required: [string, keyof ProfileData, 'household' | 'usage'][] = [
    ['people', 'people', 'household'],
    ['rooms', 'rooms', 'household'],
    ['gas', 'gas', 'household'],
    ['refrigerators', 'refrigerators', 'household'],
    ['dryer', 'dryer', 'household'],
    ['heating', 'heating', 'household'],
    ['cooling', 'cooling', 'household'],
    ['hotWater', 'hotWater', 'household'],
    ['peakPeriod', 'peakPeriod', 'usage'],
    ['usageLevel', 'usageLevel', 'usage'],
    ['wfh', 'wfh', 'usage'],
  ]

  it.each(required)('blocks the step when %s is blank', (_name, field, step) => {
    const errors = validateStep(step, validProfile({ [field]: '' }))
    expect(errors).toHaveProperty(field)
    expect(hasErrors(errors)).toBe(true)
  })

  it('reports every blank field at once, not one at a time', () => {
    const errors = validateStep('usage', {
      ...emptyProfile(),
      fieldSources: {},
      lastUpdated: null,
    })
    expect(Object.keys(errors).length).toBeGreaterThanOrEqual(5)
  })

  it('gives a non-empty message for every error it reports', () => {
    const errors = validateStep('household', emptyProfile())
    for (const [field, message] of Object.entries(errors)) {
      expect(message, `${field} has an empty message`).toBeTruthy()
    }
  })
})

describe('hasErrors', () => {
  it('is false for an empty error object', () => {
    expect(hasErrors({})).toBe(false)
  })

  it('is true when any field has an error', () => {
    expect(hasErrors({ postcode: 'bad' })).toBe(true)
  })
})
