/**
 * Types for on-device bill parsing. Only allowlisted fields may leave the parser.
 */

export type BillReadErrorReason =
  | 'not_pdf'
  | 'empty_file'
  | 'file_too_large'
  | 'unreadable'
  | 'retailer_not_supported'
  | 'parse_failed'
  | 'unsafe'

export type BillRetailerId = 'powershop'

export type BillFacts = {
  retailerId: BillRetailerId
  retailerLabel: string
  postcode: string
  periodDays: number
  periodUsageKwh: number
  periodChargeAud: number
  monthlyKwh: string
  monthlyBill: string
  hadOpeningBalance: boolean
  parserId: string
}

export type BillReadResult =
  | { ok: true; facts: BillFacts }
  | { ok: false; reason: BillReadErrorReason }
