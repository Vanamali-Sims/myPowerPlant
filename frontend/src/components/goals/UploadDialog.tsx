/**
 * "Upload this month's file" dialog: drop or browse for a CSV, read it on this
 * device, then show what it adds before "Update my goals".
 *
 * The file is read as soon as it is chosen. Every VPP provider app's export
 * uses the same template layout, so the person is never asked which one.
 */
import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { TEMPLATE_COLUMNS } from '../../constants/batterySources'
import { GOALS_UPLOAD } from '../../constants/goals'
import type { MessageCode } from '../../constants/goalMessages'
import type { ReadLimits, ReadResult } from '../../lib/goals/adapters/types'
import { formatDayLabel, formatRangeLabel } from '../../lib/goals/goalFormat'
import { readBatteryFileAuto } from '../../lib/goals/readBatteryFile'
import { downloadTemplate } from '../../lib/goals/template'
import { Button } from '../ui/Button'
import { CloseIcon, LockIcon } from '../ui/icons'
import { BatteryCsvIllustration } from './BatteryCsvIllustration'
import { GoalMessage } from './GoalMessage'
import { ProblemList } from './ProblemList'
import type { ReadDays } from './UploadArea'

type Props = {
  open: boolean
  /** null while the estimate data loads; files cannot be checked without it. */
  limits: ReadLimits | null
  /** Called with the days once a file is read. */
  onRead: (read: ReadDays) => void
  /** Called when the chosen file is removed, so the parent drops its read. */
  onClearFile: () => void
  onClose: () => void
  onConfirm: () => void
  /** True when there are new days to save. */
  canConfirm: boolean
  saveError: MessageCode | null
  /** Summary and notices for the file, from the parent. */
  children?: ReactNode
}

function dayWord(count: number): string {
  return count === 1 ? '1 day' : `${count} days`
}

/**
 * UploadDialog
 * @param props.open - Whether the dialog is showing
 * @param props.onRead - Receives the days from a file that was read
 * @returns A native modal dialog with the drop zone, file chip, and actions
 */
