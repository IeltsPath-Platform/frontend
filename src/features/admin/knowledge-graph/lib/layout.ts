import { CEFR_LEVELS, type CefrLevel } from '../types'

export const NODE_WIDTH = 190
export const NODE_HEIGHT = 62
export const COLUMN_GAP = 64
export const ROW_GAP = 14
export const LANE_PADDING = 16
export const LANE_GAP = 20
export const HEADER_HEIGHT = 44
/** Space on the left for the lane labels. */
export const LABEL_WIDTH = 150

export const LANE_ORDER = ['LISTENING', 'READING', 'WRITING', 'SPEAKING', 'ALL', 'OTHER'] as const
export type LaneKey = (typeof LANE_ORDER)[number]

export const LANE_LABEL: Record<LaneKey, string> = {
  LISTENING: 'Listening',
  READING: 'Reading',
  WRITING: 'Writing',
  SPEAKING: 'Speaking',
  ALL: 'Grammar / Vocabulary',
  OTHER: 'Khác',
}

export type ColumnKey = CefrLevel | 'NONE'

export interface LayoutInput {
  id: string
  code: string
  skill?: string | null
  cefrLevel?: CefrLevel | null
}

export interface Placement { x: number; y: number }
export interface ColumnBox { key: ColumnKey; label: string; x: number; width: number }
export interface LaneBox { key: LaneKey; label: string; y: number; height: number }

export interface GraphLayout {
  positions: Record<string, Placement>
  columns: ColumnBox[]
  lanes: LaneBox[]
  width: number
  height: number
}

export function laneOf(skill: string | null | undefined): LaneKey {
  return skill && (LANE_ORDER as readonly string[]).includes(skill) && skill !== 'OTHER' ? (skill as LaneKey) : 'OTHER'
}

/**
 * Places each point in the cell of its skill lane (rows) and CEFR level (columns). Points of one cell are stacked and
 * ordered by code, so the same data always gives the same picture. A "no level" column appears only when a point has
 * no CEFR level, and a lane appears only when it holds a point.
 */
export function layoutGraph(nodes: readonly LayoutInput[]): GraphLayout {
  const needsNoLevelColumn = nodes.some((node) => !node.cefrLevel)
  const columnKeys: ColumnKey[] = [...CEFR_LEVELS, ...(needsNoLevelColumn ? (['NONE'] as const) : [])]
  const columnWidth = NODE_WIDTH + COLUMN_GAP

  const cells = new Map<string, LayoutInput[]>()
  const usedLanes = new Set<LaneKey>()
  for (const node of nodes) {
    const lane = laneOf(node.skill)
    usedLanes.add(lane)
    const key = `${lane}|${node.cefrLevel ?? 'NONE'}`
    const cell = cells.get(key)
    if (cell) cell.push(node)
    else cells.set(key, [node])
  }
  for (const cell of cells.values()) cell.sort((a, b) => a.code.localeCompare(b.code))

  const columns: ColumnBox[] = columnKeys.map((key, index) => ({
    key,
    label: key === 'NONE' ? 'Chưa có cấp' : key,
    x: LABEL_WIDTH + index * columnWidth,
    width: NODE_WIDTH,
  }))

  const positions: Record<string, Placement> = {}
  const lanes: LaneBox[] = []
  let cursorY = HEADER_HEIGHT + LANE_GAP
  for (const lane of LANE_ORDER) {
    if (!usedLanes.has(lane)) continue
    const tallest = Math.max(1, ...columnKeys.map((key) => cells.get(`${lane}|${key}`)?.length ?? 0))
    const height = LANE_PADDING * 2 + tallest * NODE_HEIGHT + (tallest - 1) * ROW_GAP
    lanes.push({ key: lane, label: LANE_LABEL[lane], y: cursorY, height })
    columnKeys.forEach((key, columnIndex) => {
      cells.get(`${lane}|${key}`)?.forEach((node, row) => {
        positions[node.id] = {
          x: LABEL_WIDTH + columnIndex * columnWidth,
          y: cursorY + LANE_PADDING + row * (NODE_HEIGHT + ROW_GAP),
        }
      })
    })
    cursorY += height + LANE_GAP
  }

  return {
    positions,
    columns,
    lanes,
    width: LABEL_WIDTH + columnKeys.length * columnWidth - COLUMN_GAP,
    height: cursorY - LANE_GAP,
  }
}
