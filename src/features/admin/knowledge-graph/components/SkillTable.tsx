import { useMemo, useState } from 'react'
import { Network } from 'lucide-react'
import { visibleKnowledgeLines } from '../../course-drafts/lib/courseKnowledgeTree'
import { KnowledgeTreeCell } from '../../components/KnowledgeTreeCell'
import { KnowledgePointMenu, type PointActions } from './KnowledgePointMenu'
import type { ChartSection } from '../lib/chartModel'
import { foldableIds } from '../lib/chartFold'
import { SKILL_LABEL, skillOf } from '../lib/skills'
import { keepPaths } from '../lib/treeTable'
import type { TreeNode } from '../types'

/**
 * The points of one skill as a table that reads as a tree: a goal first, and beneath it, indented, what it needs taught
 * first, as deep as that goes. A point with points beneath it has an arrow that folds them. Each point is listed once,
 * beneath the first point that needs it; the others that need it are named in its name cell. With a filter (`keep`),
 * only the points that match are listed, and the points above them to show the way, and nothing is folded.
 */
export function SkillTable({ section, selectedId, actions, onOpenChart, isolated, missing, keep }: {
  section: ChartSection
  selectedId: string | null
  actions: PointActions
  /** Opens the org chart of this skill. */
  onOpenChart: () => void
  isolated: ReadonlySet<string>
  missing: ReadonlySet<string>
  /** Which points a search or filter keeps; null when there is none. */
  keep: ((node: TreeNode) => boolean) | null
}) {
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set())
  const rows = useMemo(() => (keep ? keepPaths(section.rows, keep) : section.rows), [section.rows, keep])
  const lines = visibleKnowledgeLines(rows, keep ? new Set() : closed)
  const fold = (id: string) => setClosed((current) => { const next = new Set(current); if (!next.delete(id)) next.add(id); return next })
  const foldable = useMemo(() => foldableIds(section.rows), [section.rows])
  if (keep && lines.length === 0) return null

  return <section aria-label={`Bảng ${section.label}`} className={`adm-block kg-skill kg-skill--${section.skill.toLowerCase()}`}>
    <header className="kg-skill__head">
      <h2>{section.label}<span className="kg-skill__count">{keep ? `${lines.filter(({ row }) => keep(row.node)).length}/${section.points}` : section.points}</span></h2>
      <div className="kg-skill__tools">
        <button className="adm-btn adm-btn--small" disabled={!!keep || closed.size === 0} onClick={() => setClosed(new Set())} type="button">Mở tất cả</button>
        <button className="adm-btn adm-btn--small" disabled={!!keep || foldable.length === 0 || closed.size >= foldable.length} onClick={() => setClosed(new Set(foldable))} type="button">Thu gọn tất cả</button>
        <button aria-label={`Xem sơ đồ ${section.label}`} className="adm-btn adm-btn--icon" onClick={onOpenChart} title="Xem sơ đồ" type="button"><Network aria-hidden="true" size={18} /></button>
      </div>
    </header>
    <div className="adm-table-wrap">
      <table aria-label={`Điểm kiến thức ${section.label}`} className="adm-table">
        <thead>
          <tr>
            <th className="adm-stt" scope="col">STT</th>
            <th scope="col">Mã</th>
            <th scope="col">Tên</th>
            <th scope="col">Kỹ năng</th>
            <th scope="col">CEFR</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Cảnh báo</th>
            <th className="adm-col-actions" scope="col">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(({ row, depth }, index) => {
            const { node } = row
            return <tr className={`${node.id === selectedId ? 'is-selected' : ''}${keep && !keep(node) ? ' is-context' : ''}`.trim() || undefined} key={node.id}>
              <td className="adm-stt">{index + 1}</td>
              <td>
                <KnowledgeTreeCell code={node.code} depth={depth} foldable={!keep && row.children.length > 0} onToggle={() => fold(node.id)} open={!closed.has(node.id)}>
                  <code>{node.code}</code>
                </KnowledgeTreeCell>
              </td>
              <td>
                {node.name}
                {row.alsoFor.length ? <small className="adm-muted kg-also">Cũng là tiên quyết của {row.alsoFor.map((other) => other.code).join(', ')}</small> : null}
              </td>
              <td className="adm-muted">{SKILL_LABEL[skillOf(node.skill)]}</td>
              <td>{node.cefrLevel ? <span className="adm-badge">{node.cefrLevel}</span> : '—'}</td>
              <td>
                <span className={`adm-badge ${node.status === 'ACTIVE' ? 'adm-badge--ok' : 'adm-badge--muted'}`}>
                  {node.status === 'ACTIVE' ? 'Đang dùng' : 'Chưa kích hoạt'}
                </span>
              </td>
              <td>
                {isolated.has(node.id) ? <span className="adm-badge adm-badge--warn">Chưa nối</span> : null}{' '}
                {missing.has(node.id) ? <span className="adm-badge adm-badge--danger">Thiếu metadata</span> : null}
              </td>
              <td className="adm-col-actions"><KnowledgePointMenu actions={actions} node={node} /></td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  </section>
}
