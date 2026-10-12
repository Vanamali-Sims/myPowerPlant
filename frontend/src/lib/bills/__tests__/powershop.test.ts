import { describe, expect, it } from 'vitest'
import { normalizeMonthly } from '../normalize'
import { readBillFromText } from '../readBillFile'
import sampleText from './fixtures/powershop-sample.txt?raw'

describe('parsePowershopBill', () => {
  it('extracts period usage, period charge, and normalizes to monthly figures', () => {
    const result = readBillFromText(sampleText)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.facts.postcode).toBe('3167')
    expect(result.facts.periodUsageKwh).toBe(364)
    expect(result.facts.periodChargeAud).toBe(132.73)
    expect(result.facts.hadOpeningBalance).toBe(true)
    expect(result.facts.monthlyKwh).toBe(String(Math.round(normalizeMonthly(364, 31))))
    expect(result.facts.monthlyBill).toBe(String(Math.round(normalizeMonthly(132.73, 31))))
    expect(result.facts.monthlyKwh).toBe('357')
    expect(result.facts.monthlyBill).toBe('130')
  })

  it('rejects non-Powershop text', () => {
    const result = readBillFromText('Origin Energy bill for 300 kWh')
    expect(result).toEqual({ ok: false, reason: 'retailer_not_supported' })
  })

  it('parses pdf.js spaced glyph text like real Powershop PDFs', () => {
    const spaced =
      'Po w e rs ho p   A ustr alia   P ty   L t d  p o w e rs ho p. com . a u  ' +
      'Supply   Add r e ss   1   E x ample   S tr ee t,   T own , 3167,   VIC  ' +
      'Billing Period 14/08/26 to 13/09/26 (31 days)  Usage charges  All Day Usage  364 kWh  ' +
      'Total tax invoice (incl. GST of $12.06)  $132.73  Opening account balance  $327.82'
    const result = readBillFromText(spaced)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.facts.monthlyKwh).toBe('357')
  })
})
