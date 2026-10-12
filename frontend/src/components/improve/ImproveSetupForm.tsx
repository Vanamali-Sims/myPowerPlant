/**
 * Access-features form: three short steps asking only what What if, Goals,
 * and Reminders need.
 */
import { useEffect, useRef, useState } from 'react'
import { IMPROVE_FORM_DONE, IMPROVE_PREFILL_NOTICE, IMPROVE_STEPS } from '../../constants/improve'
import {
  IMPROVE_STEP_FIELDS,
  finishImproveProfile,
  validateImproveStep,
  vppProviderOptions,
} from '../../lib/improveProfile'
import type { MethodologyBundle } from '../../lib/methodologyApi'
import { hasErrors, type FieldErrors } from '../../lib/validateProfile'
import type { ProfileData } from '../../types/profile'
import { Button } from '../ui/Button'
import { FormActions } from '../ui/FormActions'
import { FormHeader } from '../ui/FormHeader'
import { StepProgress } from '../ui/StepProgress'
import { ImproveFields } from './ImproveFields'

type Props = {
  profile: ProfileData
  /** Methodology data for the VPP list, or null while it loads. */
  bundle: MethodologyBundle | null
  /** True when the form opens with answers from the explore form. */
  prefilled: boolean
  onChange: (profile: ProfileData) => void
  onComplete: (profile: ProfileData) => void
  onExit: () => void
  onLogoClick: () => void
}

const ALL_FIELDS = IMPROVE_STEPS.flatMap((step) => IMPROVE_STEP_FIELDS[step.id])

function answeredCount(profile: ProfileData): number {
  return ALL_FIELDS.filter((field) => {
    const value = profile[field]
    return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
  }).length
}

/**
 * ImproveSetupForm
 * @param props.profile - Shared answers; edits go straight back through onChange
 * @param props.prefilled - Show the "we used your earlier answers" pop-up first
 * @param props.onComplete - Called with the finished answers after the last step
 * @returns JSX.Element
 *
 * Continue checks only the current step. There is no skip: the required
 * questions have no safe typical value.
 */
export function ImproveSetupForm({
  profile,
  bundle,
  prefilled,
  onChange,
  onComplete,
  onExit,
  onLogoClick,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [noticeOpen, setNoticeOpen] = useState(prefilled)
  const step = IMPROVE_STEPS[stepIndex]
  const total = IMPROVE_STEPS.length
  const answered = answeredCount(profile)

  function patch<K extends keyof ProfileData>(field: K, value: ProfileData[K]) {
    onChange({ ...profile, [field]: value })
    if (errors[field]) {
      setErrors((current) => {
        const copy = { ...current }
        delete copy[field]
        return copy
      })
    }
  }

  function continueStep() {
    const stepErrors = validateImproveStep(step.id, profile)
    if (hasErrors(stepErrors)) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    if (stepIndex === total - 1) {
      onComplete(finishImproveProfile(profile))
      return
    }
    setStepIndex((index) => index + 1)
  }

  function goBack() {
    setErrors({})
    if (stepIndex === 0) {
      onExit()
      return
    }
    setStepIndex((index) => index - 1)
  }

  return (
    <div className="setup improve-setup">
      <PrefillNotice open={noticeOpen} onClose={() => setNoticeOpen(false)} />
      <FormHeader
        postcode={profile.postcode}
        onPostcodeChange={(postcode) => patch('postcode', postcode)}
        onLogoClick={onLogoClick}
      />
      <StepProgress
        step={stepIndex + 1}
        total={total}
        answered={answered}
        fields={ALL_FIELDS.length}
        percent={Math.round((answered / ALL_FIELDS.length) * 100)}
        minutesLeft={Math.max(1, total - stepIndex)}
      />
      <div key={step.id} className="view-enter flex flex-col gap-5">
        <div className="setup__intro">
          <h1>{step.title}</h1>
          <p>{step.lede}</p>
        </div>
        <div className="setup__fields">
          <ImproveFields
            step={step.id}
            profile={profile}
            errors={errors}
            onChange={patch}
            vppOptions={vppProviderOptions(bundle)}
          />
        </div>
      </div>
      <FormActions
        continueLabel={stepIndex === total - 1 ? IMPROVE_FORM_DONE : 'Continue'}
        onBack={goBack}
        onContinue={continueStep}
      />
    </div>
  )
}

type NoticeProps = {
  open: boolean
  onClose: () => void
}

/** Native modal pop-up, same pattern as the setup intro dialog. */
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
