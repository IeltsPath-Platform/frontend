import { CEFR_LEVELS, type TreeEdge, type TreeNode } from '../../knowledge-graph/types'

/**
 * The prerequisites of the given points, and theirs in turn, as far down as the graph goes, whatever their level. The
 * graph is walked upward one step at a time, and the result lists the deepest prerequisite first, so it reads in the
 * order to teach. Points in `ids` themselves are never returned, and neither are points without a level (an error trap
 * is not a lesson to teach).
 */
export function coursePrerequisites(ids: readonly string[], nodes: readonly TreeNode[], edges: readonly TreeEdge[]): string[] {
  if (ids.length === 0) return []
  const hasLevel = new Set(nodes.filter((node) => node.cefrLevel && CEFR_LEVELS.includes(node.cefrLevel)).map((node) => node.id))
  const before = new Map<string, string[]>()
  for (const edge of edges) before.set(edge.to, [...(before.get(edge.to) ?? []), edge.from])

  const seen = new Set(ids)
  const found: string[] = []
  let frontier = [...ids]
  while (frontier.length > 0) {
    const next: string[] = []
    for (const id of frontier) {
      for (const prerequisite of before.get(id) ?? []) {
        if (seen.has(prerequisite)) continue
        seen.add(prerequisite)
        if (hasLevel.has(prerequisite)) { found.push(prerequisite); next.push(prerequisite) }
      }
    }
    frontier = next
  }
  return found.reverse()
}
