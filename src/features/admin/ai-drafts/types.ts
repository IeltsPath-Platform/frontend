import { z } from 'zod'

export const AI_DRAFT_KINDS = ['QUESTIONS', 'COURSE'] as const
export const AI_DRAFT_STATUSES = ['QUEUED', 'GENERATING', 'READY', 'FAILED', 'APPROVED', 'REJECTED'] as const

export const aiDraftKindSchema = z.enum(AI_DRAFT_KINDS)
export const aiDraftStatusSchema = z.enum(AI_DRAFT_STATUSES)
const jsonObjectSchema = z.record(z.string(), z.json())

export const aiDraftSchema = z.object({
  id: z.uuid(),
  kind: aiDraftKindSchema,
  status: aiDraftStatusSchema,
  request: jsonObjectSchema,
  result: jsonObjectSchema.nullable(),
  errorCode: z.string().nullable(),
  model: z.string().nullable(),
  promptVersion: z.string().nullable(),
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  reviewedAt: z.iso.datetime().nullable(),
  reviewNote: z.string().nullable(),
})

export const aiDraftListSchema = z.array(aiDraftSchema)
export const aiDraftQuerySchema = z.object({
  kind: aiDraftKindSchema.optional(),
  status: aiDraftStatusSchema.optional(),
  page: z.number().int().nonnegative().optional(),
  size: z.number().int().min(1).max(100).optional(),
})
export const rejectAiDraftRequestSchema = z.object({ note: z.string().max(1000) })

export type AiDraftKind = z.infer<typeof aiDraftKindSchema>
export type AiDraftStatus = z.infer<typeof aiDraftStatusSchema>
export type AiDraft = z.infer<typeof aiDraftSchema>
export type AiDraftQuery = z.infer<typeof aiDraftQuerySchema>
export type RejectAiDraftRequest = z.infer<typeof rejectAiDraftRequestSchema>

export const QUESTION_DRAFT_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE_NOT_GIVEN', 'FILL_IN_BLANK', 'SHORT_ANSWER'] as const
export const QUESTION_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const
export const QUESTION_DRAFT_MAX_ITEMS = 20
export const QUESTION_DRAFT_REJECTION_REASONS = [
  'NOT_AN_OBJECT', 'BAD_STEM', 'NO_EXPLANATION', 'BAD_OPTIONS', 'CORRECT_NOT_AN_OPTION',
  'DISTRACTOR_NOT_A_WRONG_OPTION', 'UNKNOWN_ERROR_CODE', 'NO_ACCEPTED_ANSWER', 'DUPLICATE_STEM',
] as const

export const questionGenerationRequestSchema = z.object({
  knowledgePointId: z.uuid(),
  questionType: z.enum(QUESTION_DRAFT_TYPES),
  count: z.number().int().min(1).max(QUESTION_DRAFT_MAX_ITEMS),
  difficulty: z.enum(QUESTION_DIFFICULTIES),
  instructions: z.string().max(500).nullable().optional(),
})

const nonblankText = z.string().refine((value) => value.trim().length > 0)
const questionDraftAnswerSpecSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CHOICE'), correct: nonblankText, distractors: z.record(z.string(), z.string()).optional() }),
  z.object({ type: z.literal('FILL'), accepted: z.array(nonblankText).min(1), maxWords: z.number().int().positive().optional() }),
])

export const questionDraftItemSchema = z.object({
  stem: nonblankText.max(4000),
  options: z.array(z.object({ optionKey: nonblankText, content: nonblankText, sortOrder: z.number().int().nonnegative() })),
  answerSpec: questionDraftAnswerSpecSchema,
  explanation: nonblankText,
  difficulty: z.enum(QUESTION_DIFFICULTIES),
})

export const questionDraftSchema = aiDraftSchema.extend({
  kind: z.literal('QUESTIONS'),
  request: questionGenerationRequestSchema,
  result: z.object({
    items: z.array(questionDraftItemSchema),
    rejected: z.array(z.object({ index: z.number().int().nonnegative(), reason: z.string() })),
  }).nullable(),
})

export const approveQuestionDraftRequestSchema = z.object({
  itemIndexes: z.array(z.number().int().nonnegative()).min(1)
    .refine((indexes) => new Set(indexes).size === indexes.length, { message: 'Mỗi câu hỏi chỉ được chọn một lần.' }),
})

export type QuestionGenerationRequest = z.infer<typeof questionGenerationRequestSchema>
export type QuestionDraftItem = z.infer<typeof questionDraftItemSchema>
export type QuestionDraft = z.infer<typeof questionDraftSchema>
export type ApproveQuestionDraftRequest = z.infer<typeof approveQuestionDraftRequestSchema>

export const questionDraftItemPatchSchema = z.object({
  stem: z.string().max(4000).nullable().optional(), explanation: z.string().max(4000).nullable().optional(),
  options: z.array(z.object({ optionKey: z.string().max(100), content: z.string().max(4000) })).max(6).nullable().optional(),
  correct: z.string().max(100).nullable().optional(),
  distractors: z.record(z.string().max(100), z.string().max(100)).nullable().optional(),
  accepted: z.array(z.string().max(500)).max(20).nullable().optional(),
})
export type QuestionDraftItemPatch = z.infer<typeof questionDraftItemPatchSchema>
