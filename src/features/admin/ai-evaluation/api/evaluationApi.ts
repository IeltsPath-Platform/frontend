import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import { activationSchema, evaluationDetailSchema, evaluationRowSchema, goldEssaySchema, newGoldEssaySchema, pageSchema, writingTaskSchema, type NewGoldEssay, type WritingTask } from '../types'

const BASE = '/api/assessments/admin'
const idSchema = z.object({ id: z.guid() })
function query(task: WritingTask | '', page: number) {
  const params = new URLSearchParams({ page: String(z.int().nonnegative().parse(page)), size: '20' })
  if (task) params.set('task', writingTaskSchema.parse(task))
  return params
}
export async function listGoldEssays(task: WritingTask | '' = '', page = 0, signal?: AbortSignal) {
  return pageSchema(goldEssaySchema).parse(await apiRequest<unknown>(`${BASE}/ai-gold-essays?${query(task, page)}`, { auth: true, signal }))
}
export async function listEvaluations(task: WritingTask | '' = '', page = 0, signal?: AbortSignal) {
  return pageSchema(evaluationRowSchema).parse(await apiRequest<unknown>(`${BASE}/ai-evaluations?${query(task, page)}`, { auth: true, signal }))
}
export async function listActivations(signal?: AbortSignal) { return z.array(activationSchema).parse(await apiRequest<unknown>(`${BASE}/ai-prompt-activations`, { auth: true, signal })) }
export async function getEvaluation(id: string, signal?: AbortSignal) { return evaluationDetailSchema.parse(await apiRequest<unknown>(`${BASE}/ai-evaluations/${z.guid().parse(id)}`, { auth: true, signal })) }
export async function addGoldEssay(body: NewGoldEssay) { return idSchema.parse(await apiRequest<unknown>(`${BASE}/ai-gold-essays`, { auth: true, method: 'POST', body: newGoldEssaySchema.parse(body) })) }
export async function importComparisons() { return z.object({ imported: z.int().nonnegative() }).parse(await apiRequest<unknown>(`${BASE}/ai-gold-essays/import-comparisons`, { auth: true, method: 'POST' })) }
export async function startEvaluation(task: WritingTask) { return idSchema.parse(await apiRequest<unknown>(`${BASE}/ai-evaluations`, { auth: true, method: 'POST', body: { task: writingTaskSchema.parse(task) } })) }
export async function activateEvaluation(runId: string) { z.null().parse(await apiRequest<unknown>(`${BASE}/ai-prompt-activations`, { auth: true, method: 'POST', body: { runId: z.guid().parse(runId) } })) }
