import type { KnowledgeTreeRow } from '../../course-drafts/lib/courseKnowledgeTree'
import type { TreeNode } from '../types'

/**
 * The rows that satisfy `keep`, and the rows above them that lead to one, with everything that leads to no match left
 * out. A search or a filter on a tree table so keeps the way to each match instead of cutting the tree into pieces.
 */
export function keepPaths(rows: readonly KnowledgeTreeRow[], keep: (node: TreeNode) => boolean): KnowledgeTreeRow[] {
  return rows.flatMap((row) => {
    const children = keepPaths(row.children, keep)
    return keep(row.node) || children.length ? [{ ...row, children }] : []
  })
}
