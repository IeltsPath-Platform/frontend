import { describe, expect, it } from 'vitest'
import type { WritingProgressPoint, WritingRecurringError } from './api/writingProgressApi'
import { chartPoints, errorShare, linePath, shownErrors } from './writingProgressModel'

const point = (band: number, promptVersion: string | null): WritingProgressPoint => ({
  submissionId: `${band}-${promptVersion}`,
  source: 'LESSON',
  gradedAt: '2026-11-01T10:00:00Z',
  overallBand: band,
  criteria: {},
  promptVersion,
})

describe('chartPoints', () => {
  it('spreads essays oldest-left and maps bands 0–9 onto the height', () => {
    const chart = chartPoints([point(0, 'v1'), point(9, 'v1')], 100, 90)

    expect(chart.map((item) => [item.x, item.y])).toEqual([[0, 90], [100, 0]])
  })

  it('marks the first essay after a prompt version change only', () => {
    const chart = chartPoints([point(5, 'v1'), point(5.5, 'v1'), point(6, 'v2')], 100, 90)

    expect(chart.map((item) => item.promptChanged)).toEqual([false, false, true])
  })

  it('returns nothing for an empty list and puts a single essay at the left edge', () => {
    expect(chartPoints([], 100, 90)).toEqual([])
    expect(chartPoints([point(6, 'v1')], 100, 90)[0].x).toBe(0)
  })
})

describe('linePath', () => {
  it('joins the points with a move then lines', () => {
    expect(linePath(chartPoints([point(0, 'v1'), point(9, 'v1')], 100, 90))).toBe('M0 90 L100 0')
  })
})

describe('errorShare', () => {
  it('reads as essays with the error out of essays in the window', () => {
    expect(errorShare({ essaysWithError: 3, essaysTotal: 5 })).toBe('3/5 bài')
  })
})

describe('shownErrors', () => {
  it('keeps the first five errors the API ordered', () => {
    const errors = Array.from({ length: 8 }, (_, index) => ({ errorCode: `E${index}` }) as WritingRecurringError)

    expect(shownErrors(errors).map((error) => error.errorCode)).toEqual(['E0', 'E1', 'E2', 'E3', 'E4'])
  })
})
