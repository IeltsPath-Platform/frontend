import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import {
  courseSchema,
  knowledgeTreeHealthSchema,
  knowledgeTreeSchema,
  type CourseOption,
  type KnowledgeTree,
  type KnowledgeTreeHealth,
} from '../types'

export interface KnowledgeTreeQuery {
  courseId?: string
  skill?: string
  includeInactive?: boolean
}

export async function fetchKnowledgeTree(query: KnowledgeTreeQuery, signal?: AbortSignal): Promise<KnowledgeTree> {
  const params = new URLSearchParams()
  if (query.courseId) params.set('courseId', query.courseId)
  if (query.skill) params.set('skill', query.skill)
  if (query.includeInactive) params.set('includeInactive', 'true')
  const suffix = params.size > 0 ? `?${params}` : ''
  return knowledgeTreeSchema.parse(await apiRequest<unknown>(`/api/content/knowledge-tree${suffix}`, { auth: true, signal }))
}

export async function fetchKnowledgeTreeHealth(signal?: AbortSignal): Promise<KnowledgeTreeHealth> {
  return knowledgeTreeHealthSchema.parse(
    await apiRequest<unknown>('/api/content/knowledge-tree/health', { auth: true, signal }),
  )
}

export async function fetchCourses(signal?: AbortSignal): Promise<CourseOption[]> {
  return z.array(courseSchema).parse(await apiRequest<unknown>('/api/content/courses', { auth: true, signal }))
}
