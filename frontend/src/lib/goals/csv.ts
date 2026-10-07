/**
 * Small CSV reader for battery files, run entirely in the browser.
 *
 * Handles a byte order mark, comma or semicolon separators, quoted fields
 * (with doubled quotes and line breaks inside them), and CRLF, LF, or CR
 * line endings. It never fetches anything.
 */

export type CsvRow = {
  /** 1-based line in the file where this row starts. */
  line: number
  cells: string[]
}

export type CsvResult =
  | { ok: true; delimiter: ',' | ';'; rows: CsvRow[] }
  | { ok: false }

/**
 * detectDelimiter
 * @param text - File text without a byte order mark
 * @returns ';' when the first line has more semicolons than commas outside quotes, else ','
 */
function detectDelimiter(text: string): ',' | ';' {
  let commas = 0
  let semicolons = 0
  let quoted = false
  for (const char of text) {
    if (char === '"') quoted = !quoted
    else if (!quoted && (char === '\n' || char === '\r')) break
    else if (!quoted && char === ',') commas += 1
    else if (!quoted && char === ';') semicolons += 1
  }
  return semicolons > commas ? ';' : ','
}

/**
 * parseCsv
 * @param input - Whole file as text
 * @returns Rows of trimmed-at-edges cell text, or ok: false when a quote is never closed
 *
 * Rows that are completely blank are dropped. Cells keep inner spaces.
 */
export function parseCsv(input: string): CsvResult {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  const delimiter = detectDelimiter(text)
  const rows: CsvRow[] = []
  let cells: string[] = []
  let cell = ''
  let quoted = false
  let line = 1
  let rowLine = 1

  function endCell() {
    cells.push(cell.trim())
    cell = ''
  }

  function endRow() {
    endCell()
    if (cells.some((value) => value !== '')) rows.push({ line: rowLine, cells })
    cells = []
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        if (char === '\n' || (char === '\r' && text[i + 1] !== '\n')) line += 1
        cell += char
      }
      continue
    }
    if (char === '"' && cell.trim() === '') {
      quoted = true
      cell = ''
    } else if (char === delimiter) {
      endCell()
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      endRow()
      line += 1
      rowLine = line
    } else {
      cell += char
    }
  }
  if (quoted) return { ok: false }
  if (cell !== '' || cells.length) endRow()
  return { ok: true, delimiter, rows }
}
