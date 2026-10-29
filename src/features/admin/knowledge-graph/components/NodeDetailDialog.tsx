import { AdminModal } from '../../components/AdminLayer'
import type { TreeNode } from '../types'
import { SKILL_LABEL, skillOf } from '../lib/skills'

export interface NodeDetailDialogProps {
  node: TreeNode
  prerequisites: readonly TreeNode[]
  dependents: readonly TreeNode[]
  courseLabel: string | null
  isolated: boolean
  missingMetadata: boolean
  /** Opened from the org chart popup, so it sits above it. */
  stacked: boolean
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

/** The details of one knowledge point in a dialog: what it is, where it sits, and what comes before and after it. */
export function NodeDetailDialog(props: NodeDetailDialogProps) {
  const { node, prerequisites, dependents, courseLabel, isolated, missingMetadata, stacked, onSelect, onClose } = props
  const lessonCount = node.lessonIds?.length ?? 0
  return (
    <AdminModal description={node.name} onClose={onClose} stacked={stacked} title={`Chi tiết ${node.code}`}>
      <div className="kg-panel__badges">
        <span className={`adm-badge ${node.status === 'ACTIVE' ? 'adm-badge--ok' : 'adm-badge--muted'}`}>
          {node.status === 'ACTIVE' ? 'Đang dùng' : 'Chưa kích hoạt'}
        </span>
        <span className="adm-badge">{node.cefrLevel ?? 'Chưa có cấp CEFR'}</span>
        <span className="adm-badge">{SKILL_LABEL[skillOf(node.skill)]}</span>
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
    </AdminModal>
  )
}
