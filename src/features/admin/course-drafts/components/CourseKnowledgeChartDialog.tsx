import { useMemo } from 'react'
import { GraduationCap } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import { ChartZoomControls, KnowledgeOrgChart } from '../../components/KnowledgeOrgChart'
import { useChartZoom } from '../../lib/chartZoom'
import type { TreeEdge, TreeNode } from '../../knowledge-graph/types'
import { courseKnowledgeTree } from '../lib/courseKnowledgeTree'

/**
 * The knowledge points of a course request drawn as an organisation chart. One large box at the top stands for the course
 * band; from it a line runs to each goal, and beneath a goal are the points it needs taught first, joined by lines, as
 * deep as they go. Every other box has a checkbox that works like the one in the chooser, so a pick can be made or
 * undone from here; ticking a point brings its prerequisites, which then show ticked beneath it.
 *
 * The drawing itself, with its cross links and zoom, is the shared `KnowledgeOrgChart`.
 */
export function CourseKnowledgeChartDialog({ nodes, edges, picked, limit, description, root, onChange, onClose }: {
  nodes: readonly TreeNode[]; edges: readonly TreeEdge[]; picked: readonly string[]; limit: number; description: string
  /** The course the chart hangs from: its band as the title, and its skills as the note. */
  root: { title: string; note: string }
  onChange: (next: string[]) => void; onClose: () => void
}) {
  const rows = useMemo(() => courseKnowledgeTree(nodes, edges), [nodes, edges])
  const atLimit = picked.length >= limit
  const zoom = useChartZoom()

  /** Ticks every point in the chart, as many as the limit leaves room for. */
  function selectAll() {
    const fresh = nodes.map((node) => node.id).filter((id) => !picked.includes(id))
    onChange([...picked, ...fresh.slice(0, Math.max(0, limit - picked.length))])
  }

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...picked, id] : picked.filter((item) => item !== id))
  }

  return <AdminModal title="Sơ đồ điểm kiến thức" description={description} size="xl" stacked onClose={onClose}>
    {(close) => <>
      <div className="adm-kp-dialog__bar adm-kp-chart__hint">
        <p className="adm-muted">Điểm nằm dưới phải học trước điểm ngay trên nó. Đường kẻ màu đi từ chấm tròn (điểm tiên quyết) tới mũi tên (điểm khác cũng cần nó); rê chuột vào một ô để làm nổi đường nối của nó.</p>
        <ChartZoomControls zoom={zoom} />
      </div>
      <div className="adm-kp-dialog__list">
        {rows.length
          ? <KnowledgeOrgChart
            label="Sơ đồ điểm kiến thức"
            root={<><GraduationCap aria-hidden="true" size={20} /><span><strong>{root.title}</strong><small>{root.note}</small></span></>}
            rows={rows}
            zoom={zoom.zoom}
            renderBox={(row, box) => {
              const { node } = row
              return <label {...box}>
                <input checked={picked.includes(node.id)} disabled={!picked.includes(node.id) && atLimit} onChange={(event) => toggle(node.id, event.target.checked)} type="checkbox" />
                <span className="adm-kp-chart__text">
                  <span className="adm-kp-chart__head"><code>{node.code}</code>{node.cefrLevel ? <span className="adm-badge">{node.cefrLevel}</span> : null}</span>
                  <span className="adm-kp-chart__name" title={node.name}>{node.name}</span>
                  {row.alsoFor.length ? <span className="adm-sr-only">Cũng là tiên quyết của {row.alsoFor.map((other) => other.code).join(', ')}</span> : null}
                </span>
              </label>
            }}
          />
          : <p className="adm-muted adm-kp-dialog__empty">Chưa có điểm kiến thức nào để hiển thị.</p>}
      </div>
      <footer className="adm-kp-dialog__footer">
        <span aria-live="polite" className="adm-muted">{picked.length}/{limit} đã chọn{atLimit ? ' · đã đạt tối đa' : ''}</span>
        <div className="adm-kp-dialog__actions">
          <button className="adm-btn" disabled={atLimit || nodes.every((node) => picked.includes(node.id))} onClick={selectAll} type="button">Chọn tất cả</button>
          <button className="adm-btn" disabled={!picked.length} onClick={() => onChange([])} type="button">Bỏ chọn tất cả</button>
          <button className="adm-btn adm-btn--primary" onClick={close} type="button">Lưu</button>
        </div>
      </footer>
    </>}
  </AdminModal>
}
