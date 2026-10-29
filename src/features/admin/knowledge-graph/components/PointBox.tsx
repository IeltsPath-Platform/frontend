import { AlertTriangle } from 'lucide-react'
import type { ChartBoxProps } from '../../components/KnowledgeOrgChart'
import { skillOf } from '../lib/skills'
import type { TreeNode } from '../types'

export interface PointBoxState {
  node: TreeNode
  /** Why the point has a warning, when it has one. */
  warning: string | null
  selected: boolean
  dimmed: boolean
  onSelect: (id: string) => void
}

/**
 * One knowledge point: its code, level and name, striped in the colour of its skill. A button, so it can be reached and
 * chosen by keyboard. In a chart it takes the props the chart hands it; a point set apart has none.
 */
export function PointBox({ node, warning, selected, dimmed, onSelect, box }: PointBoxState & { box?: ChartBoxProps }) {
  const classes = [
    box?.className ?? 'adm-kp-chart__box', 'kg-box', `kg-box--${skillOf(node.skill).toLowerCase()}`,
    node.status === 'INACTIVE' ? 'is-inactive' : '', selected ? 'is-selected' : '', dimmed ? 'is-dimmed' : '',
  ].filter(Boolean).join(' ')
  return <button
    {...box}
    aria-label={`${node.code}: ${node.name}${node.status === 'INACTIVE' ? ' (chưa kích hoạt)' : ''}`}
    aria-pressed={selected}
    className={classes}
    data-kp={node.id}
    onClick={() => onSelect(node.id)}
    type="button">
    <span className="adm-kp-chart__text">
      <span className="adm-kp-chart__head"><code>{node.code}</code>{node.cefrLevel ? <span className="adm-badge">{node.cefrLevel}</span> : <span className="kg-box__nolevel">chưa có cấp</span>}</span>
      <span className="adm-kp-chart__name" title={node.name}>{node.name}</span>
    </span>
    {warning ? <span aria-hidden="true" className="kg-box__warn" title={warning}><AlertTriangle size={14} /></span> : null}
  </button>
}
