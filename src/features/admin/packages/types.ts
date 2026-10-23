import { z } from 'zod'

export const packageStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
export const PACKAGE_TYPES = ['MOCK_TEST', 'PLACEMENT_TEST', 'PRACTICE_SET', 'PRACTICE_TEST', 'QUIZ', 'LESSON', 'TOPIC_TEST', 'COURSE_TEST'] as const
export const packageTypeSchema = z.enum(PACKAGE_TYPES)
export const sectionSkillSchema = z.enum(['READING', 'LISTENING', 'WRITING', 'SPEAKING'])
export const sectionAudioSchema = z.object({
  assetId: z.guid(), mediaReference: z.string(), mediaUrl: z.string().nullable(),
  durationSeconds: z.int().nullable(), transcript: z.string().nullable(),
})
export const sectionQuestionSchema = z.object({
  id: z.guid(), questionVersionId: z.guid(), questionId: z.guid().nullable(), sortOrder: z.int(), maxScore: z.number(),
  stem: z.string().nullable(), status: z.string().nullable(), purpose: z.string().nullable(),
})
export const packageSectionSchema = z.object({
  id: z.guid(), title: z.string(), skill: sectionSkillSchema.nullable(), sortOrder: z.int(),
  timeLimitSeconds: z.int().nullable(), partNo: z.int().min(1).max(4).nullable(),
  coverAssetId: z.guid().nullable(), instructions: z.string().nullable(),
  passage: z.string().nullable(), audio: sectionAudioSchema.nullable(), questions: z.array(sectionQuestionSchema),
})
export const packageVersionSchema = z.object({
  id: z.guid(), versionNumber: z.int().positive(), status: packageStatusSchema, rulesJson: z.string(),
  publishedAt: z.iso.datetime().nullable(), publishAt: z.iso.datetime().nullable(),
  lastPublishError: z.string().nullable(), sections: z.array(packageSectionSchema),
})
export const publishedPackageSchema = z.object({
  id: z.guid(), code: z.string(), title: z.string(),
  packageType: packageTypeSchema,
  accessLevel: z.enum(['FREE', 'PREMIUM']), status: packageStatusSchema,
  currentPublishedVersionId: z.guid().nullable(), lessonId: z.guid().nullable(),
  sourceCode: z.string().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
})
export const packageListItemSchema = publishedPackageSchema.extend({
  topicId: z.guid().nullable(), courseId: z.guid().nullable(), latestVersionNumber: z.int().positive().nullable(), hasDraft: z.boolean(),
})
export const contentPackageSchema = publishedPackageSchema.extend({
  topicId: z.guid().nullable(), courseId: z.guid().nullable(),
  versions: z.array(packageVersionSchema),
})
export const sectionRequestSchema = z.object({
  title: z.string().trim().min(1).max(255), skill: sectionSkillSchema.nullable(),
  sortOrder: z.int().min(-2147483648).max(2147483647),
  timeLimitSeconds: z.int().min(-2147483648).max(2147483647).nullable(),
  instructions: z.string().nullable(), partNo: z.int().min(1).max(4).nullable(), coverAssetId: z.guid().nullable(),
})
export const sectionOrderSchema = z.object({ sectionIds: z.array(z.guid()).refine((ids) => new Set(ids).size === ids.length) })
export const packageFiltersSchema = z.object({
  type: packageTypeSchema.optional(), status: packageStatusSchema.optional(), lessonId: z.guid().optional(),
  topicId: z.guid().optional(), courseId: z.guid().optional(), q: z.string().optional(),
})
export const createPackageRequestSchema = z.object({
  code: z.string().trim().min(1).max(100), title: z.string().trim().min(1).max(255),
  packageType: packageTypeSchema.exclude(['LESSON']), accessLevel: z.enum(['FREE', 'PREMIUM']).optional(),
  lessonId: z.guid().nullable().optional(), sourceCode: z.string().max(40).nullable().optional(),
  topicId: z.guid().nullable().optional(), courseId: z.guid().nullable().optional(),
}).superRefine((body, ctx) => {
  const issue = (path: string) => ctx.addIssue({ code: 'custom', message: 'Liên kết không phù hợp với loại gói.', path: [path] })
  if (body.packageType === 'TOPIC_TEST') {
    if (!body.topicId) issue('topicId')
    if (body.lessonId || body.courseId || body.sourceCode) issue('packageType')
  } else if (body.packageType === 'COURSE_TEST') {
    if (!body.courseId) issue('courseId')
    if (body.lessonId || body.topicId || body.sourceCode) issue('packageType')
  } else if (body.topicId || body.courseId) issue('packageType')
  if (body.lessonId && body.packageType !== 'PRACTICE_SET') issue('lessonId')
  if (body.sourceCode != null && body.packageType !== 'PRACTICE_TEST') issue('sourceCode')
})
export const addSectionQuestionRequestSchema = z.object({ questionVersionId: z.guid(), maxScore: z.number().positive().optional() })
export const sectionQuestionOrderSchema = z.object({ sectionQuestionIds: z.array(z.guid()).refine((ids) => new Set(ids).size === ids.length) })
export const passageRequestSchema = z.object({ text: z.string().max(50000).refine((text) => text.trim().length > 0) })
export const audioRequestSchema = z.object({
  mediaReference: z.string().min(1).max(300).refine((key) => {
    const segments = key.split('/')
    return segments.length <= 8 && segments.every((part) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(part) && !part.endsWith('.'))
  }),
  durationSeconds: z.int().min(1).max(7200), transcript: z.string().max(50000).nullable(),
})
export const AUDIO_MAX_BYTES = 25 * 1024 * 1024
export const AUDIO_CONTENT_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'] as const
export const audioUploadSchema = z.object({ mediaReference: z.string(), mediaUrl: z.string(), contentType: z.enum(AUDIO_CONTENT_TYPES), sizeBytes: z.int().positive().max(AUDIO_MAX_BYTES) })
export const publicationScheduleSchema = z.object({ packageId: z.guid(), versionId: z.guid(), publishAt: z.iso.datetime().nullable(), lastPublishError: z.string().nullable() })
export const practiceSourceSchema = z.object({ code: z.string(), name: z.string() })
export const packagePreviewSchema = z.object({
  packageVersionId: z.guid(), packageId: z.guid(), packageType: packageTypeSchema, topicId: z.guid().nullable(), rules: z.json(),
  sections: z.array(z.object({
    sectionId: z.guid(), title: z.string(), skill: sectionSkillSchema.nullable(), instructions: z.string().nullable(), sortOrder: z.int(),
    passage: z.string().nullable(), audio: z.object({ assetId: z.guid(), mediaUrl: z.string(), durationSeconds: z.int().nullable() }).nullable(),
    items: z.array(z.object({
      questionVersionId: z.guid(), sortOrder: z.int(), stem: z.string(), options: z.union([
        z.record(z.string(), z.string()),
        z.array(z.object({ optionKey: z.string(), content: z.string(), sortOrder: z.int() })),
      ]).nullable(), hint: z.string().nullable(), maxScore: z.number(),
      knowledgePointMappings: z.array(z.object({ knowledgePointId: z.guid(), weight: z.number() })),
    })),
  })),
  answers: z.array(z.object({
    sectionId: z.guid(), audioTranscript: z.string().nullable(),
    items: z.array(z.object({ questionVersionId: z.guid(), answerSpec: z.json(), explanation: z.string().nullable(), hint: z.string().nullable() })),
  })),
})
export type ContentPackage = z.infer<typeof contentPackageSchema>
export type PackageVersion = z.infer<typeof packageVersionSchema>
export type PackageSection = z.infer<typeof packageSectionSchema>
export type SectionRequest = z.infer<typeof sectionRequestSchema>
export type PackageType = z.infer<typeof packageTypeSchema>
export type PackageFilters = z.infer<typeof packageFiltersSchema>
export type PackageListItem = z.infer<typeof packageListItemSchema>
export type CreatePackageRequest = z.infer<typeof createPackageRequestSchema>
export type SectionQuestion = z.infer<typeof sectionQuestionSchema>
export type AddSectionQuestionRequest = z.infer<typeof addSectionQuestionRequestSchema>
export type PassageRequest = z.infer<typeof passageRequestSchema>
export type AudioRequest = z.infer<typeof audioRequestSchema>
export type SectionAudio = z.infer<typeof sectionAudioSchema>
export type AudioUpload = z.infer<typeof audioUploadSchema>
export type PackagePreview = z.infer<typeof packagePreviewSchema>
export type PublicationSchedule = z.infer<typeof publicationScheduleSchema>
export type PracticeSource = z.infer<typeof practiceSourceSchema>
