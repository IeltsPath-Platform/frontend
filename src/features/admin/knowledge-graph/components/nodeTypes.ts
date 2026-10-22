import { ColumnHeaderNode, KnowledgePointNode, LaneBandNode } from './GraphNodes'

/** Kept in its own module so React Flow never sees a new `nodeTypes` object on a render. */
export const NODE_TYPES = { kp: KnowledgePointNode, lane: LaneBandNode, column: ColumnHeaderNode }
