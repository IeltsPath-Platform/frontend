import type { DictationSegment } from '../api/videoDictationApi'
import type { SegmentStat } from '../hooks/useDictationSession'

/**
 * Average accuracy of the whole video, in whole percent: each sentence counts with the best accuracy the learner
 * reached on it, and a sentence never typed counts as 0, so skipping sentences lowers the number.
 * Null when the video has no sentences.
 */
export function averageAccuracy(segments: DictationSegment[], stats: Record<string, SegmentStat>): number | null {
  if (segments.length === 0) return null
  const sum = segments.reduce((total, segment) => total + (stats[segment.id]?.bestAccuracyPercent ?? 0), 0)
  return Math.round(sum / segments.length)
}

/** Every time the learner pressed "Kiểm tra" on this video, earlier visits included. */
export function totalAttempts(stats: Record<string, SegmentStat>): number {
  return Object.values(stats).reduce((sum, stat) => sum + stat.attempts, 0)
}
