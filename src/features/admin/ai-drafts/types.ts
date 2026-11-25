import { z } from 'zod'

export const AI_DRAFT_KINDS = ['QUESTIONS', 'COURSE', 'PRACTICE_SET', 'SECTION_QUESTIONS'] as const
export const AI_DRAFT_STATUSES = ['QUEUED', 'GENERATING', 'READY', 'FAILED', 'APPROVED', 'REJECTED', 'EXPIRED'] as const

export const aiDraftKindSchema = z.enum(AI_DRAFT_KINDS)
export const aiDraftStatusSchema = z.enum(AI_DRAFT_STATUSES)
const jsonObjectSchema = z.record(z.string(), z.json())

export const aiDraftSchema = z.object({
  id: z.guid(),
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
  origin: z.object({ type: z.string(), title: z.string().nullable().optional(), knowledgePointName: z.string().nullable().optional(), lessonId: z.guid().nullable().optional(),
    packageId: z.guid().nullable().optional(), versionId: z.guid().nullable().optional(), sectionId: z.guid().nullable().optional(),
    topicId: z.guid().nullable().optional(), exists: z.boolean() }).nullable().optional(),
  itemCount: z.number().int().nonnegative().optional(),
})

export const aiDraftListEntrySchema = aiDraftSchema
export const aiDraftListSchema = z.array(aiDraftListEntrySchema)
export const aiDraftQuerySchema = z.object({
  kind: z.union([aiDraftKindSchema, z.array(aiDraftKindSchema)]).optional(),
  status: aiDraftStatusSchema.optional(),
  page: z.number().int().nonnegative().optional(),
  size: z.number().int().min(1).max(100).optional(),
})
export const rejectAiDraftRequestSchema = z.object({ note: z.string().max(1000) })

export type AiDraftKind = z.infer<typeof aiDraftKindSchema>
export type AiDraftStatus = z.infer<typeof aiDraftStatusSchema> | (string & {})
export type AiDraft = z.infer<typeof aiDraftSchema>
export type AiDraftListEntry = z.infer<typeof aiDraftListEntrySchema>
export type AiDraftQuery = z.infer<typeof aiDraftQuerySchema>
export type RejectAiDraftRequest = z.infer<typeof rejectAiDraftRequestSchema>

export const QUESTION_DRAFT_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE_NOT_GIVEN', 'FILL_IN_BLANK', 'SHORT_ANSWER'] as const
export type QuestionDraftType = (typeof QUESTION_DRAFT_TYPES)[number]
export const QUESTION_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const
export const QUESTION_DRAFT_MAX_ITEMS = 20
export const QUESTION_DRAFT_REJECTION_REASONS = [
  'NOT_AN_OBJECT', 'BAD_STEM', 'NO_EXPLANATION', 'BAD_OPTIONS', 'CORRECT_NOT_AN_OPTION',
  'DISTRACTOR_NOT_A_WRONG_OPTION', 'UNKNOWN_ERROR_CODE', 'NO_ACCEPTED_ANSWER', 'DUPLICATE_STEM',
] as const

export const SECTION_QUESTION_REJECTION_REASONS = [
  'BAD_TFNG_OPTIONS', 'DUPLICATE_OPTIONS', 'ANSWER_TOO_LONG', 'ANSWER_NOT_IN_SOURCE', 'ANSWER_IN_STEM',
  'BAD_BLANK', 'COPIED_FROM_SOURCE', 'DUPLICATE_IN_SECTION', 'DUPLICATE_IN_DRAFT', 'DUPLICATE_ANSWER',
] as const

export const questionGenerationRequestSchema = z.object({
  knowledgePointId: z.guid(),
  questionType: z.enum(QUESTION_DRAFT_TYPES),
  count: z.number().int().min(1).max(QUESTION_DRAFT_MAX_ITEMS),
  instructions: z.string().max(500).nullable().optional(),
  lessonId: z.guid().optional(),
  blockId: z.guid().optional(),
})

const nonblankText = z.string().refine((value) => value.trim().length > 0)
const questionDraftAnswerSpecSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CHOICE'), correct: nonblankText, distractors: z.record(z.string(), z.string()).optional() }),
  z.object({ type: z.literal('FILL'), accepted: z.array(nonblankText).min(1), maxWords: z.number().int().positive().optional() }),
])

export const questionDraftItemSchema = z.object({
  itemId: z.guid(),
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
    revision: z.number().int().nonnegative(),
    items: z.array(questionDraftItemSchema),
    rejected: z.array(z.object({ index: z.number().int().nonnegative(), reason: z.string() })),
  }).nullable(),
})

