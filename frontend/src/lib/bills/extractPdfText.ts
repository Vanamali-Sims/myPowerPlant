/**
 * Pull plain text from a PDF on the main thread. pdf.js uses its own worker file;
 * nesting that inside our bill worker breaks in Vite, so extraction stays here.
 */
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'

let workerConfigured = false

function ensurePdfJsWorker(): void {
  if (workerConfigured) return
  GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  workerConfigured = true
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  ensurePdfJsWorker()
  const data = new Uint8Array(buffer)
  const task = getDocument({ data, useSystemFonts: true })
  const doc = await task.promise
  const chunks: string[] = []
  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum)
      const content = await page.getTextContent()
      const line = content.items
        .map((item) => (typeof item === 'object' && item !== null && 'str' in item ? String(item.str) : ''))
        .join(' ')
      chunks.push(line)
    }
  } finally {
    await doc.destroy()
  }
  return chunks.join('\n\n')
}
