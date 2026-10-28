import { z } from 'zod'
import { aiDraftSchema, type AiDraftQuery } from '../ai-drafts/types'

export const COURSE_DRAFT_SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const
export const COURSE_CANDIDATE_LIMIT = 40
/** Most question references one exercise block may carry. */
export const COURSE_QUESTION_LIMIT = 100
const skillSchema = z.enum(COURSE_DRAFT_SKILLS)
const codeSchema = z.string().regex(/^[A-Za-z0-9._-]{1,100}$/)
const nonblank = z.string().refine((value) => value.trim().length > 0)
const bandSchema = z.number().min(0).max(9).multipleOf(0.5)
const finalTestSchema = z.object({ code: codeSchema, title: nonblank.max(255) })

export const courseGapSchema = z.object({ knowledgePointId: z.guid(), reason: z.string() })
export const courseAnalysisIssueSchema = z.object({ code: z.string(), subject: z.string().nullable(), related: z.string().nullable() })
export const courseAnalysisSchema = z.object({
  valid: z.boolean(), errors: z.array(courseAnalysisIssueSchema), warnings: z.array(courseAnalysisIssueSchema),
  gaps: z.array(courseGapSchema), coverage: z.object({ expected: z.int().nonnegative(), covered: z.int().nonnegative() }),
})

export const courseBlockSchema = z.object({
  type: z.enum(['TEXT', 'EXERCISE']), text: z.string().max(20000).nullable(),
  knowledgePointIds: z.array(z.guid()).max(50), questionRefs: z.array(nonblank.max(100)).max(100),
}).superRefine((block, ctx) => {
  if (block.type === 'TEXT' && block.questionRefs.length) ctx.addIssue({ code: 'custom', path: ['questionRefs'], message: 'Block văn bản không có câu hỏi.' })
  if (block.type === 'EXERCISE') {
    if (block.text?.trim()) ctx.addIssue({ code: 'custom', path: ['text'], message: 'Block bài tập không có văn bản.' })
    if (block.knowledgePointIds.length) ctx.addIssue({ code: 'custom', path: ['knowledgePointIds'], message: 'Kiến thức của bài tập lấy từ câu hỏi.' })
    if (!block.questionRefs.length) ctx.addIssue({ code: 'custom', path: ['questionRefs'], message: 'Chọn ít nhất một câu hỏi.' })
  }
})

