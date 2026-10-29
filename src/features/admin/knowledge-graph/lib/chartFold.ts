import type { KnowledgeTreeRow } from '../../course-drafts/lib/courseKnowledgeTree'
import { countPoints } from './chartModel'

/** The rows with everything beneath the folded points left out; a row's own point stays. */
export function foldRows(rows: readonly KnowledgeTreeRow[], folded: ReadonlySet<string>): KnowledgeTreeRow[] {
  return rows.map((row) => ({ ...row, children: folded.has(row.node.id) ? [] : foldRows(row.children, folded) }))
}

/** The ids of every row that has rows beneath it: the ones that can be folded. */
export function foldableIds(rows: readonly KnowledgeTreeRow[]): string[] {
  return rows.flatMap((row) => (row.children.length ? [row.node.id, ...foldableIds(row.children)] : []))
}

/** How many different points sit beneath each row that has any, by row id: what folding the row would hide. */
export function hiddenCounts(rows: readonly KnowledgeTreeRow[]): Map<string, number> {
  const counts = new Map<string, number>()
  const visit = (row: KnowledgeTreeRow) => {
    if (row.children.length) counts.set(row.node.id, countPoints(row.children))
    row.children.forEach(visit)
  }
  rows.forEach(visit)
  return counts
}
