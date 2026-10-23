import { z } from 'zod'

export const packageStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
export const sectionSkillSchema = z.enum(['READING', 'LISTENING', 'WRITING', 'SPEAKING'])
export const packageSectionSchema = z.object({
  id: z.uuid(), title: z.string(), skill: sectionSkillSchema.nullable(), sortOrder: z.int(),
  timeLimitSeconds: z.int().nullable(), partNo: z.int().min(1).max(4).nullable(),
  coverAssetId: z.uuid().nullable(), instructions: z.string().nullable(),
  questions: z.array(z.object({
    id: z.uuid(), questionVersionId: z.uuid(), sortOrder: z.int(), maxScore: z.number(),
  })),
})
export const packageVersionSchema = z.object({
  id: z.uuid(), versionNumber: z.int().positive(), status: packageStatusSchema, rulesJson: z.string(),
  publishedAt: z.iso.datetime().nullable(), publishAt: z.iso.datetime().nullable(),
  lastPublishError: z.string().nullable(), sections: z.array(packageSectionSchema),
})
export const contentPackageSchema = z.object({
  id: z.uuid(), code: z.string(), title: z.string(),
  packageType: z.enum(['MOCK_TEST', 'PLACEMENT_TEST', 'PRACTICE_SET', 'PRACTICE_TEST', 'QUIZ', 'LESSON', 'TOPIC_TEST', 'COURSE_TEST']),
  accessLevel: z.enum(['FREE', 'PREMIUM']), status: packageStatusSchema,
  currentPublishedVersionId: z.uuid().nullable(), lessonId: z.uuid().nullable(), courseId: z.uuid().nullable(),
  sourceCode: z.string().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  versions: z.array(packageVersionSchema),
})
export const sectionRequestSchema = z.object({
  title: z.string().trim().min(1).max(255), skill: sectionSkillSchema.nullable(),
  sortOrder: z.int().min(-2147483648).max(2147483647),
  timeLimitSeconds: z.int().min(-2147483648).max(2147483647).nullable(),
  instructions: z.string().nullable(), partNo: z.int().min(1).max(4).nullable(), coverAssetId: z.uuid().nullable(),
})
export const sectionOrderSchema = z.object({ sectionIds: z.array(z.uuid()).refine((ids) => new Set(ids).size === ids.length) })
export type ContentPackage = z.infer<typeof contentPackageSchema>
export type PackageVersion = z.infer<typeof packageVersionSchema>
export type PackageSection = z.infer<typeof packageSectionSchema>
export type SectionRequest = z.infer<typeof sectionRequestSchema>
