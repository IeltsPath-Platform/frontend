/** The lesson context carried to a review without fetching the gated lesson again. */
export interface ReviewOrigin {
  lessonId: string
  lessonLabel: string
  topicId: string
  topicTitle: string
  course: { id: string; title: string } | null
}

export interface ReviewNavigationState {
  reviewOrigin?: ReviewOrigin
}

/**
 * What the free practice page needs from the screen that started it; lost on a reload, so every field has a fallback.
 * `backLabel` names the screen `backTo` leads to, such as "Kết quả bài viết"; without it the page leads back to the tree.
 */
export interface FreePracticeNavigationState {
  freePractice?: { pointName: string; pointCode: string; backTo: string; backLabel?: string }
}

/** The learner's knowledge tree of one course, with a "Luyện" button on each point. */
export function knowledgeTreePath(courseId: string) {
  return `/learn/courses/${courseId}/tree`
}

/** One free practice set on a knowledge point. */
export function freePracticePath(attemptId: string) {
  return `/learn/practice/${attemptId}`
}

/** One lesson. */
export function lessonPagePath(lessonId: string) {
  return `/learn/lessons/${lessonId}`
}

/** The page of one topic: its lessons and its test. */
export function topicPagePath(topicId: string) {
  return `/learn/topics/${topicId}`
}

/** A course screen with one of its topics opened, used when stepping back up from that topic. */
export function courseTopicPath(courseId: string, topicId: string) {
  return `/learn/courses/${courseId}?topic=${topicId}`
}
