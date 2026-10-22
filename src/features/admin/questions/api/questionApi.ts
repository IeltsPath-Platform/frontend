import { apiRequest } from '@/lib/httpClient'
import {
  questionDetailSchema,
  questionPageSchema,
  questionSchema,
  type Question,
  type QuestionDetail,
  type QuestionFilters,
  type QuestionPage,
  type VersionRequest,
} from '../types'

const BASE = '/api/content/admin/questions'

export async function listQuestions(filters: QuestionFilters, signal?: AbortSignal): Promise<QuestionPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const suffix = params.size > 0 ? `?${params}` : ''
  return questionPageSchema.parse(await apiRequest<unknown>(`${BASE}${suffix}`, { auth: true, signal }))
}

export async function getQuestion(id: string, signal?: AbortSignal): Promise<QuestionDetail> {
  return questionDetailSchema.parse(await apiRequest<unknown>(`${BASE}/${id}`, { auth: true, signal }))
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
