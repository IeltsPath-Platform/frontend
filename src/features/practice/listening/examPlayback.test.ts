import { beforeEach, describe, expect, it } from 'vitest'
import { readPlayedSections, writePlayedSections } from './examPlayback'

describe('examPlayback', () => {
  beforeEach(() => window.localStorage.clear())

  it('remembers which parts of an attempt were played', () => {
    expect(readPlayedSections('attempt-1').size).toBe(0)

    writePlayedSections('attempt-1', new Set(['part-1', 'part-2']))

    expect([...readPlayedSections('attempt-1')]).toEqual(['part-1', 'part-2'])
  })

  it('keeps each attempt apart', () => {
    writePlayedSections('attempt-1', new Set(['part-1']))

    expect(readPlayedSections('attempt-2').size).toBe(0)
  })

  it('treats a damaged entry as nothing played', () => {
    window.localStorage.setItem('listening-played:attempt-1', '{not json')
    expect(readPlayedSections('attempt-1').size).toBe(0)

    window.localStorage.setItem('listening-played:attempt-1', '"part-1"')
    expect(readPlayedSections('attempt-1').size).toBe(0)
  })
})
