import { describe, expect, it } from 'vitest'
import type { DictationSegment } from '../api/videoDictationApi'
import type { SegmentStat } from '../hooks/useDictationSession'
import { averageAccuracy, totalAttempts } from './dictationStats'

const segment = (id: string, sequenceNo: number): DictationSegment =>
  ({ id, sequenceNo, startMs: 0, endMs: 1000, transcript: 'x', translationVi: null, ipaWords: ['/ɛks/'] })
const stat = (attempts: number, best: number | null, passed = false): SegmentStat =>
  ({ attempts, bestAccuracyPercent: best, passed })

describe('dictation stats', () => {
  const segments = [segment('a', 1), segment('b', 2), segment('c', 3), segment('d', 4)]

  it('counts sentences that were never typed as 0 in the average', () => {
    const stats = { a: stat(2, 100, true), b: stat(0, null), c: stat(1, 50), d: stat(0, null) }
    expect(averageAccuracy(segments, stats)).toBe(38) // (100 + 0 + 50 + 0) / 4 = 37.5
  })

  it('uses the best accuracy of each sentence, not the last one', () => {
    expect(averageAccuracy([segment('a', 1)], { a: stat(3, 80) })).toBe(80)
  })

  it('has no average without sentences', () => {
    expect(averageAccuracy([], {})).toBeNull()
  })

  it('adds up every attempt', () => {
    expect(totalAttempts({ a: stat(2, 100), b: stat(0, null), c: stat(10, 66.67) })).toBe(12)
  })
})
