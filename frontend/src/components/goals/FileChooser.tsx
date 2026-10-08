/**
 * Choose or drop a battery file, then read it or remove it.
 */
import { useRef, useState, type DragEvent } from 'react'
import { formatFileSize } from '../../lib/goals/goalFormat'
import { Button } from '../ui/Button'

type Props = {
  file: File | null
  reading: boolean
  onChoose: (file: File) => void
  onRead: () => void
  onRemove: () => void
  /** Id for the Choose file button, so focus can return to it. */
  chooseId: string
}

/**
 * FileChooser
 * @param props.file - The chosen file, held in component state only
 * @returns Drop zone, an always-available Choose file button, and Read file / Remove
 *
 * Choosing a file does not read it. Nothing is read until Read file is selected.
 */
export function FileChooser({ file, reading, onChoose, onRead, onRemove, chooseId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) onChoose(dropped)
  }

  return (
    <div className="goals-file">
      <div
        className={`goals-file__drop${dragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p className="goals-file__drop-text">Drag your CSV file here, or</p>
        <Button id={chooseId} variant="secondary" onClick={() => inputRef.current?.click()}>
          Choose file
        </Button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".csv,text/csv"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const chosen = event.target.files?.[0]
            event.target.value = ''
            if (chosen) onChoose(chosen)
          }}
        />
      </div>

      {file ? (
        <div className="goals-file__chosen">
          <p className="goals-file__name">
            <span className="goals-file__label">Chosen file:</span> {file.name}{' '}
            <span className="goals-file__size">({formatFileSize(file.size)})</span>
          </p>
          <div className="goals-file__actions">
            <Button variant="primary" onClick={onRead} disabled={reading}>
              Read file
            </Button>
            <Button variant="secondary" onClick={onRemove} disabled={reading}>
              Remove
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
