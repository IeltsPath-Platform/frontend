import { createContext, useContext } from 'react'
import type { AdminResource } from '../../lib/useAdminResource'
import type { KnowledgeTree } from '../../knowledge-graph/types'
import type { QuestionPage } from '../../questions/types'

/**
 * What the lesson and block editors read to show names instead of ids: the knowledge points, the published learning
 * questions, and the band of the course being edited. The structure editor loads them once for the whole draft.
 */
export interface CourseDraftCatalog {
  knowledge: AdminResource<KnowledgeTree>
  questions: AdminResource<QuestionPage>
  bandLevel: number | null
}

const idle = { status: 'success', data: null, error: null, reload: () => undefined, refresh: () => undefined } as const
export const CourseDraftCatalogContext = createContext<CourseDraftCatalog>({ knowledge: idle, questions: idle, bandLevel: null })

export function useCourseDraftCatalog() { return useContext(CourseDraftCatalogContext) }
