import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'

export const codeSettingSchema = z.object({
  kind: z.string(),
  applied: z.boolean(),
  pattern: z.string(),
  startNumber: z.number().int().nonnegative(),
  editable: z.boolean(),
})
export type CodeSetting = z.infer<typeof codeSettingSchema>

const suggestionSchema = z.object({ code: z.string(), applied: z.boolean(), editable: z.boolean() })
export type CodeSuggestion = z.infer<typeof suggestionSchema>

export async function fetchCodeSettings(signal?: AbortSignal) {
  return z.array(codeSettingSchema).parse(await apiRequest<unknown>('/api/content/admin/code-settings', { auth: true, signal }))
}

export async function updateCodeSettings(kind: string, body: Omit<CodeSetting, 'kind'>) {
  return codeSettingSchema.parse(await apiRequest<unknown>(`/api/content/admin/code-settings/${kind}`, { auth: true, method: 'PUT', body }))
}

export async function fetchCodeSuggestion(band: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ kind: 'COURSE' })
  if (band.trim()) params.set('band', band.trim())
  return suggestionSchema.parse(await apiRequest<unknown>(`/api/content/admin/code-suggestion?${params}`, { auth: true, signal }))
}
