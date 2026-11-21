import { z } from 'zod'

const counts = z.record(z.string(), z.number())

const coverageCellSchema = z.object({
  skill: z.string(),
  cefrLevel: z.string(),
  activeKnowledgePoints: z.number(),
  withoutPublishedQuestion: z.number(),
  withOnePublishedQuestion: z.number(),
})

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
  /** Active knowledge points by skill and CEFR level, with how many lack a published question or have exactly one. */
  coverage: z.array(coverageCellSchema).nullish(),
  /** Question versions and packages by status. */
  questionVersions: counts.nullish(),
  packages: counts.nullish(),
  /** Draft question versions nobody touched for `staleDraftAfterDays` days. */
  staleDraftQuestionVersions: z.number().nullish(),
  staleDraftAfterDays: z.number().nullish(),
})

/** What a question version is about, by the start of its stem; `GET /api/content/admin/overview/question-labels`. */
export const questionLabelsSchema = z.array(z.object({
  questionVersionId: z.string(),
  questionId: z.string(),
  label: z.string(),
  skill: z.string().nullish(),
  questionType: z.string().nullish(),
}))

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
export type CoverageCell = z.infer<typeof coverageCellSchema>
export type QuestionLabel = z.infer<typeof questionLabelsSchema>[number]
export type { WorkItem } from '../work-queue/types'
export type QuestionStat = z.infer<typeof questionStatsSchema>['questions'][number]
