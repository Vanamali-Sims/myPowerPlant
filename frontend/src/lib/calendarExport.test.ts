/**
 * Regression tests for R22 (.ics field sanitisation).
 *
 * Case IDs map to the R22 pentest: 7 attack payloads against the
 * escaped SUMMARY/DESCRIPTION fields, all confirmed safe with a real
 * RFC 5545 parser; 1 confirmed real injection via the unescaped date
 * field, since fixed by assertValidIsoDate.
 */
import { describe, expect, it } from 'vitest'

import { buildIcsFile } from './calendarExport'
import type { ReminderRecommendation } from './reminderForecast'

function entry(overrides: Partial<ReminderRecommendation> = {}): ReminderRecommendation {
  return {
    date: '2026-09-20',
    dayLabel: 'Sunday, 20 September',
    forecastKwh: 42.5,
    typicalKwh: 28.1,
    reason: 'Forecast generation of 42.5 kWh is at least 20% above typical (28.1 kWh).',
    ...overrides,
  }
}

/**
 * unfoldContentLines
 * @param ics - Full .ics text
 * @returns Logical content lines, RFC 5545 folding reversed
 *
 * A naive substring search (e.g. ics.includes('BEGIN:VALARM')) cannot
 * tell "injected as real syntax" apart from "appears as escaped text
 * inside a folded DESCRIPTION value" - unfolding first is what makes
 * the difference visible.
 */
function unfoldContentLines(ics: string): string[] {
  const physical = ics.split('\r\n')
  const logical: string[] = []
  for (const line of physical) {
    if (line.startsWith(' ') && logical.length > 0) {
      logical[logical.length - 1] += line.slice(1)
    } else {
      logical.push(line)
    }
  }
  return logical
}

function countLogicalLine(ics: string, exact: string): number {
  return unfoldContentLines(ics).filter((line) => line === exact).length
}

describe('escapeIcsText via buildIcsFile - injection attempts through reason', () => {
  it('builds a well-formed single event for a normal reason', () => {
    const ics = buildIcsFile([entry()], 'discharge')
    expect(countLogicalLine(ics, 'BEGIN:VEVENT')).toBe(1)
    expect(countLogicalLine(ics, 'END:VEVENT')).toBe(1)
    expect(countLogicalLine(ics, 'BEGIN:VALARM')).toBe(0)
  })

  it('escapes a CRLF calendar-command injection attempt to literal text', () => {
    const attack =
      'Looks safe.\r\nEND:VEVENT\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT15M\r\nEND:VALARM\r\nBEGIN:VEVENT'
    const ics = buildIcsFile([entry({ reason: attack })], 'discharge')
    expect(countLogicalLine(ics, 'BEGIN:VEVENT')).toBe(1)
    expect(countLogicalLine(ics, 'END:VEVENT')).toBe(1)
    expect(countLogicalLine(ics, 'BEGIN:VALARM')).toBe(0)
    expect(countLogicalLine(ics, 'END:VALARM')).toBe(0)
  })

  it('escapes a bare LF injection attempt (no CR) to literal text', () => {
    const attack = 'Looks safe.\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:INJECTED'
    const ics = buildIcsFile([entry({ reason: attack })], 'discharge')
    expect(countLogicalLine(ics, 'BEGIN:VEVENT')).toBe(1)
    expect(countLogicalLine(ics, 'END:VEVENT')).toBe(1)
  })

  it('escapes semicolons and commas rather than letting them break the field', () => {
    const ics = buildIcsFile(
      [entry({ reason: 'reserve; 20%, capped, at 250 kWh' })],
      'discharge',
    )
    const description = unfoldContentLines(ics).find((l) => l.startsWith('DESCRIPTION:'))!
    expect(description).toContain('reserve\\; 20%\\, capped\\, at 250 kWh')
  })

  it('escapes backslashes before other escaping, so it cannot be used to unescape a later character', () => {
    const ics = buildIcsFile([entry({ reason: 'C:\\Users\\test; a value' })], 'discharge')
    const description = unfoldContentLines(ics).find((l) => l.startsWith('DESCRIPTION:'))!
    expect(description).toContain('C:\\\\Users\\\\test\\; a value')
  })

  it('strips control characters rather than passing them through', () => {
    const ics = buildIcsFile(
      [entry({ reason: 'Null byte:\x00 and vertical tab:\x0b here' })],
      'discharge',
    )
    // eslint-disable-next-line no-control-regex -- asserting these are ABSENT
    expect(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(ics)).toBe(false)
  })

  it('folds an oversized reason without any content line exceeding 75 octets', () => {
    const ics = buildIcsFile(
      [entry({ reason: 'A'.repeat(400) + ' end' })],
      'discharge',
    )
    const overLong = ics
      .split('\r\n')
      .filter((line) => !line.startsWith(' ') && Buffer.byteLength(line, 'utf8') > 75)
    expect(overLong).toHaveLength(0)
  })
})

describe('assertValidIsoDate via buildIcsFile - the date field (R22 fix)', () => {
  it('builds normally for a real ISO date', () => {
    expect(() => buildIcsFile([entry({ date: '2026-09-20' })], 'discharge')).not.toThrow()
  })

  it('rejects a CRLF-calendar-injection payload smuggled through the date field', () => {
    const attack =
      '2026-09-27\r\nEND:VEVENT\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT1M\r\nEND:VALARM\r\nX'
    expect(() => buildIcsFile([entry({ date: attack })], 'discharge')).toThrow(
      /invalid date/i,
    )
  })

  it('rejects a non-ISO date format', () => {
    expect(() => buildIcsFile([entry({ date: '27/09/2026' })], 'discharge')).toThrow(
      /invalid date/i,
    )
  })

  it('rejects a value that matches the YYYY-MM-DD shape but is not a real calendar date', () => {
    expect(() => buildIcsFile([entry({ date: '2026-13-45' })], 'discharge')).toThrow(
      /invalid date/i,
    )
  })
})
