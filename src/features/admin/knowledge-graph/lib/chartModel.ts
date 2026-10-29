import { courseKnowledgeTree, type KnowledgeTreeRow } from '../../course-drafts/lib/courseKnowledgeTree'
import type { TreeEdge, TreeNode } from '../types'
import { SKILL_LABEL, SKILL_ORDER, skillOf, type SkillKey } from './skills'

/** One skill's chart: the goals of the skill, with what each needs taught first beneath it. */
export interface ChartSection {
  skill: SkillKey
  label: string
  rows: KnowledgeTreeRow[]
  /** How many different points the chart draws. */
  points: number
}

export interface ChartModel {
  /** One section per skill that has a goal, in skill order. */
  sections: ChartSection[]
  /** Points with no link to any other point shown, in skill order then by code. They hang from nothing, so they stand apart. */
  loose: TreeNode[]
  /** How many points and links the whole tree holds. */
  points: number
  links: number
}

/** How many different points are in the rows, however deep. */
export function countPoints(rows: readonly KnowledgeTreeRow[]): number {
  const seen = new Set<string>()
  const visit = (row: KnowledgeTreeRow) => { seen.add(row.node.id); row.children.forEach(visit) }
  rows.forEach(visit)
  return seen.size
}

const bySkillThenCode = (left: TreeNode, right: TreeNode) =>
  SKILL_ORDER.indexOf(skillOf(left.skill)) - SKILL_ORDER.indexOf(skillOf(right.skill)) || left.code.localeCompare(right.code)

/**
 * The charts of a knowledge tree. The points that take part in a link become one prerequisite tree whose goals (points
 * nothing else needs) are filed by skill, one chart for each. A prerequisite from another skill, grammar for a writing
 * goal, stays beneath the first goal that needs it, in that goal's chart; the other goals that need it are told of it
 * (`alsoFor`) and are joined to it by a line when they are in the same chart. The points with no link at all are set
 * apart: a tree has nothing to say about them.
 */
export function buildChartModel(nodes: readonly TreeNode[], edges: readonly TreeEdge[]): ChartModel {
  const known = new Set(nodes.map((node) => node.id))
  const used = edges.filter((edge) => known.has(edge.from) && known.has(edge.to) && edge.from !== edge.to)
  const linked = new Set(used.flatMap((edge) => [edge.from, edge.to]))

  const bySkill = new Map<SkillKey, KnowledgeTreeRow[]>()
  for (const goal of courseKnowledgeTree(nodes.filter((node) => linked.has(node.id)), used)) {
    const skill = skillOf(goal.node.skill)
    bySkill.set(skill, [...(bySkill.get(skill) ?? []), goal])
  }
  const sections = SKILL_ORDER.filter((skill) => bySkill.has(skill))
    .map((skill): ChartSection => ({ skill, label: SKILL_LABEL[skill], rows: bySkill.get(skill)!, points: countPoints(bySkill.get(skill)!) }))

  return {
    sections,
    loose: nodes.filter((node) => !linked.has(node.id)).sort(bySkillThenCode),
    points: nodes.length,
    links: used.length,
  }
}
