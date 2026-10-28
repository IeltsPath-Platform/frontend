import { CEFR_LEVELS, type TreeEdge, type TreeNode } from '../../knowledge-graph/types'

/** One line of the tree: a point and the points it needs taught first beneath it. */
export interface KnowledgeTreeRow {
  node: TreeNode
  children: KnowledgeTreeRow[]
  /** Other points, shown elsewhere in the tree, that need this one taught first too; the point itself is drawn once. */
  alsoFor: TreeNode[]
}

const rank = (node: TreeNode) => (node.cefrLevel ? CEFR_LEVELS.indexOf(node.cefrLevel) : -1)
/** Highest level first, then by code, so a list always reads the same way. */
const byLevelThenCode = (left: TreeNode, right: TreeNode) => rank(right) - rank(left) || left.code.localeCompare(right.code)

/**
 * The prerequisite graph of the given points as a tree. The points nothing else here depends on are the roots (the
 * goals); beneath each one are the points it needs taught first, and beneath those theirs, as deep as the graph goes.
 * Every point has one line, however many others depend on it: it sits beneath the first of them, and the others are
 * named in its `alsoFor`. That includes a link a longer chain already implies (A is a prerequisite of B, and also of C,
 * which B needs): all of the real links are kept, so what the tree shows is what the picks answer to. Edges to points
 * outside `nodes` are left out, and a cycle ends at the point where it closes.
 */
export function courseKnowledgeTree(nodes: readonly TreeNode[], edges: readonly TreeEdge[]): KnowledgeTreeRow[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const needs = new Map<string, TreeNode[]>()
  const dependedOn = new Set<string>()
  for (const edge of edges) {
    const prerequisite = byId.get(edge.from)
    if (!prerequisite || !byId.has(edge.to) || edge.from === edge.to) continue
    needs.set(edge.to, [...(needs.get(edge.to) ?? []), prerequisite])
    dependedOn.add(edge.from)
  }

  const rowOf = new Map<string, KnowledgeTreeRow>()
  function build(node: TreeNode, path: ReadonlySet<string>): KnowledgeTreeRow {
    const row: KnowledgeTreeRow = { node, children: [], alsoFor: [] }
    rowOf.set(node.id, row)
    const lower = new Set([...path, node.id])
    for (const prerequisite of (needs.get(node.id) ?? []).filter((candidate) => !path.has(candidate.id)).sort(byLevelThenCode)) {
      const drawn = rowOf.get(prerequisite.id)
      if (drawn) drawn.alsoFor.push(node)
      else row.children.push(build(prerequisite, lower))
    }
    return row
  }

  const rows = nodes.filter((node) => !dependedOn.has(node.id)).sort(byLevelThenCode).map((node) => build(node, new Set()))
  // Points that only lean on each other in a loop have no root; each still gets its place.
  for (const node of nodes.filter((candidate) => !rowOf.has(candidate.id)).sort(byLevelThenCode)) {
    if (!rowOf.has(node.id)) rows.push(build(node, new Set()))
  }
  return rows
}

/** A line of the tree with how deep it sits, ready to be drawn one after another in a table. */
export interface KnowledgeTreeLine {
  row: KnowledgeTreeRow
  depth: number
}

/** The lines in reading order, leaving out everything beneath a point whose id is in `closed`. */
export function visibleKnowledgeLines(rows: readonly KnowledgeTreeRow[], closed: ReadonlySet<string>, depth = 0): KnowledgeTreeLine[] {
  return rows.flatMap((row) => [{ row, depth }, ...(closed.has(row.node.id) ? [] : visibleKnowledgeLines(row.children, closed, depth + 1))])
}
