import { z } from 'zod'

const counts = z.record(z.string(), z.number())

/*
 * `GET /api/content/admin/overview`: counts that belong to content-service
 * (shape recorded in `backend/plans/261022-1200-rd-admin-area/phase-04`). Every field is optional so a count the
 * server does not send yet shows as unknown instead of breaking the page.
 */
export const contentOverviewSchema = z.object({
  knowledgePoints: z
    .object({
      total: z.number().nullish(),
      byStatus: counts.nullish(),
      bySkill: counts.nullish(),
      byCefr: counts.nullish(),
    })
    .nullish(),
  activeKnowledgePointsWithoutPublishedQuestion: z.number().nullish(),
  draftQuestionVersions: z.number().nullish(),
  lessons: counts.nullish(),
})

/** One item of `GET /api/learning/admin/work-items`; the schema is shared with the work queue screen. */
export { workItemSchema } from '../work-queue/types'

/** `GET /api/learning/admin/question-stats`. */
export const questionStatsSchema = z.object({
  questions: z.array(
    z.object({
      questionVersionId: z.string(),
      attempts: z.number(),
      correct: z.number(),
      medianDurationMs: z.number().nullish(),
      topErrorCodes: z.array(z.string()).nullish(),
      difficulty: z.string().nullish(),
    }),
  ),
})

export type ContentOverview = z.infer<typeof contentOverviewSchema>
export type { WorkItem } from '../work-queue/types'
export type QuestionStat = z.infer<typeof questionStatsSchema>['questions'][number]
