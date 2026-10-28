import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { fetchAiDraft, fetchAiDrafts } from '../../ai-drafts/api/aiDraftApi'
import {
  courseAnalysisSchema, courseApprovalSchema, courseDraftSchema, courseGenerationRequestSchema, courseStructureSchema,
  type CourseDraftFilters, type CourseGenerationRequest, type CourseStructure,
} from '../types'

const BASE = '/api/content/admin/course-drafts'
const draftPath = (id: string) => `${BASE}/${z.guid().parse(id)}`

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

const FITTING_SETS_MAX_POINTS = 100
const fittingSetsSchema = z.object({ packageIds: z.array(z.guid()) })

/** The ids of the free practice sets that measure any of these knowledge points: the ones that fit a lesson teaching them. */
export async function listFittingPracticeSets(knowledgePointIds: readonly string[], signal?: AbortSignal) {
  if (knowledgePointIds.length === 0) return []
  const query = new URLSearchParams({ knowledgePointIds: knowledgePointIds.slice(0, FITTING_SETS_MAX_POINTS).join(',') })
  return fittingSetsSchema.parse(await apiRequest<unknown>(`${BASE}/practice-sets?${query}`, { auth: true, signal })).packageIds
}

export async function approveCourseDraft(id: string) {
  return courseApprovalSchema.parse(await apiRequest<unknown>(`${draftPath(id)}/approve`, { auth: true, method: 'POST' }))
}

export async function requestCourseDraft(body: CourseGenerationRequest) {
  return courseDraftSchema.parse(await apiRequest<unknown>('/api/content/admin/ai-drafts/courses', { auth: true, method: 'POST', body: courseGenerationRequestSchema.parse(body) }))
}