export const lessonResourceSchema = z.object({
  type: z.enum(['SLIDE', 'DOCUMENT']), title: nonblank.max(255), url: z.string().max(2000).regex(/^https?:\/\/\S+$/i),
})
/** The parts of speech the vocabulary library knows. */
export const COURSE_PARTS_OF_SPEECH = ['NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PREPOSITION', 'CONJUNCTION', 'IDIOM', 'PHRASAL_VERB'] as const
/** Most senses a lesson may list, picked from the library or proposed as new words; and most new words alone. */
export const COURSE_VOCABULARY_LIMIT = 50
export const COURSE_NEW_WORD_LIMIT = 20
/** A word the model proposed for a lesson. The library keeps its own sense for a lemma it already has. */
export const courseNewWordSchema = z.object({
  lemma: z.string().max(100).regex(/^\p{L}[\p{L}\p{N}' .-]*$/u), ipa: z.string().max(100).nullish(),
  partOfSpeech: z.enum(COURSE_PARTS_OF_SPEECH), englishDefinition: z.string().max(1000).nullish(),
  vietnameseMeaning: nonblank.max(1000), exampleSentence: nonblank.max(1000),
})
/** `summaryMarkdown`, `estimatedMinutes`, `resources` and the vocabulary are optional so a draft saved before they existed still reads. */
export const courseLessonSchema = z.object({
  code: codeSchema, title: nonblank.max(255), summary: z.string().max(2000).nullable(),
  knowledgePointIds: z.array(z.guid()).max(50), blocks: z.array(courseBlockSchema).max(50), practiceSetPackageIds: z.array(z.guid()).max(20),
  summaryMarkdown: z.string().max(20000).nullish(), estimatedMinutes: z.int().min(1).max(600).nullish(),
  resources: z.array(lessonResourceSchema).max(20).optional(),
  vocabularySenseIds: z.array(z.guid()).max(COURSE_VOCABULARY_LIMIT).optional(),
  newVocabulary: z.array(courseNewWordSchema).max(COURSE_NEW_WORD_LIMIT).optional(),
}).refine((lesson) => (lesson.resources ?? []).filter((item) => item.type === 'SLIDE').length <= 1, { path: ['resources'], message: 'Mỗi bài chỉ có một slide.' })
  .refine((lesson) => (lesson.vocabularySenseIds?.length ?? 0) + (lesson.newVocabulary?.length ?? 0) <= COURSE_VOCABULARY_LIMIT, { path: ['newVocabulary'], message: 'Quá nhiều từ vựng trong một bài.' })
export const courseTopicSchema = z.object({
  code: codeSchema, name: nonblank.max(255), skill: skillSchema, sortOrder: z.int().min(0).max(2147483647),
  lessons: z.array(courseLessonSchema).max(50), topicTest: finalTestSchema.nullable(),
})
export const courseStructureSchema = z.object({
  course: z.object({ code: codeSchema, name: nonblank.max(255), bandLevel: bandSchema }).nullable(),
  topics: z.array(courseTopicSchema).max(30), courseTest: finalTestSchema.nullable(),
  practiceTestMilestones: z.array(z.object({ packageId: z.guid(), afterTopicSequence: z.int().positive() })).max(100),
  gaps: z.array(courseGapSchema),
}).superRefine((structure, ctx) => {
  const topics = new Set<string>()
  const lessons = new Set<string>()
  const tests = new Set<string>()
  const orders = new Set<number>()
  const duplicate = (set: Set<string>, code: string, path: (string | number)[]) => {
    if (set.has(code)) ctx.addIssue({ code: 'custom', path, message: 'Mã đã được dùng trong bản nháp.' })
    set.add(code)
  }
  structure.topics.forEach((topic, ti) => {
    duplicate(topics, topic.code, ['topics', ti, 'code'])
    if (orders.has(topic.sortOrder)) ctx.addIssue({ code: 'custom', path: ['topics', ti, 'sortOrder'], message: 'Thứ tự chủ đề bị trùng.' })
    orders.add(topic.sortOrder)
    topic.lessons.forEach((lesson, li) => duplicate(lessons, lesson.code, ['topics', ti, 'lessons', li, 'code']))
    if (topic.topicTest) duplicate(tests, topic.topicTest.code, ['topics', ti, 'topicTest', 'code'])
  })
  if (structure.courseTest) duplicate(tests, structure.courseTest.code, ['courseTest', 'code'])
  structure.practiceTestMilestones.forEach((milestone, index) => {
    if (milestone.afterTopicSequence > Math.max(1, structure.topics.length)) ctx.addIssue({ code: 'custom', path: ['practiceTestMilestones', index, 'afterTopicSequence'], message: 'Mốc phải nằm sau một chủ đề trong bản nháp.' })
  })
})

export const courseGenerationRequestSchema = z.object({
  bandLevel: bandSchema,
  skills: z.array(skillSchema).min(1).max(4).refine((skills) => new Set(skills).size === skills.length),
  topics: z.array(nonblank.max(100)).max(10).default([]),
  knowledgePointIds: z.array(z.guid()).max(COURSE_CANDIDATE_LIMIT).default([]),
  lessonCount: z.int().min(1).max(30).nullable().optional(), instructions: z.string().max(500).nullable().optional(),
  /** Whether the generator adds the prerequisites itself. The request form lets the author pick them, so it sends false. */
  includePrerequisites: z.boolean().nullish(),
}).refine((body) => body.topics.length > 0 || body.knowledgePointIds.length > 0, { message: 'Chọn kiến thức hoặc nhập chủ đề.' })

export const courseDraftResultSchema = courseStructureSchema.safeExtend({
  unmatchedTopics: z.array(z.string()).optional(),
  warnings: z.array(z.object({ code: z.string(), subject: z.string() })).optional(),
  analysis: courseAnalysisSchema.optional(),
  gapHints: z.array(z.object({ knowledgePointId: z.guid(), reason: z.string(), action: z.literal('REQUEST_QUESTION_DRAFT') })).optional(),
})
export const courseDraftSchema = aiDraftSchema.extend({
  kind: z.literal('COURSE'),
  request: z.union([z.object({}).strict(), courseGenerationRequestSchema]),
  result: courseDraftResultSchema.nullable(),
})
export const courseApprovalSchema = z.object({
  draftId: z.guid(), courseId: z.guid(), topicIds: z.array(z.guid()), lessonIds: z.array(z.guid()), finalTestPackageIds: z.array(z.guid()),
})

export type CourseStructure = z.infer<typeof courseStructureSchema>
export type CourseDraftStructure = CourseStructure
export type CourseTopic = z.infer<typeof courseTopicSchema>
export type CourseLesson = z.infer<typeof courseLessonSchema>
export type CourseLessonResource = z.infer<typeof lessonResourceSchema>
export type CourseNewWord = z.infer<typeof courseNewWordSchema>
export type CoursePartOfSpeech = (typeof COURSE_PARTS_OF_SPEECH)[number]
export type CourseBlock = z.infer<typeof courseBlockSchema>
export type CourseFinalTest = z.infer<typeof finalTestSchema>
export type CourseMilestone = CourseStructure['practiceTestMilestones'][number]
export type CourseGap = z.infer<typeof courseGapSchema>
export type CourseAnalysisIssue = z.infer<typeof courseAnalysisIssueSchema>
export type CourseAnalysis = z.infer<typeof courseAnalysisSchema>
export type CourseGenerationRequest = z.infer<typeof courseGenerationRequestSchema>
export type CourseDraft = z.infer<typeof courseDraftSchema>
export type CourseApproval = z.infer<typeof courseApprovalSchema>
export type CourseDraftFilters = Omit<AiDraftQuery, 'kind'>
