/**
 * Shared steps for screen tests that upload a battery file through the
 * "Upload this month's file" dialog. Test-only; never imported by the app.
 */
import { screen, within } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { GOALS_PAGE, GOALS_UPLOAD } from '../../../constants/goals'

type User = ReturnType<typeof userEvent.setup>

export function uploadDialog(): HTMLElement {
  return screen.getByRole('dialog', { name: GOALS_UPLOAD.title })
}

/** Opens the dialog, chooses the file, and waits until it has been read. */
export async function uploadCsv(user: User, csv: string, name = 'battery.csv'): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: GOALS_PAGE.upload }))
  const dialog = uploadDialog()
  const input = dialog.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, new File([csv], name))
  await within(dialog).findByText(/✓ File read|could not be read/)
  return dialog
}

/** Selects "Update my goals" in the open dialog. */
export async function updateGoals(user: User): Promise<void> {
  await user.click(within(uploadDialog()).getByRole('button', { name: GOALS_UPLOAD.confirm }))
}
