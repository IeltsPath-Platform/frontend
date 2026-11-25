import { apiRequest } from '@/lib/httpClient'
import { z } from 'zod'
import {
  questionDetailSchema,
  questionPageSchema,
  questionPassageSchema,
  questionSchema,
  questionUsageSchema,
  type Question,
  type QuestionPassage,
  type QuestionUsage,
  type QuestionDetail,
  type QuestionFilters,
  type QuestionPage,
  type VersionRequest,
} from '../types'

const BASE = '/api/content/admin/questions'

export async function listQuestions(filters: QuestionFilters, signal?: AbortSignal): Promise<QuestionPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item))
    else if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const suffix = params.size > 0 ? `?${params}` : ''
  return questionPageSchema.parse(await apiRequest<unknown>(`${BASE}${suffix}`, { auth: true, signal }))
}

export async function getQuestion(id: string, signal?: AbortSignal): Promise<QuestionDetail> {
  return questionDetailSchema.parse(await apiRequest<unknown>(`${BASE}/${id}`, { auth: true, signal }))
}

/** The reading passages that go with one version of a question (empty when it has none). */
export async function listVersionPassages(versionId: string, signal?: AbortSignal): Promise<QuestionPassage[]> {
  return z.array(questionPassageSchema).parse(await apiRequest<unknown>(`${BASE}/versions/${versionId}/passages`, { auth: true, signal }))
}

/** The packages and lessons that hold any version of the question. */
export async function listQuestionUsages(questionId: string, signal?: AbortSignal): Promise<QuestionUsage[]> {
  return z.array(questionUsageSchema).parse(await apiRequest<unknown>(`${BASE}/${questionId}/usages`, { auth: true, signal }))
}

/** Attaches an uploaded image (its key) as the prompt image of a draft Writing question version, replacing any earlier one. */
export async function setVersionImage(questionId: string, versionId: string, body: { mediaReference: string; altText: string | null }): Promise<void> {
  await apiRequest<unknown>(`${BASE}/${questionId}/versions/${versionId}/image`, { method: 'PUT', auth: true, body })
}

export async function clearVersionImage(questionId: string, versionId: string): Promise<void> {
  await apiRequest<unknown>(`${BASE}/${questionId}/versions/${versionId}/image`, { method: 'DELETE', auth: true })
}

export interface CreateQuestionInput {
  questionType: string
  skill: string | null
  accessLevel: string
  purpose: string
}

export async function createQuestion(input: CreateQuestionInput): Promise<Question> {
  return questionSchema.parse(await apiRequest<unknown>(BASE, { method: 'POST', auth: true, body: input }))
}

export async function addQuestionVersion(questionId: string, body: VersionRequest): Promise<Question> {
  return questionSchema.parse(
    await apiRequest<unknown>(`${BASE}/${questionId}/versions`, { method: 'POST', auth: true, body }),
  )
}

/** Soft delete: the question stays in the bank with status ARCHIVED. */
export async function archiveQuestion(questionId: string): Promise<Question> {
  return questionSchema.parse(await apiRequest<unknown>(`${BASE}/${questionId}/archive`, { method: 'POST', auth: true }))
}

export async function publishQuestionVersion(questionId: string, versionId: string): Promise<QuestionDetail> {
  return questionDetailSchema.parse(
    await apiRequest<unknown>(`${BASE}/${questionId}/versions/${versionId}/publish`, { method: 'POST', auth: true }),
  )
}

export async function archiveQuestionVersion(questionId: string, versionId: string): Promise<QuestionDetail> {
  return questionDetailSchema.parse(
    await apiRequest<unknown>(`${BASE}/${questionId}/versions/${versionId}/archive`, { method: 'POST', auth: true }),
  )
}
