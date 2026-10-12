/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { TUTORIAL_STORAGE_KEY } from '../../constants/storage'
import { clearAllDeviceData } from '../deviceReset'
import { loadTutorialSeen, markTutorialSeen } from '../tutorialStorage'

beforeEach(() => {
  localStorage.clear()
})

describe('tutorialStorage', () => {
  it('starts empty and remembers each flow separately', () => {
    expect(loadTutorialSeen()).toEqual({})
    markTutorialSeen('explore', 'skipped')
    expect(markTutorialSeen('improve', 'done')).toEqual({ explore: 'skipped', improve: 'done' })
    expect(loadTutorialSeen()).toEqual({ explore: 'skipped', improve: 'done' })
  })

  it('ignores corrupt or unknown values', () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '{not json')
    expect(loadTutorialSeen()).toEqual({})
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({ explore: 'maybe', improve: 'done', other: 'done' }))
    expect(loadTutorialSeen()).toEqual({ improve: 'done' })
  })

  it('is cleared by a device reset', () => {
    markTutorialSeen('explore', 'done')
    clearAllDeviceData()
    expect(localStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull()
  })
})
