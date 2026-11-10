import { describe, expect, it } from 'vitest'
import type { BandAvailabilityOption, BandSkill } from './api/overviewApi'
import { bandAxis, bandPeriod, bandPracticeLink, hasPlacementReference, bandRange, selectBandHistory } from './bandHistoryModel'

const options: BandAvailabilityOption[] = [
  { seriesKind: 'MOCK', skill: 'OVERALL', latestSubmittedAt: '2026-11-09T12:00:00Z' },
  { seriesKind: 'PLACEMENT', skill: 'READING', latestSubmittedAt: '2026-11-08T12:00:00Z' },
  { seriesKind: 'OFFICIAL_PRACTICE', skill: 'WRITING', latestSubmittedAt: '2026-11-07T12:00:00Z' },
  { seriesKind: 'MOCK', skill: 'LISTENING', latestSubmittedAt: '2026-11-06T12:00:00Z' },
]

describe('band history selection', () => {
  it('defaults to the newest individual skill across sources, even when Overall is newer', () => {
    expect(selectBandHistory(options, null, null)).toEqual({ series: 'OFFICIAL_PRACTICE', skill: 'WRITING' })
  })
  it('honors explicit individual selections even without results in this range', () => {
    expect(selectBandHistory([], 'MOCK', 'WRITING')).toEqual({ series: 'MOCK', skill: 'WRITING' })
  })
  it('allows Overall only for the selected source when available', () => {
    expect(selectBandHistory(options, 'MOCK', 'OVERALL')).toEqual({ series: 'MOCK', skill: 'OVERALL' })
    expect(selectBandHistory(options, 'OFFICIAL_PRACTICE', 'OVERALL')).toEqual({ series: 'OFFICIAL_PRACTICE', skill: 'WRITING' })
  })
  it('never selects the placement test as a series, even from an old link', () => {
    expect(selectBandHistory(options, 'PLACEMENT', 'READING')).toEqual({ series: 'OFFICIAL_PRACTICE', skill: 'READING' })
    expect(selectBandHistory(options, 'PLACEMENT', null).series).not.toBe('PLACEMENT')
  })
  it('knows which skills have a placement starting reference', () => {
    expect(['LISTENING', 'READING', 'WRITING'].every((skill) => hasPlacementReference(skill as BandSkill))).toBe(true)
    expect(hasPlacementReference('SPEAKING')).toBe(false)
    expect(hasPlacementReference('OVERALL')).toBe(false)
  })
  it('uses a useful empty default and real practice destinations', () => {
    expect(selectBandHistory([], null, null)).toEqual({ series: 'OFFICIAL_PRACTICE', skill: 'LISTENING' })
    expect(bandPracticeLink('WRITING').to).toBe('/practice-tests?skill=writing')
  })
})

describe('band history rolling ranges', () => {
  it('defaults invalid and absent periods to three months', () => {
    expect(bandPeriod(null)).toBe('3m')
    expect(bandPeriod('month')).toBe('3m')
    expect(bandPeriod('8w')).toBe('8w')
  })
  it.each([
    ['3m', new Date(2026, 4, 31), '2026-02-28', '2026-05-31'],
    ['3m', new Date(2024, 4, 31), '2024-02-29', '2024-05-31'],
    ['6m', new Date(2026, 7, 31), '2026-02-28', '2026-08-31'],
    ['8w', new Date(2026, 0, 10), '2025-11-16', '2026-01-10'],
    ['3m', new Date(2026, 0, 10), '2025-10-10', '2026-01-10'],
  ] as const)('clamps %s correctly at calendar boundaries', (period, now, from, to) => {
    expect(bandRange(period, now)).toEqual({ from, to })
  })
  it.each([new Date(2024, 1, 29), new Date(2025, 1, 28), new Date(2026, 11, 31)])('keeps one year within the inclusive 365-day API limit', (now) => {
    const { from, to } = bandRange('1y', now)
    expect((Date.parse(to) - Date.parse(from)) / 86400000 + 1).toBe(365)
  })
})

describe('band axis', () => {
  it('fits the data in half-band steps instead of spanning 0 to 9', () => {
    const axis = bandAxis([5, 5.5, 6.5])
    expect(axis).toMatchObject({ lo: 4, hi: 7 })
    expect(axis.ticks).toEqual([4, 4.5, 5, 5.5, 6, 6.5, 7])
  })
  it('keeps at least three bands visible for a flat series', () => {
    const axis = bandAxis([6, 6])
    expect(axis.hi - axis.lo).toBeGreaterThanOrEqual(3)
    expect(axis.lo).toBeLessThanOrEqual(6)
    expect(axis.hi).toBeGreaterThanOrEqual(6)
  })
  it('stays inside 0-9 and uses whole-band steps for a wide span', () => {
    const axis = bandAxis([0, 8.5])
    expect(axis).toMatchObject({ lo: 0, hi: 9 })
    expect(axis.ticks).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
  it('includes the target so the goal line is always on the chart', () => {
    expect(bandAxis([5, 6, 8]).hi).toBe(9)
  })
})
