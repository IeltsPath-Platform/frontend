import type { TreeNode } from '../types'
import { SKILL_LABEL, skillOf } from '../lib/skills'
import { KnowledgePointMenu, type PointActions } from './KnowledgePointMenu'

export interface KnowledgeTableProps {
  nodes: readonly TreeNode[]
  selectedId: string | null
  isolated: ReadonlySet<string>
  missing: ReadonlySet<string>
  actions: PointActions
}

/** Points as a flat table, for the ones that no link reaches and so have no tree to sit in. */
export function KnowledgeTable({ nodes, selectedId, isolated, missing, actions }: KnowledgeTableProps) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <caption className="adm-sr-only">Danh sách knowledge point</caption>
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
          {nodes.map((node, index) => (
            <tr className={node.id === selectedId ? 'is-selected' : undefined} key={node.id}>
              <td className="adm-stt">{index + 1}</td>
              <td><code>{node.code}</code></td>
              <td>{node.name}</td>
              <td>{SKILL_LABEL[skillOf(node.skill)]}</td>
              <td>{node.cefrLevel ?? '—'}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
