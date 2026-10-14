/** The page of one topic: its lessons and its test. */
export function topicPagePath(topicId: string) {
  return `/learn/topics/${topicId}`
}

/** A course screen with one of its topics opened, used when stepping back up from that topic. */
export function courseTopicPath(courseId: string, topicId: string) {
  return `/learn/courses/${courseId}?topic=${topicId}`
}
