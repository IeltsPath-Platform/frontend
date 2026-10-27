import { describe, expect, it } from 'vitest'
import type { CefrLevel } from '../../knowledge-graph/types'
import { cefrForBand, courseKnowledgeLevels, courseKnowledgeOptions } from './courseKnowledgeOptions'

const node = (code: string, skill: string | null, cefrLevel: CefrLevel | null) => ({ code, skill, cefrLevel })

describe('cefrForBand', () => {
  it.each([[4.5, 'B1'], [5.5, 'B2'], [6, 'B2'], [6.5, 'C1'], [7.5, 'C1'], [8, 'C2']])('maps band %s to %s', (band, level) => {
    expect(cefrForBand(band)).toBe(level)
  })
  it('has no level above band 9', () => expect(cefrForBand(9.5)).toBeNull())
})

describe('courseKnowledgeLevels', () => {
  it.each([[6.5, ['C1', 'B2']], [5.5, ['B2', 'B1']], [4, ['B1', 'A2']], [8, ['C2', 'C1']], [1, ['A1']], [9.5, []]])('offers %s as %j', (band, levels) => {
    expect(courseKnowledgeLevels(band)).toEqual(levels)
  })
})

describe('courseKnowledgeOptions', () => {
  const nodes = [
    node('R_B1', 'READING', 'B1'), node('R_C1', 'READING', 'C1'), node('R_B2', 'READING', 'B2'),
    node('L_C1', 'LISTENING', 'C1'), node('W_C2', 'WRITING', 'C2'), node('G_B1', 'ALL', 'B1'), node('G_NONE', null, 'B2'),
    node('TRAP_X', 'READING', null),
  ]

  it('keeps the picked skills and the shared ones, at the band level and the one below, highest level first', () => {
    expect(courseKnowledgeOptions(nodes, 6.5, ['READING']).map((item) => item.code)).toEqual(['R_C1', 'R_B2', 'G_NONE'])
  })

  it('leaves out points of a higher level than the band, and of a level two or more below it', () => {
    const codes = courseKnowledgeOptions(nodes, 5.5, ['READING', 'WRITING']).map((item) => item.code)
    expect(codes).toEqual(['R_B2', 'G_NONE', 'R_B1', 'G_B1'])
    expect(courseKnowledgeOptions(nodes, 8, ['READING', 'WRITING', 'LISTENING']).map((item) => item.code)).toEqual(['W_C2', 'R_C1', 'L_C1'])
  })

  it('leaves out points with no level, such as error traps', () => {
    expect(courseKnowledgeOptions(nodes, 6.5, ['READING']).map((item) => item.code)).not.toContain('TRAP_X')
  })

  it('offers nothing for a band outside the scale, and only shared points with no skill picked', () => {
    expect(courseKnowledgeOptions(nodes, 9.5, ['READING'])).toEqual([])
    expect(courseKnowledgeOptions(nodes, 5.5, []).map((item) => item.code)).toEqual(['G_NONE', 'G_B1'])
  })
})
