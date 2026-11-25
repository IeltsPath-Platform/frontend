import type { TreeEdge, TreeNode } from '../../knowledge-graph/types'

export interface MissingPrerequisiteGroup {
  point: TreeNode
  missing: TreeNode[]
}

/** Returns direct prerequisites missing from the selected lesson points. */
export function missingPrerequisites(
  value: readonly string[],
  edges: readonly TreeEdge[],
  points: readonly TreeNode[],
): MissingPrerequisiteGroup[] {
  if (value.length === 0 || edges.length === 0) return []
  const selected = new Set(value)
  const byId = new Map(points.map((point) => [point.id, point]))
  const prerequisitesByPoint = new Map<string, string[]>()
  for (const edge of edges) {
    const prerequisites = prerequisitesByPoint.get(edge.to)
    if (prerequisites) prerequisites.push(edge.from)
    else prerequisitesByPoint.set(edge.to, [edge.from])
  }

  const result: MissingPrerequisiteGroup[] = []
  for (const pointId of value) {
    const point = byId.get(pointId)
    if (!point) continue
    const missing = [...new Set(prerequisitesByPoint.get(pointId) ?? [])]
      .filter((id) => !selected.has(id))
      .map((id) => byId.get(id))
      .filter((item): item is TreeNode => item !== undefined)
      .sort((left, right) => left.code.localeCompare(right.code))
    if (missing.length > 0) result.push({ point, missing })
  }
  return result
}

/** Adds each distinct missing prerequisite up to the picker limit. */
export function prerequisiteSelection(value: readonly string[], groups: readonly MissingPrerequisiteGroup[], limit = 50): string[] {
  const next = [...value]
  const selected = new Set(value)
  for (const group of groups) {
    for (const point of group.missing) {
      if (selected.has(point.id)) continue
      if (next.length >= limit) return next
      selected.add(point.id)
      next.push(point.id)
    }
  }
  return next
}
