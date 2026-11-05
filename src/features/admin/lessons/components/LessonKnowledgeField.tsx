import { KnowledgeSelectField } from '../../components/KnowledgeSelectField'
import { fetchKnowledgeTree } from '../../knowledge-graph/api/knowledgeGraphApi'
import { CEFR_LEVELS, type CefrLevel } from '../../knowledge-graph/types'
import { useAdminResource } from '../../lib/useAdminResource'

const rank = (level: CefrLevel | null | undefined) => (level ? CEFR_LEVELS.indexOf(level) : -1)

/**
 * The knowledge points a lesson, or one of its blocks, teaches. Every active point is on offer, highest level first,
 * and a point without a level is listed apart so it can still be chosen.
 */
export function LessonKnowledgeField({ title, value, onChange, disabled }: {
  title: string
  value: readonly string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  const knowledge = useAdminResource('lesson-knowledge-points', (signal) => fetchKnowledgeTree({}, signal))
  const offered = [...(knowledge.data?.nodes ?? [])].sort((left, right) => rank(right.cefrLevel) - rank(left.cefrLevel) || left.code.localeCompare(right.code))
  return <KnowledgeSelectField disabled={disabled} knowledge={knowledge} offered={offered} onChange={onChange} scope={`${offered.length} điểm kiến thức đang hoạt động`} title={title} value={value} />
}
