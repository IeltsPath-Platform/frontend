import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'

export const codeSettingSchema = z.object({
  kind: z.enum(['COURSE', 'TOPIC', 'LESSON', 'PACKAGE', 'KNOWLEDGE_POINT']),
  applied: z.boolean(),
  pattern: z.string(),
  startNumber: z.number().int().nonnegative(),
  editable: z.boolean(),
})
export type CodeKind = 'COURSE' | 'TOPIC' | 'LESSON' | 'PACKAGE' | 'KNOWLEDGE_POINT'
export type CodeSetting = z.infer<typeof codeSettingSchema>

const suggestionSchema = z.object({ code: z.string(), applied: z.boolean(), editable: z.boolean() })
export type CodeSuggestion = z.infer<typeof suggestionSchema>
export type CodeSuggestionContext = {
  kind: CodeKind; band?: string; courseId?: string; skill?: string; topicId?: string; lessonId?: string; packageType?: string
  kpKind?: string; level?: number; name?: string
}

export async function fetchCodeSettings(signal?: AbortSignal) {
  return z.array(codeSettingSchema).parse(await apiRequest<unknown>('/api/content/admin/code-settings', { auth: true, signal }))
}

export async function updateCodeSettings(kind: CodeKind, body: Omit<CodeSetting, 'kind'>) {
  return codeSettingSchema.parse(await apiRequest<unknown>(`/api/content/admin/code-settings/${kind}`, { auth: true, method: 'PUT', body }))
}

export function fetchCodeSuggestion(context: CodeSuggestionContext, signal?: AbortSignal): Promise<CodeSuggestion>
export function fetchCodeSuggestion(band: string, signal?: AbortSignal): Promise<CodeSuggestion>
export async function fetchCodeSuggestion(contextOrBand: CodeSuggestionContext | string, signal?: AbortSignal) {
  const context = typeof contextOrBand === 'string' ? { kind: 'COURSE' as const, band: contextOrBand } : contextOrBand
  const params = new URLSearchParams({ kind: context.kind })
  if (context.band?.trim()) params.set('band', context.band.trim())
  if (context.courseId) params.set('courseId', context.courseId)
  if (context.skill) params.set('skill', context.skill)
  if (context.topicId) params.set('topicId', context.topicId)
  if (context.lessonId) params.set('lessonId', context.lessonId)
  if (context.packageType) params.set('packageType', context.packageType)
  if (context.kpKind) params.set('kpKind', context.kpKind)
  if (context.level !== undefined) params.set('level', String(context.level))
  if (context.name?.trim()) params.set('name', context.name.trim())
  return suggestionSchema.parse(await apiRequest<unknown>(`/api/content/admin/code-suggestion?${params}`, { auth: true, signal }))
}
