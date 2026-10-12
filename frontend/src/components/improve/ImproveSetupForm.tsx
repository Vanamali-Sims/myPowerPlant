/**
 * Access-features setup: one screen (bill + home/VPP details), then done.
 */
import { useEffect, useRef, useState } from 'react'
import { HOME_VPP_ONBOARDING, IMPROVE_PREFILL_NOTICE } from '../../constants/improve'
import { finishImproveProfile, validateHomeVppStep } from '../../lib/improveProfile'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import { useBlurValidation } from '../../lib/useBlurValidation'
import { hasErrors, type FieldErrors } from '../../lib/validateProfile'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { HomeVppOnboarding } from './HomeVppOnboarding'

type Props = {
  profile: ProfileData
  bundle: MethodologyBundle | null
  prefilled: boolean
  onChange: (profile: ProfileData) => void
  onComplete: (profile: ProfileData) => void
  onLogoClick: () => void
}

export function ImproveSetupForm({
  profile,
  bundle,
  prefilled,
  onChange,
  onComplete,
  onLogoClick,
}: Props) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [noticeOpen, setNoticeOpen] = useState(prefilled)
  // Fields are checked as people leave them, not only on save.
  const blur = useBlurValidation(() => validateHomeVppStep(profile), setErrors)

  function patch<K extends keyof ProfileData>(field: K, value: ProfileData[K]) {
    const fieldSources =
      field === 'vppProvider' || field === 'people'
        ? { ...profile.fieldSources, [field]: 'user' as const }
        : profile.fieldSources
    onChange({ ...profile, [field]: value, fieldSources })
    blur.touch(field)
    if (errors[field]) {
      setErrors((current) => {
        const copy = { ...current }
        delete copy[field]
        return copy
      })
    }
    if (errors.billUpload) {
      setErrors((current) => {
        const copy = { ...current }
        delete copy.billUpload
        return copy
      })
    }
  }

  function saveHomeVpp() {
    const stepErrors = validateHomeVppStep(profile)
    if (hasErrors(stepErrors)) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    onComplete(finishImproveProfile({ ...profile, hasSolar: 'yes' }))
  }

  return (
    <div className="setup improve-setup improve-setup--home-vpp">
      <PrefillNotice open={noticeOpen} onClose={() => setNoticeOpen(false)} />
      <HomeVppOnboarding
        profile={profile}
        bundle={bundle}
        errors={errors}
        onChange={onChange}
        onPatch={patch}
        onLogoClick={onLogoClick}
        onFieldBlur={blur.onBlur}
      />
      <footer className="home-vpp__footer">
        <Button type="button" variant="primary" className="home-vpp__save" onClick={saveHomeVpp}>
          {HOME_VPP_ONBOARDING.saveLabel}
        </Button>
      </footer>
    </div>
  )
}

type NoticeProps = {
  open: boolean
  onClose: () => void
}

function PrefillNotice({ open, onClose }: NoticeProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return
    if (open) {
      if (!node.open) node.showModal()
    } else if (node.open) {
      node.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="vpp-dialog setup-intro"
      aria-labelledby="improve-prefill-title"
      aria-describedby="improve-prefill-body"
      aria-modal="true"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      {open ? (
        <div className="vpp-dialog__panel">
          <header className="vpp-dialog__header">
            <h3 id="improve-prefill-title">{IMPROVE_PREFILL_NOTICE.title}</h3>
          </header>
          <div className="vpp-dialog__body">
            <p id="improve-prefill-body" className="vpp-dialog__lede">
              {IMPROVE_PREFILL_NOTICE.body}
            </p>
          </div>
          <footer className="vpp-dialog__footer setup-intro__footer">
            <Button variant="primary" onClick={onClose}>
              {IMPROVE_PREFILL_NOTICE.action}
            </Button>
          </footer>
        </div>
      ) : null}
    </dialog>
  )
}
