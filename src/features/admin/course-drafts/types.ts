import { z } from 'zod'
import { aiDraftSchema, type AiDraftQuery } from '../ai-drafts/types'

export const COURSE_DRAFT_SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const
export const COURSE_CANDIDATE_LIMIT = 40
const skillSchema = z.enum(COURSE_DRAFT_SKILLS)
const codeSchema = z.string().regex(/^[A-Za-z0-9._-]{1,100}$/)
const nonblank = z.string().refine((value) => value.trim().length > 0)
const bandSchema = z.number().min(0).max(9).multipleOf(0.5)
const finalTestSchema = z.object({ code: codeSchema, title: nonblank.max(255) })

export const courseGapSchema = z.object({ knowledgePointId: z.uuid(), reason: z.string() })
export const courseAnalysisIssueSchema = z.object({ code: z.string(), subject: z.string().nullable(), related: z.string().nullable() })
export const courseAnalysisSchema = z.object({
  valid: z.boolean(), errors: z.array(courseAnalysisIssueSchema), warnings: z.array(courseAnalysisIssueSchema),
  gaps: z.array(courseGapSchema), coverage: z.object({ expected: z.int().nonnegative(), covered: z.int().nonnegative() }),
})

export const courseBlockSchema = z.object({
  type: z.enum(['TEXT', 'EXERCISE']), text: z.string().max(20000).nullable(),
  knowledgePointIds: z.array(z.uuid()).max(50), questionRefs: z.array(nonblank.max(100)).max(100),
}).superRefine((block, ctx) => {
  if (block.type === 'TEXT' && block.questionRefs.length) ctx.addIssue({ code: 'custom', path: ['questionRefs'], message: 'Block văn bản không có câu hỏi.' })
  if (block.type === 'EXERCISE') {
    if (block.text?.trim()) ctx.addIssue({ code: 'custom', path: ['text'], message: 'Block bài tập không có văn bản.' })
    if (block.knowledgePointIds.length) ctx.addIssue({ code: 'custom', path: ['knowledgePointIds'], message: 'Kiến thức của bài tập lấy từ câu hỏi.' })
    if (!block.questionRefs.length) ctx.addIssue({ code: 'custom', path: ['questionRefs'], message: 'Chọn ít nhất một câu hỏi.' })
  }
})

export const courseLessonSchema = z.object({
  code: codeSchema, title: nonblank.max(255), summary: z.string().max(2000).nullable(),
  knowledgePointIds: z.array(z.uuid()).max(50), blocks: z.array(courseBlockSchema).max(50), practiceSetPackageIds: z.array(z.uuid()).max(20),
})
export const courseTopicSchema = z.object({
  code: codeSchema, name: nonblank.max(255), skill: skillSchema, sortOrder: z.int().min(0).max(2147483647),
  lessons: z.array(courseLessonSchema).max(50), topicTest: finalTestSchema.nullable(),
})
export const courseStructureSchema = z.object({
  course: z.object({ code: codeSchema, name: nonblank.max(255), bandLevel: bandSchema }).nullable(),
  topics: z.array(courseTopicSchema).max(30), courseTest: finalTestSchema.nullable(),
  practiceTestMilestones: z.array(z.object({ packageId: z.uuid(), afterTopicSequence: z.int().positive() })).max(100),
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
  knowledgePointIds: z.array(z.uuid()).max(COURSE_CANDIDATE_LIMIT).default([]),
  lessonCount: z.int().min(1).max(30).nullable().optional(), instructions: z.string().max(500).nullable().optional(),
}).refine((body) => body.topics.length > 0 || body.knowledgePointIds.length > 0, { message: 'Chọn kiến thức hoặc nhập chủ đề.' })

export const courseDraftResultSchema = courseStructureSchema.safeExtend({
  unmatchedTopics: z.array(z.string()).optional(),
  warnings: z.array(z.object({ code: z.string(), subject: z.string() })).optional(),
  analysis: courseAnalysisSchema.optional(),
  gapHints: z.array(z.object({ knowledgePointId: z.uuid(), reason: z.string(), action: z.literal('REQUEST_QUESTION_DRAFT') })).optional(),
})
export const courseDraftSchema = aiDraftSchema.extend({
  kind: z.literal('COURSE'),
  request: z.union([z.object({}).strict(), courseGenerationRequestSchema]),
  result: courseDraftResultSchema.nullable(),
})
export const courseApprovalSchema = z.object({
  draftId: z.uuid(), courseId: z.uuid(), topicIds: z.array(z.uuid()), lessonIds: z.array(z.uuid()), finalTestPackageIds: z.array(z.uuid()),
})

export type CourseStructure = z.infer<typeof courseStructureSchema>
export type CourseDraftStructure = CourseStructure
export type CourseTopic = z.infer<typeof courseTopicSchema>
export type CourseLesson = z.infer<typeof courseLessonSchema>
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
