/**
 * Blank battery template, built and saved in the browser.
 */
import { TEMPLATE_COLUMNS, TEMPLATE_FILE_NAME } from '../../constants/batterySources'

/** Header row only, so nothing in the template can be mistaken for real data. */
export function buildTemplateCsv(): string {
  return `${TEMPLATE_COLUMNS.map((column) => column.name).join(',')}\r\n`
}

/**
 * downloadTemplate
 * @returns void
 *
 * Saves the template with a local object URL. Nothing is fetched or sent.
 */
export function downloadTemplate(): void {
  const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = TEMPLATE_FILE_NAME
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
