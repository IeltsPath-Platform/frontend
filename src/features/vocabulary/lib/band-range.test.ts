import { describe, expect, it } from 'vitest'
import { formatBandRange } from './band-range'

describe('formatBandRange', () => {
  it('formats the {min, max} object the API sends', () => {
    expect(formatBandRange({ min: 4, max: 5 })).toBe('4.0–5.0')
    expect(formatBandRange({ min: 5.5, max: 6.5 })).toBe('5.5–6.5')
  })
  it('shows a single value when the range is one band', () => {
    expect(formatBandRange({ min: 7, max: 7 })).toBe('7.0')
  })
  it('passes a ready-made string through and never prints [object Object]', () => {
    expect(formatBandRange('4.0–5.0')).toBe('4.0–5.0')
    expect(String(formatBandRange({ min: 1, max: 2.5 }))).not.toContain('[object')
  })
  it('returns null when there is nothing to show', () => {
    expect(formatBandRange(null)).toBeNull()
    expect(formatBandRange(undefined)).toBeNull()
    expect(formatBandRange('  ')).toBeNull()
    expect(formatBandRange({ min: Number.NaN, max: 5 })).toBeNull()
  })
})
