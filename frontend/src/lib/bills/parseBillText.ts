import { isPowershopBill, parsePowershopBill } from './adapters/powershop'
import { assertSafeFacts } from './assertSafeFacts'
import type { BillReadResult } from './types'

function fileNameHintsPowershop(fileName: string): boolean {
  return /powershop/i.test(fileName)
}

/**
 * parseBillText
 * @param text - Plain text from a PDF, read on-device
 * @param fileName - Optional hint when pdf.js spacing breaks brand detection
 */
export function parseBillText(text: string, fileName = ''): BillReadResult {
  const body = text.split('\0').join('').trim()
  if (!body) return { ok: false, reason: 'parse_failed' }

  if (isPowershopBill(body) || fileNameHintsPowershop(fileName)) {
    const result = parsePowershopBill(body)
    if (!result.ok) return result
    if (!assertSafeFacts(result.facts)) return { ok: false, reason: 'unsafe' }
    return result
  }

  return { ok: false, reason: 'retailer_not_supported' }
}
