/**
 * Electricity bill upload: limits and copy. Files are read in the browser only.
 */

export const MAX_BILL_BYTES = 10 * 1024 * 1024

/** Any PDF we cannot read as a supported bill: another retailer, no usage found, or unreadable. */
export const BILL_WRONG_FORMAT =
  'The PDF you uploaded is in the wrong format. Currently, only Powershop bills are accepted.'

export const BILL_UPLOAD = {
  title: 'Upload your electricity bill',
  hint: 'PDF from your retailer (Powershop supported). We read usage and postcode on this device only.',
  privacy:
    'Your bill is read on this device. It is never uploaded. We only keep the usage, cost, and postcode you confirm.',
  choose: 'Choose PDF',
  drop: 'Drop your bill PDF here, or browse',
  reading: 'Reading your bill on this device…',
  appliedNote: 'These figures are saved on this device with your profile.',
  clear: 'Remove file',
  openingBalanceNote:
    'This bill includes an earlier account balance. We used this billing period’s usage and charges, not the total amount due.',
  unsupported: BILL_WRONG_FORMAT,
  errors: {
    not_pdf: 'Please choose a PDF file.',
    empty_file: 'That file is empty.',
    file_too_large: 'That file is too large. Try a bill under 10 MB.',
    unreadable: BILL_WRONG_FORMAT,
    retailer_not_supported: BILL_WRONG_FORMAT,
    parse_failed: BILL_WRONG_FORMAT,
    unsafe: 'Something sensitive was detected in the extracted figures. Nothing was saved.',
  } as const,
} as const
