import { z } from 'zod'
import { bandSchema } from '@/features/admin/examiner-review/types'

/** One job in the examiner's own queue. The learner is never part of it: grading is blind. */
export const gradingEntrySchema = z.object({
  id: z.guid(),
  attemptId: z.guid().nullish(),
  attemptType: z.string().nullish(),
  source: z.string().nullish(),
  skill: z.string().nullish(),
  task: z.string().nullish(),
  status: z.string(),
  claimedAt: z.string().nullish(),
  createdAt: z.string(),
  waitSeconds: z.number(),
  overdue: z.boolean(),
  hasDraft: z.boolean().nullish(),
})
export const gradingPageSchema = z.object({
  content: z.array(gradingEntrySchema),
  page: z.int().nonnegative(),
  size: z.int().positive(),
  totalElements: z.number().int().nonnegative(),
})

/** A chart image of the prompt (Task 1), the one the learner saw. */
export const promptImageSchema = z.object({ url: z.string().min(1), altText: z.string().nullish() })

/** What the examiner reads: the prompt and the essay. `attemptId` is set for work that belongs to an exam attempt. */
export const gradingEssaySchema = z.object({
  jobId: z.guid(),
  attemptId: z.guid().nullish(),
  attemptItemId: z.guid().nullish(),
  prompt: z.string().nullish(),
  // Absent on essays sent before the chart was kept with the prompt.
  images: z.array(promptImageSchema).nullish(),
  essay: z.string(),
  task: z.string().nullish(),
  rubric: z.unknown().nullish(),
  source: z.string().nullish(),
})

/** An error marked in the essay: `start` and `end` are UTF-16 offsets, `end` exclusive (as in human-review-v1). */
export const annotationSchema = z.object({
  excerpt: z.string().min(1).max(500),
  start: z.int().nonnegative(),
  end: z.int().positive(),
  errorCode: z.string().min(1).max(60),
  suggestion: z.string().min(1).max(1000),
})

const criterionSchema = z.object({ criterion: z.string().min(1), band: bandSchema, comment: z.string().trim().min(1) })

/** One job the examiner finished, as listed (newest first). Grading is blind, so there is no learner. */
export const completedItemSchema = z.object({
  jobId: z.guid(),
  source: z.string().nullish(),
  skill: z.string().nullish(),
  task: z.string().nullish(),
  band: z.number(),
  completedAt: z.string().nullish(),
})
export const completedPageSchema = z.object({
  content: z.array(completedItemSchema),
  page: z.int().nonnegative(),
  size: z.int().positive(),
  totalElements: z.number().int().nonnegative(),
})

/** What the examiner gave a finished job, with the prompt and the essay it was about. */
export const gradedReviewSchema = z.object({
  jobId: z.guid(),
  source: z.string().nullish(),
  skill: z.string().nullish(),
  task: z.string().nullish(),
  prompt: z.string().nullish(),
  images: z.array(promptImageSchema).nullish(),
  essay: z.string(),
  band: z.number(),
  criteria: z.array(z.object({ criterion: z.string(), band: z.number(), comment: z.string().nullish() })),
  errorCodes: z.array(z.string()),
  feedback: z.string().nullish(),
  annotations: z.array(annotationSchema).nullish(),
  completedAt: z.string().nullish(),
})

/** The body the contract accepts when the review is completed. */
export const completionSchema = z.object({
  band: bandSchema,
  criteria: z.array(criterionSchema).min(1),
  errorCodes: z.array(z.string().min(1)),
  feedback: z.string().trim().min(1),
  annotations: z.array(annotationSchema).max(200),
})

/** What a draft may hold: anything the examiner had filled in so far. A band that was not chosen yet is null. */
export const draftPayloadSchema = z.object({
  band: z.number().nullish(),
  criteria: z.array(z.object({ criterion: z.string(), band: z.number().nullish(), comment: z.string().nullish() })).nullish(),
  feedback: z.string().nullish(),
  annotations: z.array(annotationSchema).nullish(),
})
export const draftSchema = z.object({ payload: z.unknown(), savedAt: z.string() })

export type CompletedItem = z.infer<typeof completedItemSchema>
export type GradedReview = z.infer<typeof gradedReviewSchema>
export type GradingEntry = z.infer<typeof gradingEntrySchema>
export type GradingPage = z.infer<typeof gradingPageSchema>
export type GradingEssay = z.infer<typeof gradingEssaySchema>
export type Annotation = z.infer<typeof annotationSchema>
export type Completion = z.infer<typeof completionSchema>
export type DraftPayload = z.infer<typeof draftPayloadSchema>
export type Draft = z.infer<typeof draftSchema>
