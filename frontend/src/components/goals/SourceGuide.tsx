/**
 * Provider picker plus a "How to get your file" disclosure.
 */
import { useId, type Ref } from 'react'
import {
  BATTERY_SOURCES,
  TEMPLATE_COLUMNS,
  type BatterySourceId,
} from '../../constants/batterySources'
import { downloadTemplate } from '../../lib/goals/template'
import { Button } from '../ui/Button'
import { RadioList } from '../ui/RadioList'

type Props = {
  value: BatterySourceId | ''
  onChange: (next: BatterySourceId) => void
  /** Whether "How to get your file" is open; held by the parent so a message can open it. */
  guideOpen: boolean
  onGuideOpenChange: (open: boolean) => void
  /** Id for the "How to get your file" button, so focus can be sent to it. */
  guideToggleId: string
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * SourceGuide
 * @param props.value - Provider Matt chose; files are never matched to a provider automatically
 * @returns Radio group for Tesla or Amber, and a disclosure with the steps and columns
 *
 * The disclosure uses the same button and panel as "How is carbon calculated?".
 */
export function SourceGuide({
  value,
  onChange,
  guideOpen: open,
  onGuideOpenChange,
  guideToggleId,
  headingRef,
}: Props) {
  const panelId = useId()

  return (
    <div className="goals-source">
      <h3 id="goals-source-title" ref={headingRef} tabIndex={-1}>
        Where is your file from?
      </h3>
      <RadioList
        label="VPP provider"
        value={value}
        onChange={onChange}
        options={BATTERY_SOURCES.map((source) => ({ value: source.id, label: source.label }))}
      />

      <div className="vpp-example goals-examples">
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
            <p>Go to your VPP provider app (Tesla or Amber) and download the CSV file.</p>
            <p>
              For the template we use, you can{' '}
              <button type="button" className="goals-source__link" onClick={downloadTemplate}>
                download it here
              </button>
              .
            </p>
            <p className="vpp-example__label goals-source__subtitle">
              Columns your file must contain
            </p>
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
    </div>
  )
}
