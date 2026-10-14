import type { LessonSummary } from '~types/learningPath'

/** Whether the lesson has Practice the learner must pass; such a lesson completes when that Practice passes. */
export function hasRequiredPractice(lesson: Pick<LessonSummary, 'practiceStatus' | 'practicePassReason'>): boolean {
  return lesson.practiceStatus != null && lesson.practicePassReason !== 'NO_PRACTICE'
}

export function lessonPath(lessonId: string): string {
  return `/learn/lessons/${lessonId}`
}

/** The Practice is a part of the lesson page, like its summary and documents. */
export function lessonPracticePath(lessonId: string): string {
  return `/learn/lessons/${lessonId}?view=practice`
}
