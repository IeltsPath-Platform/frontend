import { z } from 'zod'

export const CRITERIA = [
  { key: 'taskResponse', label: 'Task Response / Achievement' },
  { key: 'coherence', label: 'Coherence and Cohesion' },
  { key: 'lexical', label: 'Lexical Resource' },
  { key: 'grammar', label: 'Grammatical Range and Accuracy' },
] as const
export type CriterionKey = (typeof CRITERIA)[number]['key']

export const queueEntrySchema = z.object({
  id: z.uuid(),
  attemptType: z.string().nullish(),
  source: z.string().nullish(),
  skill: z.string().nullish(),
  task: z.string().nullish(),
  status: z.string(),
  claimedAt: z.string().nullish(),
  createdAt: z.string(),
  waitSeconds: z.number(),
  overdue: z.boolean(),
})
export const queuePageSchema = z.object({ content: z.array(queueEntrySchema), page: z.int().nonnegative(), size: z.int().positive(), totalElements: z.number().int().nonnegative() })

export const qualitySchema = z.object({
  examinerId: z.string(),
  examinerName: z.string().nullish(),
  reviewedEssays: z.number(),
  averageAbsoluteBandDifference: z.number(),
  overOneBandRate: z.number(),
})

/** The essay to re-grade, without the original grade. `rubric` is shown for reference only. */
export const reviewEssaySchema = z.object({
  jobId: z.uuid(),
  prompt: z.string().nullish(),
  essay: z.string(),
  task: z.string().nullish(),
  rubric: z.unknown().nullish(),
  source: z.string().nullish(),
})

export const bandSchema = z.number().min(0).max(9).multipleOf(0.5)
export const reviewSchema = z.object({
  gradingJobId: z.uuid(),
  reviewerBand: bandSchema,
  reviewerCriteria: z.object({ taskResponse: bandSchema, coherence: bandSchema, lexical: bandSchema, grammar: bandSchema }),
  note: z.string().max(4000).optional(),
})

export type QueueEntry = z.infer<typeof queueEntrySchema>
export type QueuePage = z.infer<typeof queuePageSchema>
export type ExaminerQuality = z.infer<typeof qualitySchema>
export type ReviewEssay = z.infer<typeof reviewEssaySchema>
export type ReviewBody = z.infer<typeof reviewSchema>
