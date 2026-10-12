/**
 * "How to get your file" disclosure: where the CSV comes from, the template,
 * and the columns it needs.
 */
import { useId } from 'react'
import { TEMPLATE_COLUMNS } from '../../constants/batterySources'
import { downloadTemplate } from '../../lib/goals/template'
import { Button } from '../ui/Button'

type Props = {
  /** Whether the panel is open; held by the parent so a message can open it. */
  guideOpen: boolean
  onGuideOpenChange: (open: boolean) => void
  /** Id for the "How to get your file" button, so focus can be sent to it. */
  guideToggleId: string
}

/**
 * FileGuide
 * @returns A disclosure with the steps and columns
 *
 * The disclosure uses the same button and panel as "How is carbon calculated?".
 */
export function FileGuide({ guideOpen: open, onGuideOpenChange, guideToggleId }: Props) {
  const panelId = useId()

  return (
    <div className="vpp-example goals-examples goals-file-guide">
      <Button
        id={guideToggleId}
        variant="outline-accent"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onGuideOpenChange(!open)}
      >
        How to get your file
      </Button>
      {open ? (
        <div id={panelId} className="vpp-example__panel goals-examples__panel">
          <p>Go to your VPP provider app and download the CSV file.</p>
          <p>
            For the template we use, you can{' '}
            <button type="button" className="goals-source__link" onClick={downloadTemplate}>
              download it here
            </button>
            .
          </p>
          <p className="vpp-example__label goals-source__subtitle">Columns your file must contain</p>
          <ul className="goals-examples__list goals-source__columns">
            {TEMPLATE_COLUMNS.map((column) => (
              <li key={column.name}>
                <code>{column.name}</code> ({column.required ? 'required' : 'optional'}):{' '}
                {column.description}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
