import { z } from 'zod'

export const writingTaskSchema = z.enum(['TASK_1', 'TASK_2'])
export type WritingTask = z.infer<typeof writingTaskSchema>
export const bandSchema = z.number().min(0).max(9).multipleOf(0.5)
const metric = z.number().nullable()
export const evaluationRowSchema = z.object({
  id: z.uuid(), task: writingTaskSchema, model: z.string().nullable(), promptVersion: z.string().nullable(),
  status: z.enum(['RUNNING', 'DONE', 'FAILED']), n: z.int().nonnegative(), withinHalfBand: metric, mae: metric, qwk: metric,
  passed: z.boolean().nullable(), startedAt: z.string(), finishedAt: z.string().nullable(),
})
export const evaluationDetailSchema = evaluationRowSchema.extend({
  thresholds: z.object({ withinHalfBand: z.number(), qwk: z.number() }),
  perCriterion: z.record(z.string(), z.object({ n: z.int().nonnegative(), withinHalfBand: z.number(), mae: z.number(), qwk: z.number() })).nullable(),
  errorCodeFalsePositive: metric, failureCode: z.string().nullable(),
  items: z.array(z.object({ goldId: z.uuid(), llmBand: z.number(), llmCriteria: z.json(), llmErrorCodes: z.array(z.string()), diff: z.object({ examinerBand: z.number(), absoluteBandDifference: z.number() }) })),
})
export const goldEssaySchema = z.object({ id: z.uuid(), task: writingTaskSchema, examinerBand: bandSchema, source: z.enum(['MANUAL', 'COMPARISON']), essayPreview: z.string(), createdAt: z.string() })
export const activationSchema = z.object({ task: writingTaskSchema, promptVersion: z.string().nullable(), runId: z.uuid().nullable(), activatedAt: z.string().nullable() })
export const newGoldEssaySchema = z.object({
  task: writingTaskSchema, prompt: z.string().trim().min(1), chartFacts: z.string().optional(), essay: z.string().trim().min(1), examinerBand: bandSchema,
  examinerCriteria: z.array(z.object({ code: z.string().min(1), band: bandSchema })).optional(), examinerErrorCodes: z.array(z.string().min(1)).optional(),
}).refine((body) => body.task !== 'TASK_1' || !!body.chartFacts?.trim(), { path: ['chartFacts'], message: 'Task 1 cần số liệu biểu đồ.' })
export function pageSchema<T extends z.ZodType>(item: T) { return z.object({ content: z.array(item), page: z.int().nonnegative(), size: z.int().positive(), totalElements: z.int().nonnegative() }) }
export type EvaluationRun = z.infer<typeof evaluationDetailSchema>
export type NewGoldEssay = z.infer<typeof newGoldEssaySchema>
