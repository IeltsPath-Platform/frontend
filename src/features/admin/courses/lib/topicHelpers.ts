import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrors'
import type { TopicOption } from '../../lessons/types'
import type { Course, TopicCreate, TopicUpdate } from '../types'

export function topicError(reason: unknown) {
  return adminErrorCode(reason) === 'TOPIC_SKILL_LOCKED' ? 'Chủ đề đã có bài xuất bản, không đổi kỹ năng được' : adminErrorMessage(reason)
}

export function topicUpdate(topic: TopicOption): TopicUpdate {
  return { parentTopicId: topic.parentTopicId ?? null, name: topic.name, sortOrder: topic.sortOrder,
    status: topic.status as Course['status'], bandMin: topic.bandMin ?? null, bandMax: topic.bandMax ?? null,
    skill: topic.skill as TopicCreate['skill'], courseId: topic.courseId }
}

/**
 * The ids of every topic that shares the topic's parent, in display order, with the topic and its neighbour swapped.
 * The view may show only one course, so the group comes from all topics: the server needs the whole group.
 */
export function swappedGroup(allTopics: readonly TopicOption[], topic: TopicOption, sibling: TopicOption): string[] {
  const group = allTopics
    .filter((item) => (item.parentTopicId ?? null) === (topic.parentTopicId ?? null))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    .map((item) => item.id)
  const first = group.indexOf(topic.id)
  const second = group.indexOf(sibling.id)
  if (first < 0 || second < 0) return group
  group[first] = sibling.id
  group[second] = topic.id
  return group
}

function bandNumber(value: number) { return value.toFixed(1) }

/** The band range of a topic in words: "Mọi band" when it has no limit, "Từ 5.0", "Đến 6.5" or "5.0 – 6.5". */
export function bandText(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return 'Mọi band'
  if (min != null && max != null) return min === max ? `Band ${bandNumber(min)}` : `${bandNumber(min)} – ${bandNumber(max)}`
  return min != null ? `Từ ${bandNumber(min)}` : `Đến ${bandNumber(max!)}`
}
