import type { TreeNode } from '../types'
import { LANE_LABEL, laneOf } from '../lib/layout'

export interface KnowledgeTableProps {
  nodes: readonly TreeNode[]
  selectedId: string | null
  isolated: ReadonlySet<string>
  missing: ReadonlySet<string>
  onSelect: (id: string) => void
}

/** The same points as the graph, as a table: easier to scan, to filter and to use with a screen reader. */
export function KnowledgeTable({ nodes, selectedId, isolated, missing, onSelect }: KnowledgeTableProps) {
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
          </tr>
        </thead>
        <tbody>
          {nodes.map((node, index) => (
            <tr key={node.id}>
              <td className="adm-stt">{index + 1}</td>
              <td>
                <button
                  aria-pressed={node.id === selectedId}
                  className="kg-link"
                  onClick={() => onSelect(node.id)}
                  type="button"
                >
                  {node.code}
                </button>
              </td>
              <td>{node.name}</td>
              <td>{LANE_LABEL[laneOf(node.skill)]}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
