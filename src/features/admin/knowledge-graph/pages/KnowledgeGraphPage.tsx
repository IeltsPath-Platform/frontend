import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthSession } from '@/features/auth/authSession'
import { hasAnyRole } from '@/features/auth/staffRoles'
import { useAdminSearch } from '../../adminSearch'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useToast } from '@/components/toast/toastContext'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useAdminErrorToast } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import { fetchTopics } from '../../lessons/api/lessonApi'
import { AdminPage } from '../../pages/AdminPage'
import { fetchCourses, fetchKnowledgeTree, fetchKnowledgeTreeHealth } from '../api/knowledgeGraphApi'
import { activateKnowledgePoint, deactivateKnowledgePoint } from '../api/knowledgePointApi'
import { ChartDialog } from '../components/ChartDialog'
import { KnowledgePointDrawer } from '../components/KnowledgePointDrawer'
import type { PointActions } from '../components/KnowledgePointMenu'
import { KnowledgeTable } from '../components/KnowledgeTable'
import { NodeDetailDialog } from '../components/NodeDetailDialog'
import { SkillTable } from '../components/SkillTable'
import { buildChartModel } from '../lib/chartModel'
import { flagsOf, matchesQuery } from '../lib/graphView'
import type { SkillKey } from '../lib/skills'
import type { KnowledgeTreeHealth, TreeNode } from '../types'
import '../knowledge-graph.css'

const SKILL_OPTIONS = [
  { value: '', label: 'Tất cả kỹ năng' },
  { value: 'LISTENING', label: 'Listening' },
  { value: 'READING', label: 'Reading' },
  { value: 'WRITING', label: 'Writing' },
  { value: 'SPEAKING', label: 'Speaking' },
  { value: 'ALL', label: 'Grammar / Vocabulary' },
]

function HealthSummary({ health }: { health: KnowledgeTreeHealth }) {
  const problems = health.isolatedIds.length + health.missingMetadataIds.length + health.levelViolations.length
  if (problems === 0) {
    return <p className="adm-badge adm-badge--ok" role="status">Đồ thị ổn: không có KP cô lập, thiếu metadata hay cạnh ngược cấp.</p>
  }
  return (
    <ul aria-label="Kiểm tra đồ thị" className="kg-health">
      <li className={`adm-badge ${health.isolatedIds.length ? 'adm-badge--warn' : 'adm-badge--ok'}`}>
        {health.isolatedIds.length} KP chưa nối
      </li>
      <li className={`adm-badge ${health.missingMetadataIds.length ? 'adm-badge--danger' : 'adm-badge--ok'}`}>
        {health.missingMetadataIds.length} KP thiếu CEFR/can-do
      </li>
      <li className={`adm-badge ${health.levelViolations.length ? 'adm-badge--danger' : 'adm-badge--ok'}`}>
        {health.levelViolations.length} cạnh ngược cấp
      </li>
    </ul>
  )
}

