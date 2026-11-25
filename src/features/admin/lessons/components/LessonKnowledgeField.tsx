import { KnowledgeSelectField } from '../../components/KnowledgeSelectField'
import { fetchKnowledgeTree } from '../../knowledge-graph/api/knowledgeGraphApi'
import { CEFR_LEVELS, type CefrLevel } from '../../knowledge-graph/types'
import { useAdminResource } from '../../lib/useAdminResource'
import { missingPrerequisites, prerequisiteSelection } from '../lib/knowledge-prerequisites'

const rank = (level: CefrLevel | null | undefined) => (level ? CEFR_LEVELS.indexOf(level) : -1)

/**
 * The knowledge points a lesson, or one of its blocks, teaches. Every active point is on offer, highest level first,
 * and a point without a level is listed apart so it can still be chosen.
 */
export function LessonKnowledgeField({ title, value, onChange, skill, disabled, warnMissingPrerequisites = false }: {
  title: string
  value: readonly string[]
  onChange: (next: string[]) => void
  /** The skill of the topic the lesson is in: the picker opens on its points. */
  skill?: string | null
  disabled?: boolean
  /** Shows direct prerequisite points missing from lesson-level selection. */
  warnMissingPrerequisites?: boolean
}) {
  const knowledge = useAdminResource('lesson-knowledge-points', (signal) => fetchKnowledgeTree({}, signal))
  const offered = [...(knowledge.data?.nodes ?? [])].sort((left, right) => rank(right.cefrLevel) - rank(left.cefrLevel) || left.code.localeCompare(right.code))
  const groups = warnMissingPrerequisites && knowledge.status === 'success'
    ? missingPrerequisites(value, knowledge.data?.edges ?? [], offered)
    : []
  const shownGroups = groups.slice(0, 3)
  const shownPrerequisiteIds = new Set(shownGroups.flatMap((group) => group.missing.map((point) => point.id)))
  const otherPrerequisiteCount = new Set(groups.flatMap((group) => group.missing.map((point) => point.id)))
    .size - shownPrerequisiteIds.size

  return <>
    <KnowledgeSelectField disabled={disabled} knowledge={knowledge} offered={offered} onChange={onChange} skill={skill} scope={`${offered.length} điểm kiến thức đang hoạt động`} title={title} value={value} />
    {groups.length > 0 ? <div className="adm-alert ls-kp-prerequisites" role="note">
      <p>Thiếu điểm kiến thức tiên quyết:</p>
      <ul>{shownGroups.map(({ point, missing }) => <li key={point.id}>
        <code title={point.name}>{point.code}</code> cần {missing.map((prerequisite, index) => <span key={prerequisite.id}>
          {index > 0 ? ', ' : ''}<code title={prerequisite.name}>{prerequisite.code}</code>
        </span>)}
      </li>)}</ul>
      {groups.length > shownGroups.length || otherPrerequisiteCount > 0 ? <span>và {otherPrerequisiteCount || groups.length - shownGroups.length} KP khác.</span> : null}
      <button className="adm-btn adm-btn--small" disabled={disabled || value.length >= 50} onClick={() => onChange(prerequisiteSelection(value, groups))} type="button">Thêm tiên quyết</button>
    </div> : null}
  </>
}
