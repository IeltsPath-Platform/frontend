import { z } from 'zod'

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024
export const importIssueSchema = z.object({ sheet: z.string(), row: z.int().nonnegative(), column: z.string(), code: z.string(), message: z.string() })
const cellsSchema = z.record(z.string(), z.string()).default({})
const packageNodeSchema = z.object({ cells: cellsSchema, sheet: z.string(), row: z.int(), kind: z.string(), code: z.string(), title: z.string(), afterTopicSequence: z.string(), questionRefs: z.array(z.string()) })
const lessonNodeSchema = z.object({
  cells: cellsSchema, row: z.int(), code: z.string(), title: z.string(), knowledgePointCodes: z.array(z.string()),
  blocks: z.array(z.object({ cells: cellsSchema, row: z.int(), type: z.string(), questionRefs: z.array(z.string()) })), practiceSets: z.array(packageNodeSchema),
})
export const importOutlineSchema = z.object({
  course: z.object({ cells: cellsSchema, row: z.int(), code: z.string(), name: z.string(), bandLevel: z.string() }).nullable(),
  topics: z.array(z.object({ cells: cellsSchema, row: z.int(), code: z.string(), name: z.string(), skill: z.string(), sortOrder: z.string(), lessons: z.array(lessonNodeSchema), tests: z.array(packageNodeSchema) })),
  courseTests: z.array(packageNodeSchema), milestones: z.array(packageNodeSchema),
  questions: z.array(z.object({ cells: cellsSchema, row: z.int(), importRef: z.string(), type: z.string(), skill: z.string() })),
})
export type ImportOutline = z.infer<typeof importOutlineSchema>
export const importReportSchema = z.object({
  valid: z.boolean(), errors: z.array(importIssueSchema), warnings: z.array(importIssueSchema), outline: importOutlineSchema.nullish(),
  summary: z.object({ topics: z.int().nonnegative(), lessons: z.int().nonnegative(), questions: z.int().nonnegative(), packages: z.int().nonnegative() }).optional(),
})
export const importSuccessSchema = z.object({ courseId: z.guid(), topicIds: z.array(z.guid()), lessonIds: z.array(z.guid()), questionIds: z.array(z.guid()), packageIds: z.array(z.guid()), packageTitles: z.record(z.guid(), z.string()).optional(), warnings: z.array(importIssueSchema) })
export type ImportReport = z.infer<typeof importReportSchema>
export type ImportIssue = z.infer<typeof importIssueSchema>
export type ImportSuccess = z.infer<typeof importSuccessSchema>

const draftRowSchema = z.object({ number: z.int(), cells: z.record(z.string(), z.string()) })
export const importSheetsSchema = z.record(z.string(), z.array(draftRowSchema))
export const importDraftSchema = z.object({
  id: z.guid(), filename: z.string(), status: z.enum(['DRAFT', 'IMPORTED']), importedCourseId: z.guid().nullable(), updatedAt: z.string(),
  sheets: importSheetsSchema, report: importReportSchema,
})
export const importDraftSummarySchema = z.object({
  id: z.guid(), filename: z.string(), status: z.enum(['DRAFT', 'IMPORTED']), importedCourseId: z.guid().nullable(),
  courseCode: z.string().nullable(), courseName: z.string().nullable(), updatedAt: z.string(),
})
export type ImportSheets = z.infer<typeof importSheetsSchema>
export type ImportDraft = z.infer<typeof importDraftSchema>
export type ImportDraftSummary = z.infer<typeof importDraftSummarySchema>
