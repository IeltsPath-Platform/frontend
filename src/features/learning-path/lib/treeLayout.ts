import type { TreePoint } from '~types/learningPath'
import { prerequisiteSteps } from './treeMeta'

/** Sizes of the chart, in pixels before it is scaled to fit its frame. */
export const BOX_WIDTH = 184
export const BOX_HEIGHT = 84
const COLUMN_GAP = 52
const ROW_GAP = 14
export const CHART_PADDING = 16
/** Room above the boxes for the name of each step. */
export const HEADING_HEIGHT = 34

export interface PlacedBox {
  id: string
  /** Counted from 0; the step the point is learnt in, minus one. */
  column: number
  x: number
  y: number
}

export interface PlacedLink {
  key: string
  /** The point that is needed first. */
  from: string
  /** The point that builds on it. */
  to: string
  path: string
}

export interface TreeLayout {
  boxes: PlacedBox[]
  /** Where the name of each step goes. */
  columns: { number: number; x: number }[]
  links: PlacedLink[]
  width: number
  height: number
}

/**
 * Lays the points of one skill out left to right in the order they are learnt: a column for each step, the points that
 * build on nothing in the first column, and every other point one column after the latest thing it builds on. The width
 * of the chart is the number of steps, not the number of points, so it stays small however many points a skill has.
 * Inside a column a point sits level with what it builds on where there is room, so most lines run nearly straight.
 * A line leaves the right edge of the point that is needed and ends on the left edge of the point that needs it.
 */
export function layoutTree(points: readonly TreePoint[]): TreeLayout {
  const steps = prerequisiteSteps([...points])
  const top = CHART_PADDING + HEADING_HEIGHT
  const placed = new Map<string, PlacedBox>()
  const boxes: PlacedBox[] = []

  steps.forEach((step, column) => {
    const x = CHART_PADDING + column * (BOX_WIDTH + COLUMN_GAP)
    let cursor = top
    for (const point of step.points) {
      const before = point.prerequisiteIds.flatMap((id) => placed.get(id) ?? [])
      const wanted = before.length ? before.reduce((sum, box) => sum + box.y, 0) / before.length : top
      const box = { id: point.knowledgePointId, column, x, y: Math.max(wanted, cursor) }
      placed.set(box.id, box)
      boxes.push(box)
      cursor = box.y + BOX_HEIGHT + ROW_GAP
    }
  })

  const links: PlacedLink[] = []
  for (const point of points) {
    const to = placed.get(point.knowledgePointId)
    if (!to) continue
    for (const id of point.prerequisiteIds) {
      const from = placed.get(id)
      if (!from || from === to) continue
      const startX = from.x + BOX_WIDTH
      const startY = from.y + BOX_HEIGHT / 2
      const endY = to.y + BOX_HEIGHT / 2
      const reach = Math.max(24, (to.x - startX) / 2)
      links.push({
        key: `${id}>${point.knowledgePointId}`,
        from: id,
        to: point.knowledgePointId,
        path: `M ${startX} ${startY} C ${startX + reach} ${startY}, ${to.x - reach} ${endY}, ${to.x} ${endY}`,
      })
    }
  }

  const columnCount = steps.length
  return {
    boxes,
    columns: steps.map((step, column) => ({ number: step.number, x: CHART_PADDING + column * (BOX_WIDTH + COLUMN_GAP) })),
    links,
    width: CHART_PADDING * 2 + Math.max(1, columnCount) * BOX_WIDTH + Math.max(0, columnCount - 1) * COLUMN_GAP,
    height: Math.max(top, ...boxes.map((box) => box.y + BOX_HEIGHT)) + CHART_PADDING,
  }
}
