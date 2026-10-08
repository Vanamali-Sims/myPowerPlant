/**
 * @vitest-environment jsdom
 *
 * Tests for the message catalogue and the shared message component (US8.7 AC1, AC6).
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  GOAL_MESSAGES,
  ROW_PROBLEM_MESSAGES,
  SEVERITY_LABELS,
  type MessageCode,
} from '../../constants/goalMessages'
import { GoalMessage } from './GoalMessage'

afterEach(() => {
  cleanup()
})

const codes = Object.keys(GOAL_MESSAGES) as MessageCode[]

describe('message catalogue (AC6)', () => {
  it.each(codes)('%s has a severity, a plain title, and a next step', (code) => {
    const spec = GOAL_MESSAGES[code]
    expect(['error', 'warning', 'info']).toContain(spec.severity)
    expect(spec.title.length).toBeGreaterThan(10)
    expect(spec.nextStep.length).toBeGreaterThan(10)
    for (const text of [spec.title, spec.nextStep]) {
      expect(text).not.toMatch(/[—–]/)
      expect(text).not.toMatch(/\b(you failed|your fault|invalid input|error code)\b/i)
    }
  })

  it('covers every reason a file can be rejected or a save can fail', () => {
    for (const code of [
      'not_csv',
      'empty_file',
      'file_too_large',
      'unreadable',
      'malformed_csv',
      'missing_columns',
      'no_rows',
      'mixed_intervals',
      'no_complete_days',
      'source_not_supported',
      'estimates_unavailable',
      'storage_full',
      'write_failed',
    ] as const) {
      expect(GOAL_MESSAGES[code].severity).toBe('error')
    }
    expect(GOAL_MESSAGES.file_too_large.nextStep).toContain('single month')
  })

  it('has a plain message for every row problem', () => {
    for (const message of Object.values(ROW_PROBLEM_MESSAGES)) {
      expect(message.length).toBeGreaterThan(10)
      expect(message).not.toMatch(/[—–]/)
    }
  })
})

describe('shared message component (AC6)', () => {
  it('announces errors as alerts with the severity in words and the next step', () => {
    render(<GoalMessage code="not_csv" details={<p>battery.xlsx</p>} />)
    const message = screen.getByRole('alert')
    expect(message.textContent).toContain(`${SEVERITY_LABELS.error}: ${GOAL_MESSAGES.not_csv.title}`)
    expect(message.textContent).toContain('battery.xlsx')
    expect(message.textContent).toContain(`What to do next: ${GOAL_MESSAGES.not_csv.nextStep}`)
    expect(message.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it.each(['missing_days', 'already_counted'] as const)(
    'uses a polite status for %s',
    (code) => {
      render(<GoalMessage code={code} />)
      const message = screen.getByRole('status')
      expect(message.textContent).toContain(`${SEVERITY_LABELS[GOAL_MESSAGES[code].severity]}:`)
      expect(screen.queryByRole('alert')).toBeNull()
    },
  )
})
