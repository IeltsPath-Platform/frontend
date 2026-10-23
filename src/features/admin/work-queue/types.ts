import { z } from 'zod'

export const WORK_KINDS = ['CONTENT_GAP', 'QUESTION_TOO_EASY', 'QUESTION_TOO_HARD', 'EDGE_SUSPECT'] as const
export const WORK_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE'] as const
export type WorkKind = (typeof WORK_KINDS)[number]
export type WorkStatus = (typeof WORK_STATUSES)[number]

const edgeEnd = z.object({ id: z.string(), code: z.string().nullish(), name: z.string().nullish() })

/** What a work item is about, as Content names it. Null when Content does not know it or cannot be reached. */
export const workSubjectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('KNOWLEDGE_POINT'), id: z.string(), code: z.string().nullish(), name: z.string().nullish(), occurrences: z.number().nullish() }),
  z.object({ type: z.literal('QUESTION'), questionId: z.string(), questionVersionId: z.string().nullish(), stemPreview: z.string().nullish() }),
  z.object({ type: z.literal('EDGE'), from: edgeEnd, to: edgeEnd }),
])

export const workItemSchema = z.object({
  id: z.string(),
  queue: z.string(),
  kind: z.string(),
  subjectRef: z.string().nullish(),
  /** JSON text with the numbers behind the item. */
  detail: z.string().nullish(),
  status: z.enum(WORK_STATUSES),
  assigneeId: z.string().nullish(),
  action: z.string().nullish(),
  result: z.string().nullish(),
  note: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  subject: workSubjectSchema.nullish(),
})

export type WorkItem = z.infer<typeof workItemSchema>
export type WorkSubject = z.infer<typeof workSubjectSchema>

export interface WorkUpdate {
  status?: WorkStatus
  action?: string
  result?: string
  note?: string
}
