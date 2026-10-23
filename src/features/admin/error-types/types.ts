import { z } from 'zod'

export const ERROR_CATEGORIES = ['GRAMMAR', 'VOCABULARY', 'COHERENCE', 'TASK', 'READING_STRATEGY', 'LISTENING_STRATEGY', 'SPELLING_NUMBER'] as const
export const errorTypeSchema = z.object({
  id: z.string(), code: z.string(), name: z.string(), category: z.enum(ERROR_CATEGORIES), severity: z.number().int().min(1).max(3),
  knowledgePointId: z.string().nullable(), fixHint: z.string(), status: z.enum(['ACTIVE', 'INACTIVE']), reviewStatus: z.enum(['DRAFT', 'APPROVED']),
})
export type ErrorType = z.infer<typeof errorTypeSchema>
export type ErrorCategory = (typeof ERROR_CATEGORIES)[number]
export type ErrorTypeCreate = Pick<ErrorType, 'code' | 'name' | 'category' | 'severity' | 'knowledgePointId' | 'fixHint'>
export type ErrorTypeUpdate = Omit<ErrorTypeCreate, 'code'> & Partial<Pick<ErrorType, 'status' | 'reviewStatus'>>
