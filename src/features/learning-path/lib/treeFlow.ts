import { createContext, useContext } from 'react'
import type { Edge, Node } from '@xyflow/react'
import type { TreePoint } from '~types/learningPath'
import type { BlockingReviewInfo, ReviewKind } from './blockingReviews'

/** What a box of the tree is given: the point, and the step it is learnt in within its own group (counted from 0). */
export type PointNodeData = { point: TreePoint; column: number }

/** A point of the course's own skill: a button that selects it. */
export type PointFlowNode = Node<PointNodeData, 'point'>
/** A point of another skill or a lower course that the chart builds on: quiet and dashed, not selectable. */
export type ContextFlowNode = Node<PointNodeData, 'context'>
/** The name of a step, drawn above its column. `review` is the column that holds only reviews. */
export type HeadingFlowNode = Node<{ number: number; context: boolean; review: boolean }, 'heading'>
/** A blocking review of a point, drawn right after the point and kept there once it is finished: the review, and the point it is for. */
export type ReviewFlowNode = Node<{ review: BlockingReviewInfo; point: TreePoint }, 'review'>
export type TreeFlowNode = PointFlowNode | ContextFlowNode | HeadingFlowNode | ReviewFlowNode

/** How a line reads: the lines of the point under the pointer (or the selected one) are lit and the others fade back. */
export type LinkState = 'quiet' | 'lit' | 'faded'
/** `review` is the state of the review a line runs through (into it, or out of it); null for a line that runs through none. */
export type LinkFlowEdge = Edge<{ state: LinkState; markerId: string; review: ReviewKind | null }, 'link'>

/**
 * What every box of the chart shares: which point is selected, which are linked to the one in focus, and how to put a
 * point in focus from the keyboard. Kept in a context rather than in the boxes' data so that moving the pointer does not
 * rebuild the whole graph. Clicks and the pointer are React Flow's to report (see the chart); focus is the button's own.
 */
export interface TreeFocus {
  selectedId: string | null
  related: ReadonlySet<string>
  focus: (id: string | null) => void
}

export const TreeFocusContext = createContext<TreeFocus>({
  selectedId: null,
  related: new Set(),
  focus: () => undefined,
})

export function useTreeFocus(): TreeFocus {
  return useContext(TreeFocusContext)
}
