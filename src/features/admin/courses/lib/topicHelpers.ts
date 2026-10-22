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
