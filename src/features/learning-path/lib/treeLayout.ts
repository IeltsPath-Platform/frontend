import type { TreePoint } from '~types/learningPath'
import { prerequisiteSteps } from './treeMeta'

/** Sizes of the chart, in pixels before it is scaled to fit its frame. */
export const BOX_WIDTH = 200
/** Tall enough for the name of a point on three lines: names are the part that must never be cut. */
export const BOX_HEIGHT = 112
const COLUMN_GAP = 44
const ROW_GAP = 14
export const CHART_PADDING = 16
/** Room above the boxes for the name of each step. */
export const HEADING_HEIGHT = 34

export interface PlacedBox {
  id: string
  /** Counted from 0; the step the point is learnt in, minus one. For a {@code context} point, counted among the context steps. */
  column: number
  x: number
  y: number
  /** True for a point of another skill that this chart builds on, drawn in steps of its own before the steps of the skill. */
  context?: boolean
  /** True for a review that holds the learner back on a point. Its id is the one the slot was given; {@code column} is the step it follows. */
  review?: boolean
}

export interface PlacedLink {
  key: string
  /** The point that is needed first. */
  from: string
  /** The point that builds on it. */
  to: string
  /** True for a line that runs through a review: from the point to its review, and from the review to what builds on the point. */
  review?: boolean
}

export interface PlacedColumn {
  /** Counted from 1 inside its own group: the steps of the skill, or the steps of the points of other skills before them. 0 for a review column. */
  number: number
  x: number
  /** True for a step of points of other skills, drawn only for context. */
  context?: boolean
  /** True for a column that holds only reviews, the one right after the step of the points they hold the learner back on. */
  review?: boolean
}

/**
 * A review to draw: its own id, and the point it is for. A review that {@code gate}s (the default) stands between the point and
 * what builds on it; one that does not is only suggested, so it hangs off the point as a branch and nothing is rerouted.
 */
export interface ReviewSlot {
  id: string
  after: string
  gate?: boolean
}

/**
 * What takes a place in a column: a point, or a review that stands in for one. {@code needs} is what it is drawn after, and
 * {@code below} sits it one row under that instead of level with it (a suggested review, so the line that runs on from the point
 * does not pass through it).
 */
interface Placeable {
  id: string
  needs: readonly string[]
  below?: boolean
}

interface Column {
  number: number
  context: boolean
  review: boolean
  /** Counted from 0 among the steps of its group; for a review column, the step it follows. */
  index: number
  points: Placeable[]
}

export interface TreeLayout {
  boxes: PlacedBox[]
  /** Where the name of each step goes: the steps of context first, then the steps of the skill. */
  columns: PlacedColumn[]
  links: PlacedLink[]
  width: number
  height: number
}

/**
 * Lays the points of one skill out left to right in the order they are learnt: a column for each step, the points that
 * build on nothing in the first column, and every other point one column after the latest thing it builds on. The width
 * of the chart is the number of steps, not the number of points, so it stays small however many points a skill has.
 * Inside a column a point sits level with what it builds on where there is room, so most lines run nearly straight.
 * A line runs from the point that is needed to the point that needs it; how it curves is for the chart that draws it.
 *
 * A skill's chart holds only that skill's points, so what one of them builds on may belong to another skill (grammar and
 * vocabulary points serve every skill). {@code context} are those points, with what they in turn build on: they are drawn
 * in steps of their own before the first step of the skill, in the order they are learnt, with their lines. They take no part
 * in the steps of the skill, so the order of the skill's own points does not change.
 *
 * {@code reviews} are the reviews of points of the chart. A review that holds the learner back stands between the point and
 * what builds on it, since the learner has to finish it before going on: it gets a column of its own right after the step of
 * its point (not numbered, so the steps keep their numbers), level with the point, and the lines that ran from the point to what
 * builds on it run from the review instead. A review that is only suggested holds nothing back: it takes a place in the same
 * column, one row under the point, and the lines of the point stay as they are. Reviews of points of one step share its column.
 */
