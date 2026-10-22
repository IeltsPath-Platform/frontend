import { z } from 'zod'

export const LESSON_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export const BLOCK_TYPES = ['TEXT', 'ASSET', 'VOCABULARY', 'EXERCISE'] as const
export type LessonStatus = (typeof LESSON_STATUSES)[number]
export type BlockType = (typeof BLOCK_TYPES)[number]

/*
 * The two GET responses below are what this screen expects from `backend/plans/261022-1200-rd-admin-area/phase-03`.
 * Every write is followed by a fresh GET, so no other response body is read. The schemas accept both `id` and the
 * `lessonId` / `blockId` spelling the internal learning read uses, and normalise to `id`.
 */

const questionRefSchema = z.object({
  questionId: z.string().nullish(),
  questionVersionId: z.string(),
  versionNumber: z.number().nullish(),
  status: z.string().nullish(),
  stem: z.string().nullish(),
  questionType: z.string().nullish(),
})

export const lessonBlockSchema = z
  .object({
    id: z.string().nullish(),
    blockId: z.string().nullish(),
    blockType: z.enum(BLOCK_TYPES),
    sortOrder: z.number().nullish(),
    textContent: z.string().nullish(),
    assetId: z.string().nullish(),
    asset: z.object({ id: z.string() }).nullish(),
    vocabularySenseIds: z.array(z.string()).nullish(),
    knowledgePointIds: z.array(z.string()).nullish(),
    questions: z.array(questionRefSchema).nullish(),
  })
  .refine((block) => Boolean(block.id ?? block.blockId), { message: 'block id is missing' })
  .transform((block) => ({
    id: (block.id ?? block.blockId) as string,
    blockType: block.blockType,
    sortOrder: block.sortOrder ?? 0,
    textContent: block.textContent ?? null,
    assetId: block.assetId ?? block.asset?.id ?? null,
    vocabularySenseIds: block.vocabularySenseIds ?? [],
    knowledgePointIds: block.knowledgePointIds ?? [],
    questions: block.questions ?? [],
  }))

const lessonFields = {
  id: z.string().nullish(),
  lessonId: z.string().nullish(),
  topicId: z.string().nullish(),
  code: z.string(),
  title: z.string(),
  summary: z.string().nullish(),
  sortOrder: z.number().nullish(),
  status: z.enum(LESSON_STATUSES),
  estimatedMinutes: z.number().nullish(),
}

const hasLessonId = (lesson: { id?: string | null; lessonId?: string | null }) => Boolean(lesson.id ?? lesson.lessonId)

/** An item of `GET /api/content/admin/topics/{topicId}/lessons`. */
export const lessonSummarySchema = z
  .object({ ...lessonFields, blockCount: z.number().nullish(), knowledgePointIds: z.array(z.string()).nullish() })
  .refine(hasLessonId, { message: 'lesson id is missing' })
  .transform((lesson) => ({
    id: (lesson.id ?? lesson.lessonId) as string,
    topicId: lesson.topicId ?? null,
    code: lesson.code,
    title: lesson.title,
    summary: lesson.summary ?? null,
    sortOrder: lesson.sortOrder ?? 0,
    status: lesson.status,
    estimatedMinutes: lesson.estimatedMinutes ?? null,
    blockCount: lesson.blockCount ?? null,
    knowledgePointCount: lesson.knowledgePointIds?.length ?? null,
  }))

/** `GET /api/content/admin/lessons/{id}`: the editor view with every block and question status. */
export const lessonEditorSchema = z
  .object({
    ...lessonFields,
    summaryMarkdown: z.string().nullish(),
    knowledgePointIds: z.array(z.string()).nullish(),
    knowledgePoints: z.array(z.object({ id: z.string(), code: z.string().nullish(), name: z.string().nullish() })).nullish(),
    blocks: z.array(lessonBlockSchema).nullish(),
  })
  .refine(hasLessonId, { message: 'lesson id is missing' })
  .transform((lesson) => ({
    id: (lesson.id ?? lesson.lessonId) as string,
    topicId: lesson.topicId ?? null,
    code: lesson.code,
    title: lesson.title,
    summary: lesson.summary ?? '',
    summaryMarkdown: lesson.summaryMarkdown ?? '',
    sortOrder: lesson.sortOrder ?? 0,
    status: lesson.status,
    estimatedMinutes: lesson.estimatedMinutes ?? null,
    knowledgePointIds: lesson.knowledgePointIds ?? lesson.knowledgePoints?.map((point) => point.id) ?? [],
    knowledgePoints: lesson.knowledgePoints ?? [],
    blocks: [...(lesson.blocks ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
  }))

/** One topic of `GET /api/content/topics` (a tree; flattened by the API module). */
export interface TopicOption {
  id: string
  code: string
  name: string
  skill: string | null
  courseId: string | null
  status: string
  sortOrder: number
}

export type LessonSummary = z.output<typeof lessonSummarySchema>
export type LessonEditor = z.output<typeof lessonEditorSchema>
export type LessonBlock = z.output<typeof lessonBlockSchema>

export interface BlockRequest {
  blockType: BlockType
  textContent?: string
  assetId?: string
  vocabularySenseIds?: string[]
  questionVersionIds?: string[]
  knowledgePointIds?: string[]
}

export interface LessonMetaRequest {
  title: string
  summary: string
  summaryMarkdown: string
  estimatedMinutes: number | null
}

export interface NewLessonRequest extends LessonMetaRequest {
  code: string
}

export const lessonResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  sortOrder: z.number().int().nonnegative(),
})

export const lessonResourcesSchema = z.object({
  lessonId: z.string(),
  summaryMarkdown: z.string().nullable(),
  slides: z.array(lessonResourceSchema),
  documents: z.array(lessonResourceSchema),
})

export type LessonResource = z.infer<typeof lessonResourceSchema>
export type LessonResources = z.infer<typeof lessonResourcesSchema>
export type LessonResourceType = 'SLIDE' | 'DOCUMENT'
export type LessonResourceRequest = Pick<LessonResource, 'title' | 'url' | 'sortOrder'>
