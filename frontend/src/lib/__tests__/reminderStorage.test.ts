/**
 * @vitest-environment jsdom
 *
 * Unit tests for the downloaded-reminders list kept on this device.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { REMINDERS_STORAGE_KEY } from '../../constants/storage'
import { addReminders, clearReminders, loadReminders, removeReminder } from '../reminderStorage'

beforeEach(() => {
  localStorage.clear()
})

describe('downloaded reminders', () => {
  it('saves days soonest first and never twice for the same event type', () => {
    addReminders([{ date: '2026-10-20', eventType: 'discharge' }])
    addReminders([
      { date: '2026-10-12', eventType: 'opt_out' },
      { date: '2026-10-20', eventType: 'discharge' },
      { date: '2026-10-20', eventType: 'opt_out' },
    ])
    expect(loadReminders().map((row) => `${row.date} ${row.eventType}`)).toEqual([
      '2026-10-12 opt_out',
      '2026-10-20 discharge',
      '2026-10-20 opt_out',
    ])
  })

  it('removes one day of one event type', () => {
    addReminders([
      { date: '2026-10-20', eventType: 'discharge' },
      { date: '2026-10-20', eventType: 'opt_out' },
    ])
    expect(removeReminder('discharge', '2026-10-20').map((row) => row.eventType)).toEqual(['opt_out'])
  })

  it('drops rows that fail a check and treats corrupt data as empty', () => {
    localStorage.setItem(
      REMINDERS_STORAGE_KEY,
      JSON.stringify([
        { date: '2026-10-20', eventType: 'discharge', savedOn: '2026-10-10T00:00:00.000Z' },
        { date: 'soon', eventType: 'discharge', savedOn: '2026-10-10T00:00:00.000Z' },
        { date: '2026-10-21', eventType: 'party', savedOn: '2026-10-10T00:00:00.000Z' },
      ]),
    )
    expect(loadReminders()).toHaveLength(1)
    localStorage.setItem(REMINDERS_STORAGE_KEY, '{not json')
    expect(loadReminders()).toEqual([])
    clearReminders()
    expect(localStorage.getItem(REMINDERS_STORAGE_KEY)).toBeNull()
  })
})
