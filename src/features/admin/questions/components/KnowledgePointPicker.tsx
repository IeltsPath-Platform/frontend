import { useState } from 'react'
import { fetchKnowledgeTree } from '../../knowledge-graph/api/knowledgeGraphApi'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'

export interface LinkedKnowledgePoint { knowledgePointId: string; weight: number }

/** Links a question version to the active knowledge points it tests; every link has weight 1. */
export function KnowledgePointPicker({ value, onChange }: { value: LinkedKnowledgePoint[]; onChange: (next: LinkedKnowledgePoint[]) => void }) {
  const [filter, setFilter] = useState('')
  const points = useAdminResource('question-kp-picker', (signal) => fetchKnowledgeTree({}, signal))

  if (points.status === 'loading') return <AdminLoading label="Đang tải danh sách KP…" />
  if (points.status === 'error') return <AdminError message={points.error ?? 'Không tải được KP.'} onRetry={points.reload} />

  const selected = new Set(value.map((item) => item.knowledgePointId))
  const text = filter.trim().toLowerCase()
  const visible = (points.data?.nodes ?? []).filter((node) =>
    !text || node.code.toLowerCase().includes(text) || node.name.toLowerCase().includes(text))

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...value, { knowledgePointId: id, weight: 1 }] : value.filter((item) => item.knowledgePointId !== id))
  }

  return (
    <fieldset className="qb-kp">
      <legend className="adm-sr-only">Knowledge point liên quan</legend>
      <input
        aria-label="Lọc knowledge point"
        className="adm-input"
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Lọc theo mã hoặc tên KP"
        type="search"
        value={filter}
      />
      <ul className="qb-kp__list">
        {visible.map((node) => (
          <li key={node.id}>
            <label className="adm-check">
              <input checked={selected.has(node.id)} onChange={(event) => toggle(node.id, event.target.checked)} type="checkbox" />
              <span><code>{node.code}</code> {node.name}</span>
            </label>
          </li>
        ))}
        {visible.length === 0 ? <li className="adm-muted">Không có KP khớp.</li> : null}
      </ul>
      <p className="adm-muted">{value.length} KP đã chọn</p>
    </fieldset>
  )
}