export function KnowledgeGraphPage() {
  const { roles } = useAuthSession()
  const canSeeInactive = hasAnyRole(roles, ['ADMIN', 'CONTENT_AUTHOR'])
  // Only an author may write: the API refuses an admin who is not one.
  const canWrite = hasAnyRole(roles, ['CONTENT_AUTHOR'])
  const { query } = useAdminSearch()
  const [skill, setSkill] = useState('')
  const [courseId, setCourseId] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  // The skill whose org chart is open in its popup, if any.
  const [chartSkill, setChartSkill] = useState<SkillKey | null>(null)
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('kp'))

  const wantInactive = canSeeInactive && includeInactive
  const filterKey = `${skill}|${courseId}|${wantInactive}`
  const tree = useAdminResource(`tree|${filterKey}`, (signal) =>
    fetchKnowledgeTree({ skill, courseId, includeInactive: wantInactive }, signal))
  const health = useAdminResource('health', (signal) => fetchKnowledgeTreeHealth(signal))
  const courses = useAdminResource('courses', (signal) => fetchCourses(signal))

  const topics = useAdminResource('topics', (signal) => fetchTopics(signal))
  const { confirm, confirmDialog } = useAdminConfirm()
  const { toast } = useToast()
  const reportError = useAdminErrorToast()
  // The point being edited, or 'new' while a point is being created; null when the drawer is closed.
  const [editing, setEditing] = useState<TreeNode | 'new' | null>(null)

  const normalizedQuery = query.trim().toLowerCase()
  const select = useCallback((id: string) => setSelectedId(id), [])
  const reloadAll = () => { tree.reload(); health.reload() }

  async function toggleStatus(node: TreeNode) {
    const active = node.status === 'ACTIVE'
    if (active && !(await confirm({
      title: 'Ngừng dùng điểm kiến thức?',
      message: `${node.code} sẽ không còn hiện cho học viên và khi soạn bài. Bạn có thể kích hoạt lại sau.`,
      confirmLabel: 'Ngừng dùng',
      tone: 'danger',
    }))) return
    try {
      await (active ? deactivateKnowledgePoint(node.id) : activateKnowledgePoint(node.id))
      toast({ title: 'Thành công', description: active ? `Đã ngừng dùng ${node.code}.` : `Đã kích hoạt ${node.code}.`, tone: 'success' })
      reloadAll()
    } catch (reason) {
      reportError(adminErrorMessage(reason))
    }
  }

  const actions: PointActions = {
    onView: select,
    ...(canWrite ? { onEdit: setEditing, onToggleStatus: (node: TreeNode) => void toggleStatus(node) } : {}),
  }

  const model = useMemo(() => {
    const nodes = tree.data?.nodes ?? []
    const byId = new Map(nodes.map((node) => [node.id, node]))
    const prerequisites = new Map<string, TreeNode[]>()
    const dependents = new Map<string, TreeNode[]>()
    for (const edge of tree.data?.edges ?? []) {
      const from = byId.get(edge.from)
      const to = byId.get(edge.to)
      if (!from || !to) continue
      prerequisites.set(edge.to, [...(prerequisites.get(edge.to) ?? []), from])
      dependents.set(edge.from, [...(dependents.get(edge.from) ?? []), to])
    }
    return { nodes, byId, prerequisites, dependents }
  }, [tree.data])

  const flags = useMemo(() => flagsOf(health.data), [health.data])
  // Why a point carries a warning, by point id: no link, no CEFR level or can-do, or a link that runs from a higher level down.
  const warnings = useMemo(() => {
    const reasons = new Map<string, string[]>()
    const add = (id: string, reason: string) => reasons.set(id, [...(reasons.get(id) ?? []), reason])
    flags.isolated.forEach((id) => add(id, 'Chưa nối với KP active nào'))
    flags.missing.forEach((id) => add(id, 'Thiếu CEFR hoặc can-do'))
    health.data?.levelViolations.forEach((edge) => { add(edge.from, 'Có liên kết ngược cấp'); add(edge.to, 'Có liên kết ngược cấp') })
    return new Map([...reasons].map(([id, list]) => [id, [...new Set(list)].join('; ')]))
  }, [flags, health.data])
  const isDimmed = useCallback(
    (node: TreeNode) => !matchesQuery(node, normalizedQuery) || (onlyFlagged && !flags.isolated.has(node.id) && !flags.missing.has(node.id)),
    [flags, normalizedQuery, onlyFlagged],
  )

  const charts = useMemo(() => buildChartModel(model.nodes, tree.data?.edges ?? []), [model.nodes, tree.data])
  // What a search or the warning filter keeps; null when neither is on, so every point is listed and branches can be folded.
  const keep = useMemo(
    () => (normalizedQuery || onlyFlagged
      ? (node: TreeNode) => matchesQuery(node, normalizedQuery) && (!onlyFlagged || flags.isolated.has(node.id) || flags.missing.has(node.id))
      : null),
    [flags, normalizedQuery, onlyFlagged],
  )
  const looseNodes = keep ? charts.loose.filter(keep) : charts.loose
  const nothingKept = keep !== null && !model.nodes.some(keep)
  const openedSection = charts.sections.find((section) => section.skill === chartSkill) ?? null
  const matchCount = normalizedQuery ? model.nodes.filter((node) => matchesQuery(node, normalizedQuery)).length : null
  const selected = selectedId ? model.byId.get(selectedId) ?? null : null
  const courseLabel = (node: TreeNode) => {
    const course = courses.data?.find((item) => item.id === node.courseId)
    if (!course) return node.band != null ? `Band ${node.band}` : null
    return course.bandLevel != null ? `${course.name} (band ${course.bandLevel})` : course.name
  }

  return (
    <AdminPage
        actions={<>
          <button className="adm-btn" onClick={reloadAll} type="button">Tải lại</button>
          {canWrite ? <button className="adm-btn adm-btn--primary" onClick={() => setEditing('new')} type="button">Tạo điểm kiến thức</button> : null}
        </>}
        plain
        subtitle="Mỗi ô là một knowledge point. Điểm nằm dưới phải học trước điểm ngay trên nó."
        title="Cây tri thức">

      <section className="adm-block">
      <div className="adm-filters">
        <label className="adm-field">
          <span>Kỹ năng</span>
          <select className="adm-select" onChange={(event) => setSkill(event.target.value)} value={skill}>
            {SKILL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="adm-field">
          <span>Course</span>
          <select className="adm-select" onChange={(event) => setCourseId(event.target.value)} value={courseId}>
            <option value="">Tất cả course</option>
            {(courses.data ?? []).map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}{course.bandLevel != null ? ` (band ${course.bandLevel})` : ''}
              </option>
            ))}
          </select>
        </label>
        {canSeeInactive ? (
          <label className="adm-check">
            <input checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} type="checkbox" />
            Hiện KP chưa kích hoạt
          </label>
        ) : null}
        <label className="adm-check">
          <input checked={onlyFlagged} onChange={(event) => setOnlyFlagged(event.target.checked)} type="checkbox" />
          Chỉ KP có cảnh báo
        </label>
      </div>

      {health.status === 'success' && health.data ? <HealthSummary health={health.data} /> : null}
      {health.status === 'error' ? (
        <div className="adm-alert" role="alert">Không tải được kiểm tra đồ thị: {health.error}</div>
      ) : null}

      {tree.status === 'loading' ? <AdminLoading label="Đang tải cây tri thức…" /> : null}
      {tree.status === 'error' ? <AdminError message={tree.error ?? 'Không tải được cây tri thức.'} onRetry={reloadAll} /> : null}
      {tree.status === 'success' && model.nodes.length === 0 ? (
        <AdminEmpty title="Không có knowledge point nào">Thử bỏ bớt bộ lọc.</AdminEmpty>
      ) : null}

      {tree.status === 'success' && model.nodes.length > 0 ? (
        <p className="adm-muted kg-count">
          {model.nodes.length} KP · {tree.data?.edges.length ?? 0} cạnh
          {matchCount !== null ? ` · ${matchCount} khớp “${query.trim()}”` : ''}
        </p>
      ) : null}
      </section>

      {tree.status === 'success' && model.nodes.length > 0 ? (
        nothingKept ? <section className="adm-block"><AdminEmpty title="Không có knowledge point nào khớp">Thử đổi từ khóa hoặc bỏ bộ lọc cảnh báo.</AdminEmpty></section> : <>
          {charts.sections.map((section) => (
            <SkillTable
              isolated={flags.isolated}
              keep={keep}
              key={`${filterKey}|${section.skill}`}
              actions={actions}
              missing={flags.missing}
              onOpenChart={() => setChartSkill(section.skill)}
              section={section}
              selectedId={selectedId}
            />
          ))}
          {looseNodes.length ? (
            <section aria-label="Điểm kiến thức chưa nối" className="adm-block kg-skill kg-skill--loose">
              <header className="kg-skill__head">
                <h2>Chưa nối với điểm nào<span className="kg-skill__count">{looseNodes.length}</span></h2>
              </header>
              <KnowledgeTable
                isolated={flags.isolated}
                missing={flags.missing}
                actions={actions}
                nodes={looseNodes}
                selectedId={selectedId}
              />
            </section>
          ) : null}
        </>
      ) : null}

      {selected ? (
        <NodeDetailDialog
          courseLabel={courseLabel(selected)}
          dependents={model.dependents.get(selected.id) ?? []}
          isolated={flags.isolated.has(selected.id)}
          missingMetadata={flags.missing.has(selected.id)}
          node={selected}
          onClose={() => setSelectedId(null)}
          onSelect={select}
          prerequisites={model.prerequisites.get(selected.id) ?? []}
          stacked={openedSection !== null}
        />
      ) : null}

      {editing ? (
        <KnowledgePointDrawer
          node={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={reloadAll}
          topics={topics.data ?? []}
        />
      ) : null}
      {confirmDialog}

      {openedSection ? (
        <ChartDialog
          isDimmed={isDimmed}
          onClose={() => setChartSkill(null)}
          onSelect={select}
          section={openedSection}
          selectedId={selectedId}
          warnings={warnings}
        />
      ) : null}
    </AdminPage>
  )
}
