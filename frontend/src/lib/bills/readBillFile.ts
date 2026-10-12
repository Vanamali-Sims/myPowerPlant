/**
 * Read an electricity bill PDF in the browser. The file is never uploaded.
 */
import { MAX_BILL_BYTES } from '../../constants/bills'
import { extractPdfText } from './extractPdfText'
import { parseBillText } from './parseBillText'
import type { BillReadErrorReason, BillReadResult } from './types'

/**
 * checkBillFile
 * @param file - Chosen or dropped file
 */
export function checkBillFile(file: Pick<File, 'name' | 'size'>): BillReadResult | null {
  if (!/\.pdf$/i.test(file.name)) return { ok: false, reason: 'not_pdf' }
  if (file.size === 0) return { ok: false, reason: 'empty_file' }
  if (file.size > MAX_BILL_BYTES) return { ok: false, reason: 'file_too_large' }
  return null
}

/**
 * readBillFile
 * @param file - PDF bill from the user
 */
export async function readBillFile(file: File): Promise<BillReadResult> {
  const early = checkBillFile(file)
  if (early) return early

  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    return { ok: false, reason: 'unreadable' }
  }

  let text: string
  try {
    text = await extractPdfText(buffer)
  } catch {
    return { ok: false, reason: 'unreadable' }
  }

  return parseBillText(text, file.name)
}

/** @internal Test hook: parse without PDF extraction. */
export function readBillFromText(text: string, fileName = ''): BillReadResult {
  return parseBillText(text, fileName)
}

export type { BillReadErrorReason }
