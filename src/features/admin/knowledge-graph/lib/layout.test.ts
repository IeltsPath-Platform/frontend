import { describe, expect, it } from 'vitest'
import { COLUMN_GAP, LABEL_WIDTH, NODE_HEIGHT, NODE_WIDTH, ROW_GAP, laneOf, layoutGraph } from './layout'

describe('layoutGraph', () => {
  it('puts the CEFR level in the column and the skill in the lane', () => {
    const layout = layoutGraph([
      { id: 'a', code: 'L55_A', skill: 'LISTENING', cefrLevel: 'B1' },
      { id: 'b', code: 'R60_B', skill: 'READING', cefrLevel: 'B2' },
    ])

    expect(layout.columns.map((column) => column.key)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
    expect(layout.lanes.map((lane) => lane.key)).toEqual(['LISTENING', 'READING'])
    expect(layout.positions.a.x).toBe(LABEL_WIDTH + 2 * (NODE_WIDTH + COLUMN_GAP))
    expect(layout.positions.b.x).toBe(LABEL_WIDTH + 3 * (NODE_WIDTH + COLUMN_GAP))
    expect(layout.positions.b.y).toBeGreaterThan(layout.positions.a.y)
  })

  it('stacks the points of one cell by code', () => {
    const layout = layoutGraph([
      { id: 'late', code: 'R60_Z', skill: 'READING', cefrLevel: 'B2' },
      { id: 'early', code: 'R60_A', skill: 'READING', cefrLevel: 'B2' },
    ])

    expect(layout.positions.early.x).toBe(layout.positions.late.x)
    expect(layout.positions.late.y - layout.positions.early.y).toBe(NODE_HEIGHT + ROW_GAP)
    expect(layout.lanes).toHaveLength(1)
    expect(layout.lanes[0].height).toBeGreaterThanOrEqual(2 * NODE_HEIGHT + ROW_GAP)
  })

  it('adds a "no level" column only when a point has no CEFR level', () => {
    const without = layoutGraph([{ id: 'a', code: 'A', skill: 'READING', cefrLevel: 'B1' }])
    expect(without.columns.some((column) => column.key === 'NONE')).toBe(false)

    const withLevelless = layoutGraph([{ id: 'a', code: 'A', skill: 'READING', cefrLevel: null }])
    expect(withLevelless.columns.at(-1)).toMatchObject({ key: 'NONE', label: 'Chưa có cấp' })
    expect(withLevelless.positions.a.x).toBe(withLevelless.columns.at(-1)?.x)
  })

  it('gives skill ALL its own Grammar / Vocabulary lane and unknown skills the last lane', () => {
    const layout = layoutGraph([
      { id: 'g', code: 'G55_A', skill: 'ALL', cefrLevel: 'B1' },
      { id: 'u', code: 'X_A', skill: null, cefrLevel: 'B1' },
      { id: 'w', code: 'W60_A', skill: 'WRITING', cefrLevel: 'B2' },
    ])

    expect(layout.lanes.map((lane) => lane.label)).toEqual(['Writing', 'Grammar / Vocabulary', 'Khác'])
  })

  it('is deterministic and gives every point a distinct place', () => {
    const input = [
      { id: '1', code: 'B', skill: 'READING', cefrLevel: 'B1' as const },
      { id: '2', code: 'A', skill: 'READING', cefrLevel: 'B1' as const },
      { id: '3', code: 'C', skill: 'WRITING', cefrLevel: 'B1' as const },
    ]
    const first = layoutGraph(input)
    const second = layoutGraph([...input].reverse())

    expect(second.positions).toEqual(first.positions)
    const places = new Set(Object.values(first.positions).map((place) => `${place.x},${place.y}`))
    expect(places.size).toBe(3)
  })

  it('handles an empty graph', () => {
    const layout = layoutGraph([])
    expect(layout.lanes).toEqual([])
    expect(layout.positions).toEqual({})
  })
})

describe('laneOf', () => {
  it('maps known skills and falls back to OTHER', () => {
    expect(laneOf('SPEAKING')).toBe('SPEAKING')
    expect(laneOf('ALL')).toBe('ALL')
    expect(laneOf('OTHER')).toBe('OTHER')
    expect(laneOf('NOPE')).toBe('OTHER')
    expect(laneOf(undefined)).toBe('OTHER')
  })
})