export function UploadDialog({
  open,
  limits,
  onRead,
  onClearFile,
  onClose,
  onConfirm,
  canConfirm,
  saveError,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputId = useId()
  const guideId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [reading, setReading] = useState(false)
  const [result, setResult] = useState<ReadResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const readToken = useRef(0)

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return
    if (open) {
      if (!node.open) node.showModal()
    } else if (node.open) {
      node.close()
    }
  }, [open])

  function reset() {
    readToken.current += 1
    setFile(null)
    setReading(false)
    setResult(null)
  }

  function close() {
    reset()
    setGuideOpen(false)
    onClose()
  }

  async function read(next: File) {
    if (!limits) return
    const token = (readToken.current += 1)
    setReading(true)
    setResult(null)
    const outcome = await readBatteryFileAuto(next, limits)
    if (token !== readToken.current) return
    setReading(false)
    setResult(outcome)
    if (outcome.ok) onRead(outcome)
  }

  function choose(next: File) {
    onClearFile()
    setFile(next)
    setResult(null)
    void read(next)
  }

  function removeFile() {
    reset()
    onClearFile()
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) choose(dropped)
  }

  const ok = result?.ok ? result : null
  const failed = result && !result.ok ? result : null

  return (
    <dialog
      ref={dialogRef}
      className="vpp-dialog upload-dialog"
      aria-labelledby="upload-dialog-title"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close()
      }}
    >
      {open ? (
        <div className="vpp-dialog__panel upload-dialog__panel">
          <header className="upload-dialog__head">
            <div>
              <h2 id="upload-dialog-title">{GOALS_UPLOAD.title}</h2>
              <p>{GOALS_UPLOAD.lede}</p>
            </div>
            <button type="button" className="upload-dialog__close" aria-label="Close" onClick={close}>
              <CloseIcon width={16} height={16} />
            </button>
          </header>

          {!limits ? (
            <GoalMessage code="estimates_unavailable" details={<p>Files can be read once the estimate data loads.</p>} />
          ) : file ? (
            <div className="upload-file">
              <span className="upload-file__badge" aria-hidden="true">
                CSV
              </span>
              <div className="upload-file__copy">
                <p className="upload-file__name">{file.name}</p>
                <p className="upload-file__meta" role="status">
                  {reading
                    ? 'Reading on this device…'
                    : ok
                      ? `✓ File read · ${formatRangeLabel([
                          ok.days[0].date,
                          ok.days[ok.days.length - 1].date,
                        ])} · ${dayWord(ok.days.length)}`
                      : failed
                        ? 'This file could not be read.'
                        : ''}
                </p>
              </div>
              <button type="button" className="upload-file__remove" aria-label={`Remove ${file.name}`} onClick={removeFile}>
                <CloseIcon width={14} height={14} />
              </button>
            </div>
          ) : null}

          <input
            id={inputId}
            className="visually-hidden upload-dialog__input"
            type="file"
            accept=".csv,text/csv"
            tabIndex={file || !limits ? -1 : undefined}
            onChange={(event) => {
              const chosen = event.target.files?.[0]
              event.target.value = ''
              if (chosen) choose(chosen)
            }}
          />
          {limits && !file ? (
            // Same drop area as the first Goals visit, scaled down for the dialog.
            <label
              htmlFor={inputId}
              className={`goals-file-card__drop upload-dialog__drop${dragging ? ' goals-file-card__drop--active' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <BatteryCsvIllustration />
              <span className="goals-file-card__drop-title">{GOALS_UPLOAD.drop}</span>
              <span className="goals-file-card__drop-browse">
                or <span className="goals-file-card__drop-link">{GOALS_UPLOAD.browse}</span>
              </span>
              <span className="goals-file-card__format-hint">{GOALS_UPLOAD.hint}</span>
            </label>
          ) : null}

          {failed ? (
            <GoalMessage
              code={failed.reason}
              details={
                failed.missingColumns?.length ? (
                  <p>Missing: {failed.missingColumns.join(', ')}.</p>
                ) : failed.rowProblemCount ? (
                  <ProblemList problems={failed.rowProblems ?? []} total={failed.rowProblemCount} />
                ) : null
              }
            />
          ) : null}

          {ok && ok.rowProblemCount ? (
            <GoalMessage
              code="invalid_rows"
              details={
                <>
                  <ProblemList problems={ok.rowProblems} total={ok.rowProblemCount} />
                  {ok.problemDays.length ? (
                    <p>
                      Days left out ({ok.problemDays.length}): {ok.problemDays.map(formatDayLabel).join(', ')}.
                    </p>
                  ) : null}
                </>
              }
            />
          ) : null}

          {ok && ok.incompleteDays.length ? (
            <p className="upload-dialog__note">
              {dayWord(ok.incompleteDays.length)} left out because some intervals are missing. They can be counted
              when a later file has the rest.
            </p>
          ) : null}

          {ok ? children : null}

          {saveError ? <GoalMessage code={saveError} /> : null}

          <div className="goals-file-card__footer upload-dialog__links">
            <p className="goals-file-card__privacy">
              <LockIcon width={16} height={16} aria-hidden />
              <span>{GOALS_UPLOAD.privacy}</span>
            </p>
            <button
              type="button"
              className="goals-file-card__guide"
              aria-expanded={guideOpen}
              aria-controls={guideId}
              onClick={() => setGuideOpen((state) => !state)}
            >
              {GOALS_UPLOAD.guide}
            </button>
          </div>
          {guideOpen ? (
            <div id={guideId} className="goals-file-card__guide-panel vpp-example__panel goals-examples__panel">
              <p>Download the CSV file from your VPP provider app.</p>
              <p>
                It needs these columns, as in our{' '}
                <button type="button" className="goals-source__link" onClick={downloadTemplate}>
                  template
                </button>
                :
              </p>
              <ul>
                {TEMPLATE_COLUMNS.map((column) => (
                  <li key={column.name}>
                    <code>{column.name}</code> ({column.required ? 'required' : 'optional'})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <footer className="upload-dialog__actions">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!canConfirm || !ok || reading} onClick={onConfirm}>
              {GOALS_UPLOAD.confirm}
            </Button>
          </footer>
        </div>
      ) : null}
    </dialog>
  )
}
