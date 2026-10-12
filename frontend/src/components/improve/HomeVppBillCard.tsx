import { BILL_UPLOAD } from '../../constants/bills'
import { HOME_VPP_ONBOARDING } from '../../constants/improve'
import type { ProfileData } from '../../types/profile'
import { LockIcon } from '../ui/icons'
import { BillIllustration } from './BillIllustration'
import { useBillUpload } from './useBillUpload'

type Props = {
  profile: ProfileData
  uploadError?: string
  onChange: (profile: ProfileData) => void
}

function errorMessage(result: Extract<import('../../lib/bills/types').BillReadResult, { ok: false }>): string {
  return BILL_UPLOAD.errors[result.reason] ?? BILL_UPLOAD.unsupported
}

export function HomeVppBillCard({ profile, uploadError, onChange }: Props) {
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
  } = useBillUpload(profile, onChange)

  const dropClass = [
    'home-vpp-bill__drop',
    dragging ? 'home-vpp-bill__drop--active' : '',
    file ? 'home-vpp-bill__drop--has-file' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="home-vpp-card home-vpp-bill" aria-labelledby="home-vpp-bill-title">
      <h2 id="home-vpp-bill-title" className="home-vpp-card__title">
        {HOME_VPP_ONBOARDING.billTitle}
      </h2>
      <p className="home-vpp-card__lede">{HOME_VPP_ONBOARDING.billLede}</p>

      <label
        className={dropClass}
        htmlFor={inputId}
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
          className="visually-hidden"
          onChange={(event) => {
            onInputChange(event.target.files)
            event.target.value = ''
          }}
        />
        <BillIllustration />
        <p className="home-vpp-bill__drop-title">
          {file ? file.name : HOME_VPP_ONBOARDING.dropTitle}
        </p>
        {file ? null : (
          <p className="home-vpp-bill__drop-browse">
            or{' '}
            <span className="home-vpp-bill__drop-link">{HOME_VPP_ONBOARDING.browseLink}</span>
          </p>
        )}
        <div className="home-vpp-bill__chips" aria-hidden={Boolean(file)}>
          {HOME_VPP_ONBOARDING.chips.map((chip) => (
            <span key={chip} className="home-vpp-bill__chip">{chip}</span>
          ))}
        </div>
      </label>

      {reading ? (
        <p className="home-vpp-bill__status" role="status">{BILL_UPLOAD.reading}</p>
      ) : null}
      {uploadError ? <p className="home-vpp-bill__error" role="alert">{uploadError}</p> : null}
      {result && !result.ok ? (
        <p className="home-vpp-bill__error" role="alert">{errorMessage(result)}</p>
      ) : null}
      {facts ? (
        <p className="home-vpp-bill__applied" role="status">{BILL_UPLOAD.appliedNote}</p>
      ) : null}

      <p className="home-vpp-bill__privacy">
        <LockIcon aria-hidden />
        {HOME_VPP_ONBOARDING.privacy}
      </p>
    </section>
  )
}
