import { z } from 'zod'
import { apiRequest } from '@/lib/httpClient'
import {
  lessonEditorSchema,
  lessonSummarySchema,
  lessonResourceSchema,
  lessonResourcesSchema,
  type LessonResourceRequest,
  type LessonResourceType,
  type BlockRequest,
  type LessonEditor,
  type LessonMetaRequest,
  type LessonSummary,
  type NewLessonRequest,
  type TopicOption,
} from '../types'

const ADMIN = '/api/content/admin'

interface TopicNode {
  id: string
  code: string
  name: string
  sortOrder?: number | null
  status?: string | null
  skill?: string | null
  courseId?: string | null
  children?: TopicNode[] | null
  parentTopicId?: string | null
  bandMin?: number | null
  bandMax?: number | null
}

const topicNodeSchema: z.ZodType<TopicNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    sortOrder: z.number().nullish(),
    status: z.string().nullish(),
    skill: z.string().nullish(),
    courseId: z.string().nullish(),
    children: z.array(topicNodeSchema).nullish(),
    parentTopicId: z.string().nullish(),
    bandMin: z.number().nullish(),
    bandMax: z.number().nullish(),
  }))

function flatten(nodes: readonly TopicNode[], parentTopicId: string | null = null): TopicOption[] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      code: node.code,
      name: node.name,
      skill: node.skill ?? null,
      courseId: node.courseId ?? null,
      status: node.status ?? 'ACTIVE',
      sortOrder: node.sortOrder ?? 0,
      parentTopicId: node.parentTopicId ?? parentTopicId,
      bandMin: node.bandMin ?? null,
      bandMax: node.bandMax ?? null,
    },
    ...flatten(node.children ?? [], node.id),
  ])
}

/** `GET /api/content/topics` is a tree; the lesson screens want a flat list. */
export async function fetchTopics(signal?: AbortSignal): Promise<TopicOption[]> {
  const nodes = z.array(topicNodeSchema).parse(await apiRequest<unknown>('/api/content/topics', { auth: true, signal }))
  return flatten(nodes).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
}

export async function fetchLessons(topicId: string, signal?: AbortSignal): Promise<LessonSummary[]> {
  const raw = await apiRequest<unknown>(`${ADMIN}/topics/${topicId}/lessons`, { auth: true, signal })
  return z.array(lessonSummarySchema).parse(raw).sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function fetchLesson(lessonId: string, signal?: AbortSignal): Promise<LessonEditor> {
  return lessonEditorSchema.parse(await apiRequest<unknown>(`${ADMIN}/lessons/${lessonId}`, { auth: true, signal }))
}

/** Writes return nothing the screen reads: it fetches the lesson again afterwards. */
function write(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) {
  return apiRequest<unknown>(`${ADMIN}${path}`, { method, auth: true, body })
}

export async function createLesson(topicId: string, request: NewLessonRequest): Promise<void> {
  await write(`/topics/${topicId}/lessons`, 'POST', request)
}

export async function updateLesson(lessonId: string, request: LessonMetaRequest): Promise<void> {
  await write(`/lessons/${lessonId}`, 'PUT', request)
}

export async function reorderLessons(topicId: string, lessonIds: string[]): Promise<void> {
  await write(`/topics/${topicId}/lessons/order`, 'PUT', { lessonIds })
}

export async function setLessonKnowledgePoints(lessonId: string, knowledgePointIds: string[]): Promise<void> {
  await write(`/lessons/${lessonId}/knowledge-points`, 'PUT', { knowledgePointIds })
}

export async function addBlock(lessonId: string, request: BlockRequest): Promise<void> {
  await write(`/lessons/${lessonId}/blocks`, 'POST', request)
}

export async function updateBlock(lessonId: string, blockId: string, request: BlockRequest): Promise<void> {
  await write(`/lessons/${lessonId}/blocks/${blockId}`, 'PUT', request)
}

export async function deleteBlock(lessonId: string, blockId: string): Promise<void> {
  await write(`/lessons/${lessonId}/blocks/${blockId}`, 'DELETE')
}

export async function reorderBlocks(lessonId: string, blockIds: string[]): Promise<void> {
  await write(`/lessons/${lessonId}/blocks/order`, 'PUT', { blockIds })
}

export async function publishLesson(lessonId: string): Promise<void> {
  await write(`/lessons/${lessonId}/publish`, 'POST')
}

export async function archiveLesson(lessonId: string): Promise<void> {
  await write(`/lessons/${lessonId}/archive`, 'POST')
}

export async function fetchLessonResources(lessonId: string, signal?: AbortSignal) {
  return lessonResourcesSchema.parse(await apiRequest<unknown>(`${ADMIN}/lessons/${lessonId}/resources`, { auth: true, signal }))
}

export async function createLessonResource(lessonId: string, body: LessonResourceRequest & { type: LessonResourceType }) {
  return lessonResourceSchema.parse(await write(`/lessons/${lessonId}/resources`, 'POST', body))
}

export async function updateLessonResource(lessonId: string, resourceId: string, body: LessonResourceRequest) {
  return lessonResourceSchema.parse(await write(`/lessons/${lessonId}/resources/${resourceId}`, 'PUT', body))
}

export async function deleteLessonResource(lessonId: string, resourceId: string): Promise<void> {
  await write(`/lessons/${lessonId}/resources/${resourceId}`, 'DELETE')
}

const vocabularySearchSchema = z.array(
  z.object({
    id: z.string(),
    lemma: z.string(),
    ipa: z.string().nullish(),
    status: z.string().nullish(),
    senses: z
      .array(
        z.object({
          id: z.string(),
          partOfSpeech: z.string().nullish(),
          englishDefinition: z.string().nullish(),
          vietnameseMeaning: z.string().nullish(),
          exampleSentence: z.string().nullish(),
          status: z.string().nullish(),
        }),
      )
      .nullish(),
  }),
)

export type VocabularyHit = z.infer<typeof vocabularySearchSchema>[number]

/** library-service `GET /api/content/vocabulary/search`: entries with their senses. */
export async function searchVocabulary(query: string, signal?: AbortSignal): Promise<VocabularyHit[]> {
  const params = new URLSearchParams({ query })
  return vocabularySearchSchema.parse(
    await apiRequest<unknown>(`/api/content/vocabulary/search?${params}`, { auth: true, signal }),
  )
}
