import { KnowledgeSelectField } from '../../components/KnowledgeSelectField'
import { SKILL_LABEL } from '../../courses/types'
import { CEFR_LEVELS, type CefrLevel } from '../../knowledge-graph/types'
import { useCourseDraftCatalog } from '../lib/courseDraftCatalog'
import { cefrForBand, courseKnowledgeLevels, courseKnowledgeOptions } from '../lib/courseKnowledgeOptions'

/**
 * The knowledge points a lesson (or one block of it) of a course draft teaches. The picker offers the points of the
 * course band and the level below, as the request form does; a point attached already stays in the table even when it
 * is outside that list.
 */
export function CourseKnowledgeField({ title, value, onChange, skill, limit = 50, disabled }: {
  title: string; value: readonly string[]; onChange: (next: string[]) => void; skill: string; limit?: number; disabled: boolean
}) {
  const { knowledge, bandLevel } = useCourseDraftCatalog()
  const nodes = knowledge.data?.nodes ?? []
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const suggested = bandLevel === null ? nodes.filter((node) => node.cefrLevel) : courseKnowledgeOptions(nodes, bandLevel, [skill])
  // A point already attached but outside the suggestion (a foundation point the generator added, say) is listed too,
  // ticked, so the dialog never shows fewer points than the count says.
  const suggestedIds = new Set(suggested.map((node) => node.id))
  const attached = value.map((id) => byId.get(id)).filter((node): node is NonNullable<typeof node> => !!node?.cefrLevel && !suggestedIds.has(node.id))
  const rank = (node: { cefrLevel?: string | null }) => CEFR_LEVELS.indexOf(node.cefrLevel as CefrLevel)
  const offered = [...suggested, ...attached].sort((left, right) => rank(right) - rank(left))
  const scope = bandLevel === null ? 'chưa đặt band khóa học'
    : `band ${bandLevel.toFixed(1)} · ${SKILL_LABEL[skill as keyof typeof SKILL_LABEL] ?? skill} · cấp ${courseKnowledgeLevels(bandLevel).join(' và ') || (cefrForBand(bandLevel) ?? '—')}`

  return <KnowledgeSelectField disabled={disabled} knowledge={knowledge} limit={limit} offered={offered} onChange={onChange} scope={scope} title={title} value={value} />
}
