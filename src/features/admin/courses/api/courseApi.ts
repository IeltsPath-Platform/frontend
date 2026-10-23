import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { courseSchema, topicSchema, type CourseCreate, type CourseUpdate, type TopicCreate, type TopicUpdate } from '../types'

export async function fetchCourses(signal?: AbortSignal) {
  return z.array(courseSchema).parse(await apiRequest<unknown>('/api/content/courses', { auth: true, signal }))
}
export async function createCourse(body: CourseCreate) {
  return courseSchema.parse(await apiRequest<unknown>('/api/content/admin/courses', { auth: true, method: 'POST', body }))
}
export async function updateCourse(id: string, body: CourseUpdate) {
  return courseSchema.parse(await apiRequest<unknown>(`/api/content/admin/courses/${id}`, { auth: true, method: 'PUT', body }))
}
export async function createTopic(body: TopicCreate) {
  return topicSchema.parse(await apiRequest<unknown>('/api/content/admin/topics', { auth: true, method: 'POST', body }))
}
export async function updateTopic(id: string, body: TopicUpdate) {
  return topicSchema.parse(await apiRequest<unknown>(`/api/content/admin/topics/${id}`, { auth: true, method: 'PUT', body }))
}
/** Puts every topic of one parent (the top-level topics when null) in a new order in one transaction. */
export async function reorderTopics(parentTopicId: string | null, topicIds: string[]) {
  await apiRequest<unknown>('/api/content/admin/topics/order', { auth: true, method: 'PUT', body: { parentTopicId, topicIds } })
}
