/**
 * pdf.js often inserts spaces between glyphs. Collapse whitespace so label regexes still match.
 */
export function compactBillText(text: string): string {
  return text.replace(/\u0000/g, '').replace(/\s+/g, '')
}
