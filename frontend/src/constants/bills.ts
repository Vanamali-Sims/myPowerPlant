/**
 * Electricity bill upload: limits and copy. Files are read in the browser only.
 */

export const MAX_BILL_BYTES = 10 * 1024 * 1024

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
  unsupported: 'We could not read this bill yet. Enter your details below, or try a Powershop PDF.',
  errors: {
    not_pdf: 'Please choose a PDF file.',
    empty_file: 'That file is empty.',
    file_too_large: 'That file is too large. Try a bill under 10 MB.',
    unreadable: 'We could not read that PDF. Try downloading it again from your retailer.',
    retailer_not_supported: 'This retailer is not supported yet. Powershop PDFs work today.',
    parse_failed: 'We could not find usage on this bill. Check the file or enter details manually.',
    unsafe: 'Something sensitive was detected in the extracted figures. Nothing was saved.',
  } as const,
} as const
