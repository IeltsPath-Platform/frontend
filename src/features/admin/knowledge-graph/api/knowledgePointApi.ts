import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { knowledgePointSchema, type KnowledgePoint, type KnowledgePointRequest } from '../types'

const BASE = '/api/content/knowledge-points'

/** The points of one topic, or every point when no topic is given. */
export async function fetchKnowledgePoints(topicId: string | null | undefined, signal?: AbortSignal): Promise<KnowledgePoint[]> {
  const suffix = topicId ? `?topicId=${encodeURIComponent(topicId)}` : ''
  return z.array(knowledgePointSchema).parse(await apiRequest<unknown>(`${BASE}${suffix}`, { auth: true, signal }))
}

export async function fetchPrerequisites(id: string, signal?: AbortSignal): Promise<KnowledgePoint[]> {
  return z.array(knowledgePointSchema).parse(await apiRequest<unknown>(`${BASE}/${id}/prerequisites`, { auth: true, signal }))
}

export async function createKnowledgePoint(request: KnowledgePointRequest): Promise<KnowledgePoint> {
  return knowledgePointSchema.parse(await apiRequest<unknown>(BASE, { method: 'POST', auth: true, body: request }))
}

export async function updateKnowledgePoint(id: string, request: KnowledgePointRequest): Promise<KnowledgePoint> {
  return knowledgePointSchema.parse(await apiRequest<unknown>(`${BASE}/${id}`, { method: 'PUT', auth: true, body: request }))
}

export async function replacePrerequisites(id: string, prerequisiteIds: string[]): Promise<void> {
  await apiRequest<unknown>(`${BASE}/${id}/prerequisites`, { method: 'PUT', auth: true, body: { prerequisiteIds } })
}

export async function deactivateKnowledgePoint(id: string): Promise<void> {
  await apiRequest<unknown>(`${BASE}/${id}`, { method: 'DELETE', auth: true })
}

export async function activateKnowledgePoint(id: string): Promise<void> {
  await apiRequest<unknown>(`${BASE}/${id}/activate`, { method: 'POST', auth: true })
}
