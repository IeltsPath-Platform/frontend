import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import {
  aiAllowanceSchema, sectionQuestionApproveSchema, sectionQuestionDetailSchema, sectionQuestionDraftSchema,
  sectionQuestionRequestSchema, type SectionQuestionDraftRequest,
} from '../../ai-drafts/types'

const BASE = '/api/content/admin/ai-drafts/section-questions'
const draftPath = (id: string) => `${BASE}/${z.guid().parse(id)}`

export async function requestSectionQuestions(body: SectionQuestionDraftRequest) {
  return sectionQuestionDraftSchema.parse(await apiRequest<unknown>(BASE, {
    auth: true, method: 'POST', body: sectionQuestionRequestSchema.parse(body),
  }))
}
export async function listOpenSectionDrafts(versionId: string, signal?: AbortSignal) {
  return z.array(sectionQuestionDraftSchema).parse(await apiRequest<unknown>(`${BASE}/open?versionId=${z.guid().parse(versionId)}`, { auth: true, signal }))
}
export async function getAiAllowance(signal?: AbortSignal) {
  return aiAllowanceSchema.parse(await apiRequest<unknown>('/api/content/admin/ai-drafts/allowance', { auth: true, signal }))
}
export async function getSectionQuestionDraft(id: string, signal?: AbortSignal) {
  return sectionQuestionDetailSchema.parse(await apiRequest<unknown>(draftPath(id), { auth: true, signal }))
}
export async function editSectionQuestionDraftItem(id: string, itemId: string, body: Record<string, unknown>) {
  return sectionQuestionDraftSchema.parse(await apiRequest<unknown>(`${draftPath(id)}/items/${z.guid().parse(itemId)}`, { auth: true, method: 'PATCH', body }))
}
export async function removeSectionQuestionDraftItem(id: string, itemId: string, revision: number) {
  return sectionQuestionDraftSchema.parse(await apiRequest<unknown>(`${draftPath(id)}/items/${z.guid().parse(itemId)}?revision=${revision}`, { auth: true, method: 'DELETE' }))
}
export async function approveSectionQuestionDraft(id: string, itemIds: string[], revision: number, acceptSourceChange: boolean) {
  const body = sectionQuestionApproveSchema.parse({ itemIds, revision, acceptSourceChange })
  return sectionQuestionDraftSchema.parse(await apiRequest<unknown>(`${draftPath(id)}/approve`, { auth: true, method: 'POST', body }))
}
export async function rejectSectionQuestionDraft(id: string, note = '') {
  return sectionQuestionDraftSchema.parse(await apiRequest<unknown>(`${draftPath(id)}/reject`, { auth: true, method: 'POST', body: { note } }))
}
export async function publishSectionDraftQuestions(packageId: string, versionId: string, sectionId: string) {
  const path = `/api/content/admin/packages/${z.guid().parse(packageId)}/versions/${z.guid().parse(versionId)}/sections/${z.guid().parse(sectionId)}/questions/publish-drafts`
  return z.object({ publishedCount: z.number().int().nonnegative() }).parse(await apiRequest<unknown>(path, { auth: true, method: 'POST' }))
}
