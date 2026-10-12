import { useId } from 'react'
import { TEMPLATE_COLUMNS } from '../../constants/batterySources'
import { downloadTemplate } from '../../lib/goals/template'

type Props = {
  id?: string
}

export function GoalsFileGuidePanel({ id }: Props) {
  const fallbackId = useId()
  const panelId = id ?? fallbackId
  return (
    <div id={panelId} className="goals-file-card__guide-panel vpp-example__panel goals-examples__panel">
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
  )
}
