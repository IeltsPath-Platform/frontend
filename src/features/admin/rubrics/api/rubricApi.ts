import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { rubricSchema, rubricVersionSchema, type RubricRequest, type WritingTask } from '../types'

export async function fetchActiveRubrics(task: WritingTask, signal?: AbortSignal) {
  return z.array(rubricSchema).parse(await apiRequest<unknown>(`/api/content/rubrics?${new URLSearchParams({ task })}`, { auth: true, signal }))
}
export async function fetchDraftRubrics(task: WritingTask, signal?: AbortSignal) {
  return z.array(rubricSchema).parse(await apiRequest<unknown>(`/api/content/admin/rubrics?${new URLSearchParams({ task })}`, { auth: true, signal }))
}
export async function fetchRubricVersions(code: string, signal?: AbortSignal) {
  return z.array(rubricVersionSchema).parse(await apiRequest<unknown>(`/api/content/admin/rubrics/versions?code=${encodeURIComponent(code)}`, { auth: true, signal }))
}
export async function createRubric(body: RubricRequest) {
  return rubricSchema.parse(await apiRequest<unknown>('/api/content/admin/rubrics', { auth: true, method: 'POST', body }))
}
export async function updateRubric(body: RubricRequest) {
  return rubricSchema.parse(await apiRequest<unknown>(`/api/content/admin/rubrics/${encodeURIComponent(body.code)}/${body.version}`, { auth: true, method: 'PUT', body }))
}
export async function activateRubric(code: string, version: number) {
  return rubricSchema.parse(await apiRequest<unknown>(`/api/content/admin/rubrics/${encodeURIComponent(code)}/${version}/activate`, { auth: true, method: 'POST' }))
}
