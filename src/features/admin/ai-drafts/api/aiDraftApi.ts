import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import {
  aiDraftListSchema,
  aiDraftQuerySchema,
  aiDraftSchema,
  rejectAiDraftRequestSchema,
  approveQuestionDraftRequestSchema,
  questionDraftSchema,
  questionGenerationRequestSchema,
  questionDraftItemPatchSchema,
  type AiDraft,
  type AiDraftQuery,
  type RejectAiDraftRequest,
  type ApproveQuestionDraftRequest,
  type QuestionDraft,
  type QuestionGenerationRequest,
  type QuestionDraftItemPatch,
} from '../types'

const ADMIN = '/api/content/admin/ai-drafts'

export async function fetchAiDrafts(query: AiDraftQuery = {}, signal?: AbortSignal): Promise<AiDraft[]> {
  const parsed = aiDraftQuerySchema.parse(query)
  const params = new URLSearchParams()
  if (parsed.kind !== undefined) params.set('kind', parsed.kind)
  if (parsed.status !== undefined) params.set('status', parsed.status)
  if (parsed.page !== undefined) params.set('page', String(parsed.page))
  if (parsed.size !== undefined) params.set('size', String(parsed.size))
  const suffix = params.size ? `?${params}` : ''
  return aiDraftListSchema.parse(await apiRequest<unknown>(`${ADMIN}${suffix}`, { auth: true, signal }))
}

export async function fetchAiDraft(id: string, signal?: AbortSignal): Promise<AiDraft> {
  const draftId = z.uuid().parse(id)
  return aiDraftSchema.parse(await apiRequest<unknown>(`${ADMIN}/${draftId}`, { auth: true, signal }))
}

export async function rejectAiDraft(id: string, body: RejectAiDraftRequest): Promise<AiDraft> {
  const draftId = z.uuid().parse(id)
  const request = rejectAiDraftRequestSchema.parse(body)
  return aiDraftSchema.parse(await apiRequest<unknown>(`${ADMIN}/${draftId}/reject`, {
    method: 'POST', auth: true, body: request,
  }))
}

export async function requestQuestionDraft(body: QuestionGenerationRequest): Promise<QuestionDraft> {
  const request = questionGenerationRequestSchema.parse(body)
  return questionDraftSchema.parse(await apiRequest<unknown>(`${ADMIN}/questions`, {
    method: 'POST', auth: true, body: request,
  }))
}

export async function approveQuestionDraft(id: string, body: ApproveQuestionDraftRequest): Promise<QuestionDraft> {
  const draftId = z.uuid().parse(id)
  const request = approveQuestionDraftRequestSchema.parse(body)
  return questionDraftSchema.parse(await apiRequest<unknown>(`${ADMIN}/${draftId}/approve`, {
    method: 'POST', auth: true, body: request,
  }))
}

export async function patchQuestionDraftItem(id: string, index: number, body: QuestionDraftItemPatch): Promise<QuestionDraft> {
  const draftId = z.uuid().parse(id)
  const itemIndex = z.int().nonnegative().max(2147483647).parse(index)
  return questionDraftSchema.parse(await apiRequest<unknown>(`${ADMIN}/${draftId}/items/${itemIndex}`, {
    method: 'PATCH', auth: true, body: questionDraftItemPatchSchema.parse(body),
  }))
}

export async function deleteQuestionDraftItem(id: string, index: number): Promise<QuestionDraft> {
  const draftId = z.uuid().parse(id)
  const itemIndex = z.int().nonnegative().max(2147483647).parse(index)
  return questionDraftSchema.parse(await apiRequest<unknown>(`${ADMIN}/${draftId}/items/${itemIndex}`, { method: 'DELETE', auth: true }))
}
