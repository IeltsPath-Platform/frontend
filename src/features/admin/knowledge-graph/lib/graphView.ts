import type { KnowledgeTreeHealth, TreeNode } from '../types'

/** Whether a point contains the lower-cased text in its code, name or can-do; an empty text matches every point. */
export function matchesQuery(node: TreeNode, query: string): boolean {
  if (!query) return true
  return [node.code, node.name, node.canDo].some((text) => text?.toLowerCase().includes(query))
}

/** The health report as lookup sets: points with no link, points lacking a CEFR level or can-do, and inverted links. */
export function flagsOf(health: KnowledgeTreeHealth | null) {
  return {
    isolated: new Set(health?.isolatedIds ?? []),
    missing: new Set(health?.missingMetadataIds ?? []),
    violations: new Set((health?.levelViolations ?? []).map((edge) => `${edge.from}->${edge.to}`)),
  }
}
