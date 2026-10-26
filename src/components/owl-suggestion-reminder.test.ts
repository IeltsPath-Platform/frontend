import { afterEach, describe, expect, it, vi } from 'vitest'
import { localDay, readRemindedDay, writeRemindedDay } from './owl-suggestion-reminder'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('localDay', () => {
  it('uses the local calendar day with zero padding', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(localDay(new Date(2026, 9, 26, 0, 1))).toBe('2026-10-26')
  })
})

describe('reminded day', () => {
  it('is empty until the owl writes it, then returns what it wrote', () => {
    expect(readRemindedDay()).toBeNull()
    writeRemindedDay('2026-10-26')
    expect(readRemindedDay()).toBe('2026-10-26')
  })

  it('treats blocked storage as never reminded and does not throw on write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readRemindedDay()).toBeNull()
    expect(() => writeRemindedDay('2026-10-26')).not.toThrow()
  })
})