export function layoutTree(
  points: readonly TreePoint[],
  context: readonly TreePoint[] = [],
  reviews: readonly ReviewSlot[] = [],
): TreeLayout {
  const contextSteps = context.length > 0 ? prerequisiteSteps([...context]) : []
  const steps = prerequisiteSteps([...points])
  const top = CHART_PADDING + HEADING_HEIGHT
  const columnX = (index: number) => CHART_PADDING + index * (BOX_WIDTH + COLUMN_GAP)

  // The reviews whose point is in the chart, one for each point, and the review that stands in for a point to what builds on it.
  const drawable = new Set([...context, ...points].map((point) => point.knowledgePointId))
  const drawn = new Map<string, ReviewSlot>()
  for (const review of reviews) if (drawable.has(review.after) && !drawn.has(review.after)) drawn.set(review.after, review)
  // What builds on a point is reached through its review only when that review holds the learner back.
  const through = (id: string) => {
    const review = drawn.get(id)
    return review && review.gate !== false ? review.id : id
  }

  const columns: Column[] = []
  const addSteps = (groupSteps: ReturnType<typeof prerequisiteSteps>, isContext: boolean) => {
    groupSteps.forEach((step, index) => {
      columns.push({
        number: step.number, context: isContext, review: false, index,
        points: step.points.map((point) => ({ id: point.knowledgePointId, needs: point.prerequisiteIds.map(through) })),
      })
      const here = step.points.flatMap((point) => drawn.get(point.knowledgePointId) ?? [])
      if (here.length > 0) {
        columns.push({
          number: 0, context: isContext, review: true, index,
          points: here.map((slot) => ({ id: slot.id, needs: [slot.after], below: slot.gate === false })),
        })
      }
    })
  }
  addSteps(contextSteps, true)
  addSteps(steps, false)

  const reviewIds = new Set([...drawn.values()].map((slot) => slot.id))
  const placed = new Map<string, PlacedBox>()
  const boxes: PlacedBox[] = []
  columns.forEach((column, columnIndex) => {
    const x = columnX(columnIndex)
    let cursor = top
    for (const point of column.points) {
      const before = point.needs.flatMap((id) => placed.get(id) ?? [])
      const level = before.length ? before.reduce((sum, box) => sum + box.y, 0) / before.length : top
      const wanted = point.below ? level + BOX_HEIGHT + ROW_GAP : level
      const box: PlacedBox = { id: point.id, column: column.index, x, y: Math.max(wanted, cursor) }
      if (column.context) box.context = true
      if (reviewIds.has(box.id)) box.review = true
      placed.set(box.id, box)
      boxes.push(box)
      cursor = box.y + BOX_HEIGHT + ROW_GAP
    }
  })

  const links: PlacedLink[] = []
  for (const point of [...context, ...points]) {
    const to = placed.get(point.knowledgePointId)
    if (!to) continue
    for (const id of point.prerequisiteIds) {
      const via = through(id)
      const from = placed.get(via)
      if (!from || from === to) continue
      // A point of another skill is only drawn for what it leads to: a line from a point of the skill back into it is not.
      if (to.context && !from.context) continue
      const link: PlacedLink = { key: `${via}>${point.knowledgePointId}`, from: via, to: point.knowledgePointId }
      if (via !== id) link.review = true
      links.push(link)
    }
  }
  for (const slot of drawn.values()) links.push({ key: `${slot.after}>${slot.id}`, from: slot.after, to: slot.id, review: true })

  return {
    boxes,
    columns: columns.map((column, index) => ({
      number: column.number,
      x: columnX(index),
      ...(column.review ? { review: true } : column.context ? { context: true } : {}),
    })),
    links,
    width: CHART_PADDING * 2 + Math.max(1, columns.length) * BOX_WIDTH + Math.max(0, columns.length - 1) * COLUMN_GAP,
    height: Math.max(top, ...boxes.map((box) => box.y + BOX_HEIGHT)) + CHART_PADDING,
  }
}
