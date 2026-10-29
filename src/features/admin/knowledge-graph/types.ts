import { z } from 'zod'

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type CefrLevel = (typeof CEFR_LEVELS)[number]

/** `GET /api/content/knowledge-tree` node (backend/docs/contracts/knowledge-tree-v1.md). */
export const treeNodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  skill: z.string().nullish(),
  kind: z.string(),
  learningType: z.string().nullish(),
  band: z.number().nullish(),
  courseId: z.string().nullish(),
  topicId: z.string().nullish(),
  lessonIds: z.array(z.string()).nullish(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  cefrLevel: z.enum(CEFR_LEVELS).nullish(),
  canDo: z.string().nullish(),
  scopeIn: z.string().nullish(),
  scopeOut: z.string().nullish(),
})

/** An edge points from the prerequisite (`from`) to the point that depends on it (`to`). */
export const treeEdgeSchema = z.object({ from: z.string(), to: z.string() })

export const knowledgeTreeSchema = z.object({
  nodes: z.array(treeNodeSchema),
  edges: z.array(treeEdgeSchema),
})

/** `GET /api/content/knowledge-tree/health`: problems in the active part of the graph. */
export const knowledgeTreeHealthSchema = z.object({
  isolatedIds: z.array(z.string()),
  missingMetadataIds: z.array(z.string()),
  levelViolations: z.array(treeEdgeSchema),
})

/** `GET /api/content/courses`. */
export const courseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  bandLevel: z.number().nullish(),
  status: z.string().nullish(),
})

/** `GET /api/content/knowledge-points`: the whole record of a point, which the tree leaves part of out (the description). */
export const knowledgePointSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  code: z.string(),
  name: z.string(),
  kind: z.string(),
  learningType: z.string().nullish(),
  skill: z.string().nullish(),
  description: z.string().nullish(),
  status: z.string(),
  cefrLevel: z.enum(CEFR_LEVELS).nullish(),
  canDo: z.string().nullish(),
  scopeIn: z.string().nullish(),
  scopeOut: z.string().nullish(),
})

/** The body of `POST /api/content/knowledge-points` and `PUT /api/content/knowledge-points/{id}`. */
export interface KnowledgePointRequest {
  topicId: string
  code: string
  name: string
  kind: string
  learningType: string
  skill: string | null
  description: string
  cefrLevel: string | null
  canDo: string
  scopeIn: string
  scopeOut: string
}

export type KnowledgePoint = z.infer<typeof knowledgePointSchema>
export type TreeNode = z.infer<typeof treeNodeSchema>
export type TreeEdge = z.infer<typeof treeEdgeSchema>
export type KnowledgeTree = z.infer<typeof knowledgeTreeSchema>
export type KnowledgeTreeHealth = z.infer<typeof knowledgeTreeHealthSchema>
export type CourseOption = z.infer<typeof courseSchema>
