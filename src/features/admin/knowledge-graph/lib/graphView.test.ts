import { describe, expect, it } from 'vitest'
import type { TreeNode } from '../types'
import { flagsOf, matchesQuery } from './graphView'

function node(id: string, overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    id, code: `R55_${id.toUpperCase()}`, name: `Point ${id}`, skill: 'READING', kind: 'STRATEGY', status: 'ACTIVE',
    cefrLevel: 'B1', canDo: `Can do ${id}.`, ...overrides,
  }
}

describe('matchesQuery', () => {
  it('searches code, name and can-do without case', () => {
    const item = node('x', { canDo: 'Scan for dates quickly.' })
    expect(matchesQuery(item, '')).toBe(true)
    expect(matchesQuery(item, 'r55_x')).toBe(true)
    expect(matchesQuery(item, 'point x')).toBe(true)
    expect(matchesQuery(item, 'scan for')).toBe(true)
    expect(matchesQuery(item, 'listening')).toBe(false)
  })
})

describe('flagsOf', () => {
  it('turns the health report into lookup sets', () => {
    const flags = flagsOf({ isolatedIds: ['a'], missingMetadataIds: ['b'], levelViolations: [{ from: 'x', to: 'y' }] })
    expect(flags.isolated.has('a')).toBe(true)
    expect(flags.missing.has('b')).toBe(true)
    expect(flags.violations.has('x->y')).toBe(true)
    expect(flagsOf(null).isolated.size).toBe(0)
  })
})
