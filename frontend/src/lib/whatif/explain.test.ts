import { describe, expect, it } from 'vitest'
import { checkNumbers, type ExplainFact } from './guard'
import { changeFigures, surplusLabel } from './explain'
import type { HourPoint } from '../typicalDay'

const facts: ExplainFact[] = [
  { id: 'save.annual', label: 'Change over a year', display: '$120', numeric: 120 },
  { id: 'reserve.draft', label: 'Battery reserve after', display: '40%', numeric: 40 },
]

describe('checkNumbers', () => {
  it('accepts a clock span and a figure that was calculated', () => {
    const result = checkNumbers('Spare solar runs 11am to 3pm. About $120 over a year.', facts)
    expect(result.ok).toBe(true)
  })

  it('rejects a dollar amount that was not calculated', () => {
    const result = checkNumbers('This saves $999 over a year.', facts)
    expect(result.ok).toBe(false)
  })

  it('rejects a small energy figure that was not calculated', () => {
    const result = checkNumbers('You gain 2 kWh at midday.', facts)
    expect(result.ok).toBe(false)
  })
})

describe('surplusLabel', () => {
  it('names the hours where solar is above use', () => {
    const points: HourPoint[] = [
      { hour: 10, loadKwh: 1, solarKwh: 0.2 },
      { hour: 11, loadKwh: 0.4, solarKwh: 1.2 },
      { hour: 12, loadKwh: 0.4, solarKwh: 1.4 },
      { hour: 15, loadKwh: 1, solarKwh: 0.2 },
    ]
    expect(surplusLabel(points)).toBe('11am to 12pm')
  })

  it('says none when the house uses everything', () => {
    expect(surplusLabel([{ hour: 12, loadKwh: 2, solarKwh: 1 }])).toBe('none')
  })
})

describe('changeFigures', () => {
  it('keeps panel counts the model is allowed to repeat', () => {
    const figures = changeFigures(['Panels: 26 → 25'])
    expect(figures.map((figure) => figure.numeric)).toEqual([26, 25])
  })
})
