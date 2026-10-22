import { useCallback, useMemo, useState } from 'react'
import { Controls, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAuthSession } from '@/features/auth/authSession'
import { hasAnyRole } from '@/features/auth/staffRoles'
import { useAdminSearch } from '../../adminSearch'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { fetchCourses, fetchKnowledgeTree, fetchKnowledgeTreeHealth } from '../api/knowledgeGraphApi'
import { KnowledgeTable } from '../components/KnowledgeTable'
import { NodeDetailPanel } from '../components/NodeDetailPanel'
import { NODE_TYPES } from '../components/nodeTypes'
import { buildFlow, flagsOf, matchesQuery } from '../lib/graphView'
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
  const { query } = useAdminSearch()
  const [skill, setSkill] = useState('')
  const [courseId, setCourseId] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const [view, setView] = useState<'graph' | 'table'>('graph')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const wantInactive = canSeeInactive && includeInactive
  const filterKey = `${skill}|${courseId}|${wantInactive}`
  const tree = useAdminResource(`tree|${filterKey}`, (signal) =>
    fetchKnowledgeTree({ skill, courseId, includeInactive: wantInactive }, signal))
  const health = useAdminResource('health', (signal) => fetchKnowledgeTreeHealth(signal))
  const courses = useAdminResource('courses', (signal) => fetchCourses(signal))

  const normalizedQuery = query.trim().toLowerCase()
  const select = useCallback((id: string) => setSelectedId(id), [])
  const reloadAll = () => { tree.reload(); health.reload() }

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
  const flow = useMemo(
    () => (tree.data
      ? buildFlow({ tree: tree.data, health: health.data, selectedId, query: normalizedQuery, onlyFlagged, onSelect: select })
      : null),
    [tree.data, health.data, selectedId, normalizedQuery, onlyFlagged, select],
  )

  const tableNodes = model.nodes.filter((node) =>
    matchesQuery(node, normalizedQuery) && (!onlyFlagged || flags.isolated.has(node.id) || flags.missing.has(node.id)))
  const matchCount = normalizedQuery ? model.nodes.filter((node) => matchesQuery(node, normalizedQuery)).length : null
  const selected = selectedId ? model.byId.get(selectedId) ?? null : null
  const courseLabel = (node: TreeNode) => {
    const course = courses.data?.find((item) => item.id === node.courseId)
    if (!course) return node.band != null ? `Band ${node.band}` : null
    return course.bandLevel != null ? `${course.name} (band ${course.bandLevel})` : course.name
  }

  return (
    <AdminPage
        actions={<button className="adm-btn" onClick={reloadAll} type="button">Tải lại</button>}
        subtitle="Mỗi nút là một knowledge point: cột là cấp CEFR, hàng là kỹ năng, mũi tên chỉ từ kiến thức cần học trước."
        title="Cây tri thức">

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
        <div aria-label="Cách hiển thị" className="kg-tabs" role="group">
          <button aria-pressed={view === 'graph'} className="adm-btn" onClick={() => setView('graph')} type="button">Đồ thị</button>
          <button aria-pressed={view === 'table'} className="adm-btn" onClick={() => setView('table')} type="button">Bảng</button>
        </div>
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
        <>
          <p className="adm-muted kg-count">
            {model.nodes.length} KP · {tree.data?.edges.length ?? 0} cạnh
            {matchCount !== null ? ` · ${matchCount} khớp “${query.trim()}”` : ''}
          </p>
          <div className={`kg-layout${selected ? ' has-panel' : ''}`}>
            {view === 'graph' && flow ? (
              <div aria-label="Đồ thị knowledge point" className="kg-canvas" role="group">
                <ReactFlow
                  colorMode="dark"
                  edges={flow.edges}
                  fitView
                  fitViewOptions={{ padding: 0.08 }}
                  key={filterKey}
                  maxZoom={1.5}
                  minZoom={0.15}
                  nodes={flow.nodes}
                  nodesConnectable={false}
                  nodesDraggable={false}
                  nodeTypes={NODE_TYPES}
                  onPaneClick={() => setSelectedId(null)}
                >
                  <Controls showInteractive={false} />
                </ReactFlow>
              </div>
            ) : (
              <KnowledgeTable
                isolated={flags.isolated}
                missing={flags.missing}
                nodes={tableNodes}
                onSelect={select}
                selectedId={selectedId}
              />
            )}
            {selected ? (
              <NodeDetailPanel
                courseLabel={courseLabel(selected)}
                dependents={model.dependents.get(selected.id) ?? []}
                isolated={flags.isolated.has(selected.id)}
                missingMetadata={flags.missing.has(selected.id)}
                node={selected}
                onClose={() => setSelectedId(null)}
                onSelect={select}
                prerequisites={model.prerequisites.get(selected.id) ?? []}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </AdminPage>
  )
}
