import type { LessonSummary } from '~types/learningPath'

/**
 * Total planned minutes of a topic's lessons, or 0 when any lesson has no duration: a partial sum would understate
 * the topic, so callers show nothing instead.
 */
export function totalLessonMinutes(lessons: Pick<LessonSummary, 'estimatedMinutes'>[]): number {
  let total = 0
  for (const lesson of lessons) {
    if (!lesson.estimatedMinutes) return 0
    total += lesson.estimatedMinutes
  }
  return total
}
