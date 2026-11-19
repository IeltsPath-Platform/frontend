import type { KnowledgeTreeRow } from '../course-drafts/lib/courseKnowledgeTree'

/** Sizes of the chart in pixels, before it is scaled to fit its frame. A box is 236 wide and 78 tall in the stylesheet too. */
export const BOX_WIDTH = 236
export const BOX_HEIGHT = 78
export const ROOT_WIDTH = 300
export const ROOT_HEIGHT = 64
/** Space between boxes side by side, and between one level and the next (where the lines run and the fold buttons sit). */
const SIBLING_GAP = 28
const LEVEL_GAP = 52
export const CHART_PADDING = 16

/** The id of the large box at the top. Real points are never called this: their ids are UUIDs. */
export const ORG_ROOT_ID = 'org-root'

export interface PlacedRow {
  id: string
  row: KnowledgeTreeRow
  /** What the row hangs from: the id of the row above it, or {@link ORG_ROOT_ID} for a goal. */
  parent: string
  x: number
  y: number
}

/** A point that serves a second point besides the one it hangs beneath: a line from the first to the second. */
export interface CrossLink {
  key: string
  from: string
  to: string
}

export interface OrgChartLayout {
  root: { x: number; y: number }
  rows: PlacedRow[]
  crossLinks: CrossLink[]
  width: number
  height: number
}

/** Every cross link of the tree. */
export function crossLinksOf(rows: readonly KnowledgeTreeRow[]): CrossLink[] {
  return rows.flatMap((row) => [
    ...row.alsoFor.map((other) => ({ key: `${row.node.id}>${other.id}`, from: row.node.id, to: other.id })),
    ...crossLinksOf(row.children),
  ])
}

/**
 * Lays a prerequisite tree out top to bottom as an organisation chart: the large box at the top, the goals in a row beneath
 * it, and beneath each point what it needs taught first. A point sits halfway between its first and its last prerequisite,
 * and a branch is as wide as the boxes beneath it, so two branches never overlap. Every level sits at the same height across
 * the chart, which is what lets a cross link run in the gap between two levels.
 */
export function layoutOrgChart(rows: readonly KnowledgeTreeRow[]): OrgChartLayout {
  const spans = new Map<KnowledgeTreeRow, number>()
  const rowOf = (list: readonly KnowledgeTreeRow[]) => list.reduce((sum, row) => sum + span(row), 0) + Math.max(0, list.length - 1) * SIBLING_GAP
  const span = (row: KnowledgeTreeRow): number => {
    const known = spans.get(row)
    if (known !== undefined) return known
    const width = Math.max(BOX_WIDTH, rowOf(row.children))
    spans.set(row, width)
    return width
  }

  const placed: PlacedRow[] = []
  /** Places a row of boxes starting at `left`; returns the x of the middle of the first and of the last box. */
  const place = (list: readonly KnowledgeTreeRow[], left: number, depth: number, parent: string): [number, number] | null => {
    let cursor = left
    const middles: number[] = []
    for (const row of list) {
      const width = span(row)
      const box: PlacedRow = { id: row.node.id, row, parent, x: 0, y: CHART_PADDING + ROOT_HEIGHT + LEVEL_GAP + depth * (BOX_HEIGHT + LEVEL_GAP) }
      placed.push(box)
      const below = place(row.children, cursor + (width - rowOf(row.children)) / 2, depth + 1, box.id)
      box.x = (below ? (below[0] + below[1]) / 2 : cursor + width / 2) - BOX_WIDTH / 2
      middles.push(box.x + BOX_WIDTH / 2)
      cursor += width + SIBLING_GAP
    }
    return middles.length ? [middles[0]!, middles[middles.length - 1]!] : null
  }

  const goalsWidth = rowOf(rows)
  const inner = Math.max(ROOT_WIDTH, goalsWidth)
  const goals = place(rows, CHART_PADDING + (inner - goalsWidth) / 2, 0, ORG_ROOT_ID)
  const rootMiddle = goals ? (goals[0] + goals[1]) / 2 : CHART_PADDING + inner / 2

  return {
    root: { x: rootMiddle - ROOT_WIDTH / 2, y: CHART_PADDING },
    rows: placed,
    crossLinks: crossLinksOf(rows),
    width: inner + CHART_PADDING * 2,
    height: Math.max(CHART_PADDING + ROOT_HEIGHT, ...placed.map((box) => box.y + BOX_HEIGHT)) + CHART_PADDING,
  }
}
