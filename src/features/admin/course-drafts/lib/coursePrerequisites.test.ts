import { describe, expect, it } from 'vitest'
import type { TreeNode } from '../../knowledge-graph/types'
import { coursePrerequisites } from './coursePrerequisites'

const node = (id: string, cefrLevel: TreeNode['cefrLevel']): TreeNode => ({ id, code: id.toUpperCase(), name: id, cefrLevel } as TreeNode)
const nodes = [node('c1', 'C1'), node('c1b', 'C1'), node('b2', 'B2'), node('b1', 'B1'), node('b1b', 'B1'), node('a2', 'A2'), node('plain', null)]
/** An edge points from the prerequisite to the point that depends on it. */
const edge = (from: string, to: string) => ({ from, to })

describe('coursePrerequisites', () => {
  it('walks the whole chain and lists the deepest prerequisite first', () => {
    const edges = [edge('b2', 'c1'), edge('b1', 'b2'), edge('a2', 'b1')]
    expect(coursePrerequisites(['c1'], nodes, edges)).toEqual(['a2', 'b1', 'b2'])
  })

  it('takes a prerequisite reached by two ways once and never returns the points asked for', () => {
    const edges = [edge('b2', 'c1'), edge('b1', 'c1'), edge('b1', 'b2'), edge('b2', 'c1b'), edge('c1b', 'c1')]
    expect(coursePrerequisites(['c1', 'c1b'], nodes, edges).sort()).toEqual(['b1', 'b2'])
  })

  it('goes through prerequisites of the same level and skips points without a level', () => {
    const edges = [edge('c1b', 'c1'), edge('plain', 'c1'), edge('b2', 'c1'), edge('b1', 'c1b'), edge('b1b', 'plain')]
    expect(coursePrerequisites(['c1'], nodes, edges).sort()).toEqual(['b1', 'b2', 'c1b'])
  })

  it('does not loop on a cycle', () => {
    const edges = [edge('b2', 'c1'), edge('b1', 'b2'), edge('b2', 'b1')]
    expect(coursePrerequisites(['c1'], nodes, edges).sort()).toEqual(['b1', 'b2'])
  })

  it('returns nothing for no points or an unknown point', () => {
    expect(coursePrerequisites([], nodes, [edge('b2', 'c1')])).toEqual([])
    expect(coursePrerequisites(['ghost'], nodes, [edge('b2', 'c1')])).toEqual([])
  })
})
