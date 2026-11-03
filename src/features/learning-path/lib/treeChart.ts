import type { TreePoint } from '~types/learningPath'
import { pointSkill, prerequisiteSteps, tierGroup } from './treeMeta'

/**
 * The order each point is learnt in, counted inside its own skill: 1 is learnt first. A number lets the learner read the
 * order off a box, whichever way the chart is laid out.
 */
export function learningOrder(points: readonly TreePoint[]): Map<string, number> {
  const order = new Map<string, number>()
  const skills = new Set(points.map(pointSkill))
  for (const skill of skills) {
    for (const step of prerequisiteSteps(points.filter((point) => pointSkill(point) === skill))) {
      for (const point of step.points) order.set(point.knowledgePointId, step.number)
    }
  }
  return order
}

/** The points that build directly on each point, among those given. */
export function dependentsOf(points: readonly TreePoint[]): Map<string, TreePoint[]> {
  const dependents = new Map<string, TreePoint[]>()
  const ids = new Set(points.map((point) => point.knowledgePointId))
  for (const point of points) {
    for (const id of point.prerequisiteIds) {
      if (ids.has(id) && id !== point.knowledgePointId) dependents.set(id, [...(dependents.get(id) ?? []), point])
    }
  }
  return dependents
}

/** Where the learner lands: the first point that needs work, else the first point. */
export function defaultSelection(points: readonly TreePoint[]): TreePoint | undefined {
  return points.find((point) => tierGroup(point) === 'PRIORITY') ?? points[0]
}
