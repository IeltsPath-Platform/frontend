import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { fetchAiDraft, fetchAiDrafts } from '../../ai-drafts/api/aiDraftApi'
import {
  courseAnalysisSchema, courseApprovalSchema, courseDraftSchema, courseGenerationRequestSchema, courseStructureSchema,
  type CourseDraftFilters, type CourseGenerationRequest, type CourseStructure,
} from '../types'

const BASE = '/api/content/admin/course-drafts'
const draftPath = (id: string) => `${BASE}/${z.uuid().parse(id)}`

export async function listCourseDrafts(filters: CourseDraftFilters = {}, signal?: AbortSignal) {
  return z.array(courseDraftSchema).parse(await fetchAiDrafts({ ...filters, kind: 'COURSE' }, signal))
}

export async function getCourseDraft(id: string, signal?: AbortSignal) {
  return courseDraftSchema.parse(await fetchAiDraft(id, signal))
}

export async function createCourseDraft(structure?: CourseStructure) {
  const body = structure === undefined ? undefined : { structure: courseStructureSchema.parse(structure) }
  return courseDraftSchema.parse(await apiRequest<unknown>(BASE, { auth: true, method: 'POST', body }))
}

export async function saveCourseDraft(id: string, structure: CourseStructure) {
  return courseDraftSchema.parse(await apiRequest<unknown>(draftPath(id), { auth: true, method: 'PUT', body: { structure: courseStructureSchema.parse(structure) } }))
}

export async function analyzeCourseDraft(id: string, signal?: AbortSignal) {
  return courseAnalysisSchema.parse(await apiRequest<unknown>(`${draftPath(id)}/analysis`, { auth: true, signal }))
}

export async function approveCourseDraft(id: string) {
  return courseApprovalSchema.parse(await apiRequest<unknown>(`${draftPath(id)}/approve`, { auth: true, method: 'POST' }))
}

export async function requestCourseDraft(body: CourseGenerationRequest) {
  return courseDraftSchema.parse(await apiRequest<unknown>('/api/content/admin/ai-drafts/courses', { auth: true, method: 'POST', body: courseGenerationRequestSchema.parse(body) }))
}
