/**
 * Battery file upload section of the Goals page.
 *
 * The file is read in this browser with the File API. Nothing in this flow
 * fetches, posts, or beacons anything.
 */
import { useId, useRef, useState } from 'react'
import type { BatterySourceId } from '../../constants/batterySources'
import { REASON_MESSAGES } from '../../constants/goalMessages'
import type { ReadLimits, ReadResult } from '../../lib/goals/adapters/types'
import { readBatteryFile } from '../../lib/goals/readBatteryFile'
import { Button } from '../ui/Button'
import { AlertIcon, LockIcon } from '../ui/icons'
import { FileChooser } from './FileChooser'
import { ReadSummary } from './ReadSummary'
import { SourceGuide } from './SourceGuide'

export type ReadDays = Extract<ReadResult, { ok: true }>

type Props = {
  locked: boolean
  /** True when the goal setup form is on the page to go back to. */
  canGoToSetup: boolean
  onGoToSetup: () => void
  /** null when the estimate data is unavailable, so values cannot be checked. */
  limits: ReadLimits | null
  onContinue: (result: ReadDays) => void
}

const PRIVACY_NOTE =
  'Your file is read on this device only. It is never uploaded or sent anywhere, and it is not kept after you leave this page.'

/**
 * UploadArea
 * @param props.locked - True until both goals are saved
 * @param props.limits - Validity limits for energy values
 * @returns Locked note, or provider choice, file chooser, read status, and summary
 */
export function UploadArea({ locked, canGoToSetup, onGoToSetup, limits, onContinue }: Props) {
  const chooseId = useId()
  const [sourceId, setSourceId] = useState<BatterySourceId | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [reading, setReading] = useState(false)
  const [result, setResult] = useState<ReadResult | null>(null)
  const [status, setStatus] = useState('')
  const readToken = useRef(0)
  const sourceHeading = useRef<HTMLHeadingElement>(null)

  function focusChoose() {
    document.getElementById(chooseId)?.focus()
  }

  function reset(message = '') {
    readToken.current += 1
    setFile(null)
    setResult(null)
    setReading(false)
    setStatus(message)
  }

  function choose(next: File) {
    readToken.current += 1
    setFile(next)
    setResult(null)
    setReading(false)
    setStatus(`Chosen ${next.name}. Select Read file when you are ready.`)
  }

  async function read() {
    if (!file || !limits || !sourceId) return
    const token = (readToken.current += 1)
    setReading(true)
    setResult(null)
    setStatus('Reading your file on this device…')
    const next = await readBatteryFile(file, sourceId, limits)
    if (token !== readToken.current) return
    setReading(false)
    setResult(next)
    setStatus(next.ok ? 'Your file was read.' : 'Your file could not be read.')
  }

  if (locked) {
    return (
      <section className="dashboard-card goals-upload" aria-labelledby="goals-upload-title">
        <h2 id="goals-upload-title">Upload your battery file</h2>
        <p className="goals-upload__locked">
          <LockIcon width={16} height={16} />
          <span>Upload unlocks after both goals are saved.</span>
        </p>
        {canGoToSetup ? (
          <Button variant="secondary" className="goals-upload__setup" onClick={onGoToSetup}>
            Go to goal setup
          </Button>
        ) : null}
      </section>
    )
  }

  return (
    <section className="dashboard-card goals-upload" aria-labelledby="goals-upload-title">
      <h2 id="goals-upload-title" tabIndex={-1}>
        Upload your battery file
      </h2>
      <p className="goals-upload__privacy">
        <LockIcon width={16} height={16} />
        <span>{PRIVACY_NOTE}</span>
      </p>

      {!limits ? (
        <p className="goals-upload__locked">
          <AlertIcon width={16} height={16} />
          <span>
            {REASON_MESSAGES.estimates_unavailable} Files can be read once the estimate data loads.
          </span>
        </p>
      ) : (
        <>
          <SourceGuide
            value={sourceId}
            onChange={(next) => {
              readToken.current += 1
              setSourceId(next)
              setResult(null)
              setReading(false)
            }}
            headingRef={sourceHeading}
          />

          {!sourceId ? (
            <p className="goals-upload__hint">Choose Tesla or Amber, then add your file.</p>
          ) : null}

          {sourceId && !result?.ok ? (
            <FileChooser
              file={file}
              reading={reading}
              onChoose={choose}
              onRead={() => void read()}
              onRemove={() => {
                reset('File removed.')
                focusChoose()
              }}
              chooseId={chooseId}
            />
          ) : null}

          <p className="goals-upload__status" role="status">
            {status}
          </p>

          {result && !result.ok ? (
            <div className="goals-read-error" role="alert">
              <AlertIcon width={18} height={18} />
              <div>
                <p className="goals-read-error__title">{REASON_MESSAGES[result.reason]}</p>
                {result.missingColumns?.length ? (
                  <p>Missing: {result.missingColumns.join(', ')}.</p>
                ) : null}
                <div className="goals-read-error__actions">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      reset()
                      focusChoose()
                    }}
                  >
                    Choose another file
                  </Button>
                  <Button variant="edit" onClick={() => sourceHeading.current?.focus()}>
                    See how to get your file
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {result?.ok ? (
            <ReadSummary
              result={result}
              onContinue={() => {
                onContinue(result)
                reset()
              }}
              onCancel={() => {
                reset('Nothing was saved.')
                focusChoose()
              }}
            />
          ) : null}
        </>
      )}
    </section>
  )
}
