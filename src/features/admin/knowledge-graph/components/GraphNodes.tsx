import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AlertTriangle } from 'lucide-react'
import type { ColumnFlowNode, KpFlowNode, LaneFlowNode } from '../lib/graphView'
import { laneOf } from '../lib/layout'

/** One knowledge point. The button inside makes it reachable and selectable by keyboard. */
export function KnowledgePointNode({ data }: NodeProps<KpFlowNode>) {
  const { node } = data
  const warning = [
    data.isolated ? 'Chưa nối với KP active nào' : null,
    data.missingMetadata ? 'Thiếu CEFR hoặc can-do' : null,
  ].filter(Boolean).join('; ')
  const classes = [
    'kg-node',
    `kg-node--${laneOf(node.skill).toLowerCase()}`,
    node.status === 'INACTIVE' ? 'is-inactive' : '',
    data.selected ? 'is-selected' : '',
    data.dimmed ? 'is-dimmed' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} data-level={node.cefrLevel ?? 'NONE'}>
      <Handle className="kg-handle" isConnectable={false} position={Position.Left} type="target" />
      <button
        aria-label={`${node.code}: ${node.name}${node.status === 'INACTIVE' ? ' (chưa kích hoạt)' : ''}`}
        aria-pressed={data.selected}
        className="kg-node__button"
        onClick={() => data.onSelect(node.id)}
        type="button"
      >
        <span className="kg-node__code">{node.code}</span>
        <span className="kg-node__name">{node.name}</span>
      </button>
      <span className="kg-node__level">{node.cefrLevel ?? '—'}</span>
      {warning ? (
        <span aria-hidden="true" className="kg-node__warn" title={warning}>
          <AlertTriangle size={14} />
        </span>
      ) : null}
      <Handle className="kg-handle" isConnectable={false} position={Position.Right} type="source" />
    </div>
  )
}

export function LaneBandNode({ data }: NodeProps<LaneFlowNode>) {
  return (
    <div aria-hidden="true" className="kg-lane" style={{ width: data.width, height: data.height }}>
      <span className="kg-lane__label">{data.label}</span>
    </div>
  )
}

export function ColumnHeaderNode({ data }: NodeProps<ColumnFlowNode>) {
  return (
    <div aria-hidden="true" className="kg-column" style={{ width: data.width }}>
      {data.label}
    </div>
  )
}
