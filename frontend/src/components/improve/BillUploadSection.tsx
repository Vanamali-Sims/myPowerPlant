/**
 * Electricity bill PDF upload for the improve profile editor.
 * Parsed on-device; confirmed figures are merged into the profile automatically.
 */
import { BILL_UPLOAD } from '../../constants/bills'
import type { BillFacts, BillReadResult } from '../../lib/bills/types'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { LockIcon } from '../ui/icons'
import { useBillUpload } from './useBillUpload'

type Props = {
  profile: ProfileData
  uploadError?: string
  onChange: (profile: ProfileData) => void
}

function errorMessage(result: Extract<BillReadResult, { ok: false }>): string {
  return BILL_UPLOAD.errors[result.reason] ?? BILL_UPLOAD.unsupported
}

/**
 * BillUploadSection
 * @param props.profile - Current improve-setup answers
 * @param props.onChange - Called when extracted figures are merged into the profile
 */
export function BillUploadSection({ profile, uploadError, onChange }: Props) {
  const {
    inputId,
    file,
    reading,
    result,
    dragging,
    facts,
    setDragging,
    onDrop,
    onInputChange,
    clearFile,
  } = useBillUpload(profile, onChange)

  return (
    <section className="bill-upload dashboard-card goals-upload" aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`}>{BILL_UPLOAD.title}</h2>
      <p className="goals-upload__hint">{BILL_UPLOAD.hint}</p>
      <p className="goals-upload__privacy">
        <LockIcon aria-hidden />
        {BILL_UPLOAD.privacy}
      </p>

      <div
        className={`bill-upload__drop${dragging ? ' bill-upload__drop--active' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          id={inputId}
          type="file"
          accept=".pdf,application/pdf"
          className="bill-upload__input"
          onChange={(event) => {
            onInputChange(event.target.files)
            event.target.value = ''
          }}
        />
        <label htmlFor={inputId} className="bill-upload__label">
          {file ? file.name : BILL_UPLOAD.drop}
        </label>
        {file ? (
          <Button type="button" variant="ghost" onClick={clearFile}>
            {BILL_UPLOAD.clear}
          </Button>
        ) : null}
      </div>

      {reading ? <p className="goals-upload__status" role="status">{BILL_UPLOAD.reading}</p> : null}

      {uploadError ? <p className="bill-upload__error" role="alert">{uploadError}</p> : null}

      {result && !result.ok ? (
        <p className="bill-upload__error" role="alert">{errorMessage(result)}</p>
      ) : null}

      {facts ? (
        <div className="bill-upload__summary">
          <dl className="bill-upload__figures">
            <div>
              <dt>Postcode</dt>
              <dd>{facts.postcode}</dd>
            </div>
            <div>
              <dt>This period</dt>
              <dd>{facts.periodUsageKwh} kWh in {facts.periodDays} days</dd>
            </div>
            <div>
              <dt>Period charges</dt>
              <dd>${facts.periodChargeAud.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Monthly estimate</dt>
              <dd>{facts.monthlyKwh} kWh · ${facts.monthlyBill}/month</dd>
            </div>
            <div>
              <dt>Retailer</dt>
              <dd>{facts.retailerLabel}</dd>
            </div>
          </dl>
          {facts.hadOpeningBalance ? (
            <p className="bill-upload__note">{BILL_UPLOAD.openingBalanceNote}</p>
          ) : null}
          <p className="bill-upload__note">{BILL_UPLOAD.appliedNote}</p>
        </div>
      ) : null}
    </section>
  )
}