/** Question types a model-written practice set may use, and how many questions and knowledge points one request takes. */
export const PRACTICE_SET_QUESTION_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE_NOT_GIVEN'] as const
export const PRACTICE_SET_MIN_QUESTIONS = 3
export const PRACTICE_SET_MAX_QUESTIONS = 10
export const PRACTICE_SET_MAX_POINTS = 5

/** Words of the lesson the passage should use, and the most one request takes. */
export const PRACTICE_SET_MAX_VOCABULARY = 30

export const practiceSetGenerationRequestSchema = z.object({
  knowledgePointIds: z.array(z.guid()).min(1).max(PRACTICE_SET_MAX_POINTS),
  lessonTitle: z.string().max(255).nullable().optional(),
  vocabulary: z.array(z.string().trim().min(1).max(100)).max(PRACTICE_SET_MAX_VOCABULARY).optional(),
  questionType: z.enum(PRACTICE_SET_QUESTION_TYPES),
  count: z.number().int().min(PRACTICE_SET_MIN_QUESTIONS).max(PRACTICE_SET_MAX_QUESTIONS),
  difficulty: z.enum(QUESTION_DIFFICULTIES),
  instructions: z.string().max(500).nullable().optional(),
})

export const practiceSetDraftSchema = aiDraftSchema.extend({
  kind: z.literal('PRACTICE_SET'),
  result: z.object({
    title: z.string(), instructions: z.string(), passage: nonblankText,
    questionType: z.enum(PRACTICE_SET_QUESTION_TYPES), knowledgePointIds: z.array(z.guid()),
    // The points each question tests; a set written before the model named them has none.
    items: z.array(questionDraftItemSchema.extend({ knowledgePointIds: z.array(z.guid()).optional() })),
    rejected: z.array(z.object({ index: z.number().int().nonnegative(), reason: z.string() })),
  }).nullable(),
})

export type PracticeSetGenerationRequest = z.infer<typeof practiceSetGenerationRequestSchema>
export type PracticeSetDraft = z.infer<typeof practiceSetDraftSchema>

export const approveQuestionDraftRequestSchema = z.object({
  itemIds: z.array(z.guid()).min(1)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'Mỗi câu hỏi chỉ được chọn một lần.' }),
  revision: z.number().int().nonnegative(),
  createNewBlock: z.boolean().optional(),
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

export const sectionQuestionRequestSchema = z.object({
  packageId: z.guid(), versionId: z.guid(), sectionId: z.guid(),
  questionType: z.enum(QUESTION_DRAFT_TYPES), count: z.number().int().min(1, 'Số câu phải từ 1 đến 10.').max(10, 'Số câu phải từ 1 đến 10.'),
  instructions: z.string().max(500).nullable().optional(),
})
export const sectionQuestionItemSchema = questionDraftItemSchema.extend({ itemId: z.guid() })
export const sectionQuestionDraftSchema = aiDraftSchema.extend({
  kind: z.literal('SECTION_QUESTIONS'),
  result: z.object({
    requested: z.number().int(), revision: z.number().int(),
    items: z.array(sectionQuestionItemSchema),
    rejected: z.array(z.object({ index: z.number().int(), reason: z.string() })),
    approved: z.array(z.object({ itemId: z.guid(), questionId: z.guid(), questionVersionId: z.guid(), sectionQuestionId: z.guid() })).optional(),
  }).nullable(),
}).passthrough()
export const sectionQuestionDetailSchema = sectionQuestionDraftSchema.extend({
  sourceChanged: z.boolean(), sectionState: z.enum(['OK', 'MISSING', 'VERSION_NOT_DRAFT', 'SKILL_CHANGED']),
})
export const aiAllowanceSchema = z.object({ limit: z.number().int(), used: z.number().int(), remaining: z.number().int() })
export const sectionQuestionApproveSchema = z.object({ itemIds: z.array(z.guid()).min(1), revision: z.number().int(), acceptSourceChange: z.boolean() })
export type SectionQuestionDraftRequest = z.infer<typeof sectionQuestionRequestSchema>
export type SectionQuestionDraft = z.infer<typeof sectionQuestionDraftSchema>
export type SectionQuestionItem = z.infer<typeof sectionQuestionItemSchema>
export type SectionQuestionDetail = z.infer<typeof sectionQuestionDetailSchema>
