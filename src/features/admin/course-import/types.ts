import { z } from 'zod'

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024
export const importIssueSchema = z.object({ sheet: z.string(), row: z.int().nonnegative(), column: z.string(), code: z.string(), message: z.string() })
export const importReportSchema = z.object({
  valid: z.boolean(), errors: z.array(importIssueSchema), warnings: z.array(importIssueSchema),
  summary: z.object({ topics: z.int().nonnegative(), lessons: z.int().nonnegative(), questions: z.int().nonnegative(), packages: z.int().nonnegative() }).optional(),
})
export const importSuccessSchema = z.object({ courseId: z.uuid(), topicIds: z.array(z.uuid()), lessonIds: z.array(z.uuid()), questionIds: z.array(z.uuid()), packageIds: z.array(z.uuid()), warnings: z.array(importIssueSchema) })
export type ImportReport = z.infer<typeof importReportSchema>
export type ImportIssue = z.infer<typeof importIssueSchema>
export type ImportSuccess = z.infer<typeof importSuccessSchema>
