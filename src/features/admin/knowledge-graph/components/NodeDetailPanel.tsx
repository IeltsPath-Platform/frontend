import { X } from 'lucide-react'
import type { TreeNode } from '../types'
import { LANE_LABEL, laneOf } from '../lib/layout'

export interface NodeDetailPanelProps {
  node: TreeNode
  prerequisites: readonly TreeNode[]
  dependents: readonly TreeNode[]
  courseLabel: string | null
  isolated: boolean
  missingMetadata: boolean
  onSelect: (id: string) => void
  onClose: () => void
}

function RelatedList({ title, items, onSelect }: { title: string; items: readonly TreeNode[]; onSelect: (id: string) => void }) {
  return (
    <section className="kg-panel__section">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="adm-muted">Không có.</p>
      ) : (
        <ul className="kg-related">
          {items.map((item) => (
            <li key={item.id}>
              <button className="kg-link" onClick={() => onSelect(item.id)} type="button">
                {item.code}
              </button>
              <span className="adm-muted"> {item.name}</span>
              {item.cefrLevel ? <span className="adm-badge adm-badge--muted">{item.cefrLevel}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function NodeDetailPanel(props: NodeDetailPanelProps) {
  const { node, prerequisites, dependents, courseLabel, isolated, missingMetadata, onSelect, onClose } = props
  const lessonCount = node.lessonIds?.length ?? 0
  return (
    <aside aria-label={`Chi tiết ${node.code}`} className="adm-card kg-panel">
      <div className="kg-panel__head">
        <div>
          <p className="kg-panel__code">{node.code}</p>
          <h2>{node.name}</h2>
        </div>
        <button aria-label="Đóng chi tiết" className="adm-btn adm-btn--small" onClick={onClose} type="button">
          <X aria-hidden="true" size={14} />
        </button>
      </div>

      <div className="kg-panel__badges">
        <span className={`adm-badge ${node.status === 'ACTIVE' ? 'adm-badge--ok' : 'adm-badge--muted'}`}>
          {node.status === 'ACTIVE' ? 'Đang dùng' : 'Chưa kích hoạt'}
        </span>
        <span className="adm-badge">{node.cefrLevel ?? 'Chưa có cấp CEFR'}</span>
        <span className="adm-badge">{LANE_LABEL[laneOf(node.skill)]}</span>
        <span className="adm-badge">{node.kind}</span>
        {isolated ? <span className="adm-badge adm-badge--warn">Chưa nối vào đồ thị</span> : null}
        {missingMetadata ? <span className="adm-badge adm-badge--danger">Thiếu CEFR hoặc can-do</span> : null}
      </div>

      <dl className="kg-panel__facts">
        <dt>Can-do</dt>
        <dd>{node.canDo || <span className="adm-muted">Chưa có.</span>}</dd>
        <dt>Trong phạm vi</dt>
        <dd>{node.scopeIn || <span className="adm-muted">Chưa có.</span>}</dd>
        <dt>Ngoài phạm vi</dt>
        <dd>{node.scopeOut || <span className="adm-muted">Chưa có.</span>}</dd>
        <dt>Course</dt>
        <dd>{courseLabel ?? <span className="adm-muted">Không thuộc course nào.</span>}</dd>
        <dt>Bài học</dt>
        <dd>{lessonCount > 0 ? `${lessonCount} bài học liên kết` : <span className="adm-muted">Chưa gắn bài học.</span>}</dd>
      </dl>

      <RelatedList items={prerequisites} onSelect={onSelect} title="Cần học trước" />
      <RelatedList items={dependents} onSelect={onSelect} title="Mở ra" />
    </aside>
  )
}
