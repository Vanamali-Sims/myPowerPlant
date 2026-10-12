/**
 * Rows from a battery file that could not be used, first five then the rest.
 */
import { useId, useState } from 'react'
import { ROW_PROBLEM_MESSAGES } from '../../constants/goalMessages'
import type { RowProblem } from '../../lib/goals/adapters/types'
import { formatDayLabel } from '../../lib/goals/goalFormat'
import { Button } from '../ui/Button'

const FIRST_SHOWN = 5

type Props = {
  problems: RowProblem[]
  /** Every problem found, which can be more than the list kept. */
  total: number
}

function describe(problem: RowProblem): string {
  const when = problem.date ? `, ${formatDayLabel(problem.date)}` : ''
  return `Line ${problem.line}${when}: ${ROW_PROBLEM_MESSAGES[problem.code]}`
}

/**
 * ProblemList
 * @param props.problems - Problems kept from the file, in line order
 * @returns The first five, a count, and a button that shows the rest
 *
 * Nothing here is corrected or guessed; it only says what was found.
 */
export function ProblemList({ problems, total }: Props) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const shown = open ? problems : problems.slice(0, FIRST_SHOWN)
  const hidden = total - FIRST_SHOWN
  return (
    <div className="goals-problems">
      <p>
        {total === 1 ? '1 row has a problem:' : `${total} rows have problems:`}
      </p>
      <ul id={listId}>
        {shown.map((problem) => (
          <li key={`${problem.line}-${problem.code}`}>{describe(problem)}</li>
        ))}
      </ul>
      {open && total > problems.length ? (
        <p>Showing the first {problems.length} of {total}.</p>
      ) : null}
      {hidden > 0 ? (
        <Button
          variant="edit"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((state) => !state)}
        >
          {open ? 'Show fewer' : `Show ${hidden} more`}
        </Button>
      ) : null}
    </div>
  )
}
