/**
 * @vitest-environment jsdom
 *
 * A PDF that cannot be read as a supported bill shows one message, whatever
 * the reason: another retailer, no usage found, or an unreadable file.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BILL_WRONG_FORMAT } from '../../../constants/bills'
import { readBillFile } from '../../../lib/bills/readBillFile'
import { emptyProfile } from '../../../types/profile'
import { HomeVppBillCard } from '../HomeVppBillCard'

vi.mock('../../../lib/bills/readBillFile', () => ({ readBillFile: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('wrong-format bill PDF', () => {
  it('reads as "the wrong format, only Powershop accepted"', () => {
    expect(BILL_WRONG_FORMAT).toBe(
      'The PDF you uploaded is in the wrong format. Currently, only Powershop bills are accepted.',
    )
  })

  it.each(['retailer_not_supported', 'parse_failed', 'unreadable'] as const)(
    'shows that message when the reader says %s',
    async (reason) => {
      vi.mocked(readBillFile).mockResolvedValue({ ok: false, reason })
      const user = userEvent.setup()
      render(<HomeVppBillCard profile={emptyProfile()} onChange={vi.fn()} />)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, new File(['%PDF'], 'agl-bill.pdf', { type: 'application/pdf' }))
      expect(await screen.findByText(BILL_WRONG_FORMAT)).toBeTruthy()
    },
  )

  it('keeps its own message for a file that is not a PDF', async () => {
    vi.mocked(readBillFile).mockResolvedValue({ ok: false, reason: 'not_pdf' })
    const user = userEvent.setup({ applyAccept: false })
    render(<HomeVppBillCard profile={emptyProfile()} onChange={vi.fn()} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['x'], 'bill.txt', { type: 'text/plain' }))
    expect(await screen.findByText('Please choose a PDF file.')).toBeTruthy()
    expect(screen.queryByText(BILL_WRONG_FORMAT)).toBeNull()
  })
})
