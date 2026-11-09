import { describe, expect, it } from 'vitest'
import type { BandAvailabilityOption } from './api/overviewApi'
import { bandPeriod, bandPracticeLink, bandRange, selectBandHistory } from './bandHistoryModel'

const options: BandAvailabilityOption[] = [
  { seriesKind: 'MOCK', skill: 'OVERALL', latestSubmittedAt: '2026-11-09T12:00:00Z' },
  { seriesKind: 'PLACEMENT', skill: 'READING', latestSubmittedAt: '2026-11-08T12:00:00Z' },
  { seriesKind: 'OFFICIAL_PRACTICE', skill: 'WRITING', latestSubmittedAt: '2026-11-07T12:00:00Z' },
  { seriesKind: 'MOCK', skill: 'LISTENING', latestSubmittedAt: '2026-11-06T12:00:00Z' },
]

describe('band history selection', () => {
  it('defaults to the newest individual skill across sources, even when Overall is newer', () => {
    expect(selectBandHistory(options, null, null)).toEqual({ series: 'PLACEMENT', skill: 'READING' })
  })
  it('honors explicit individual selections even without results in this range', () => {
    expect(selectBandHistory([], 'MOCK', 'WRITING')).toEqual({ series: 'MOCK', skill: 'WRITING' })
  })
  it('allows Overall only for the selected source when available', () => {
    expect(selectBandHistory(options, 'MOCK', 'OVERALL')).toEqual({ series: 'MOCK', skill: 'OVERALL' })
    expect(selectBandHistory(options, 'OFFICIAL_PRACTICE', 'OVERALL')).toEqual({ series: 'OFFICIAL_PRACTICE', skill: 'WRITING' })
  })
  it.each(['SPEAKING', 'OVERALL'])('falls back to an available placement skill for %s', (skill) => {
    expect(selectBandHistory(options, 'PLACEMENT', skill)).toEqual({ series: 'PLACEMENT', skill: 'READING' })
  })
  it('uses a useful empty default and real practice destinations', () => {
    expect(selectBandHistory([], null, null)).toEqual({ series: 'OFFICIAL_PRACTICE', skill: 'LISTENING' })
    expect(bandPracticeLink('PLACEMENT', 'READING').to).toBe('/learn/placement')
    expect(bandPracticeLink('OFFICIAL_PRACTICE', 'WRITING').to).toBe('/practice-tests?skill=writing')
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
