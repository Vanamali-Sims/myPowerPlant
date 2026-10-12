/**
 * Powershop tax-invoice parser. Works on pdf.js text (including spaced glyphs).
 */
import { FIELD_BOUNDS } from '../../../constants/validation'
import { isVictorianPostcode } from '../../validateProfile'
import { formatProfileAmount, normalizeMonthly } from '../normalize'
import { compactBillText } from '../normalizeBillText'
import type { BillFacts, BillReadResult } from '../types'

const PARSER_ID = 'powershop-v2'

function money(raw: string): number {
  return Number(raw.replace(/,/g, ''))
}

function firstMatch(text: string, pattern: RegExp): RegExpMatchArray | null {
  return text.match(pattern)
}

/**
 * parsePowershopBill
 * @param text - Full document text from the PDF (any whitespace layout)
 */
export function parsePowershopBill(text: string): BillReadResult {
  const compact = compactBillText(text)

  const period = firstMatch(
    compact,
    /BillingPeriod(\d{2}\/\d{2}\/\d{2})to(\d{2}\/\d{2}\/\d{2})\((\d+)days?\)/i,
  )
  const periodDays = period ? Number(period[3]) : 0

  const postcodeMatch = firstMatch(compact, /SupplyAddress[^,]+,[^,]+,(\d{4}),VIC/i)
  const postcode = postcodeMatch?.[1] ?? ''
  if (!isVictorianPostcode(postcode)) {
    return { ok: false, reason: 'parse_failed' }
  }

  let periodUsageKwh = 0
  const usageTable = firstMatch(compact, /Usagecharges.{0,1500}?AllDayUsage(\d+(?:\.\d+)?)kWh/i)
  if (usageTable) {
    periodUsageKwh = Number(usageTable[1])
  } else {
    const meterRow = firstMatch(compact, /AllDayUsage(\d+(?:\.\d+)?)kWh/i)
    if (meterRow) periodUsageKwh = Number(meterRow[1])
  }
  if (!Number.isFinite(periodUsageKwh) || periodUsageKwh <= 0) {
    const daily = firstMatch(compact, /Thisperiod:([\d.]+)kWhperday/i)
    if (daily && periodDays > 0) {
      periodUsageKwh = Number(daily[1]) * periodDays
    }
  }
  if (
    !Number.isFinite(periodUsageKwh) ||
    periodUsageKwh < FIELD_BOUNDS.monthlyKwh.min ||
    periodUsageKwh > FIELD_BOUNDS.monthlyKwh.max
  ) {
    return { ok: false, reason: 'parse_failed' }
  }

  const invoiceMatch = firstMatch(compact, /Totaltaxinvoice\(incl\.GST[^)]*\)\$([\d,]+\.\d{2})/i)
  let periodChargeAud = invoiceMatch ? money(invoiceMatch[1]) : 0
  if (!periodChargeAud) {
    const subtotal = firstMatch(compact, /Chargessubtotal\$([\d,]+\.\d{2})/i)
    if (subtotal) periodChargeAud = money(subtotal[1])
  }
  if (
    !Number.isFinite(periodChargeAud) ||
    periodChargeAud < FIELD_BOUNDS.monthlyBill.min ||
    periodChargeAud > FIELD_BOUNDS.monthlyBill.max
  ) {
    return { ok: false, reason: 'parse_failed' }
  }

  if (!periodDays || periodDays < 1 || periodDays > 120) {
    return { ok: false, reason: 'parse_failed' }
  }

  const opening = firstMatch(compact, /Openingaccountbalance\$([\d,]+\.\d{2})/i)
  const openingAud = opening ? money(opening[1]) : 0
  const hadOpeningBalance = Number.isFinite(openingAud) && openingAud > 0.005

  const monthlyKwh = formatProfileAmount(normalizeMonthly(periodUsageKwh, periodDays))
  const monthlyBill = formatProfileAmount(normalizeMonthly(periodChargeAud, periodDays))

  const facts: BillFacts = {
    retailerId: 'powershop',
    retailerLabel: 'Powershop',
    postcode,
    periodDays,
    periodUsageKwh,
    periodChargeAud,
    monthlyKwh,
    monthlyBill,
    hadOpeningBalance,
    parserId: PARSER_ID,
  }

  return { ok: true, facts }
}

export function isPowershopBill(text: string): boolean {
  const compact = compactBillText(text)
  return (
    /powershop/i.test(compact) ||
    /BILLERCODE:207720/i.test(compact) ||
    (/Powerpack/i.test(compact) && /SwitchSaver/i.test(compact))
  )
}
