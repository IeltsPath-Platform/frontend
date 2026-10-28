import { describe, expect, it } from 'vitest'
import type { TreeNode } from '../../knowledge-graph/types'
import { courseKnowledgeTree, visibleKnowledgeLines, type KnowledgeTreeRow } from './courseKnowledgeTree'

const node = (id: string, cefrLevel: TreeNode['cefrLevel']): TreeNode => ({ id, code: id.toUpperCase(), name: id, cefrLevel } as TreeNode)
/** An edge points from the prerequisite to the point that depends on it. */
const edge = (from: string, to: string) => ({ from, to })
/** The tree as indented codes, each followed by the other points that need it too. */
const outline = (rows: readonly KnowledgeTreeRow[], depth = 0): string[] =>
  rows.flatMap((row) => [
    `${'  '.repeat(depth)}${row.node.code}${row.alsoFor.length ? ` [also ${row.alsoFor.map((node) => node.code).join(',')}]` : ''}`,
    ...outline(row.children, depth + 1),
  ])

describe('courseKnowledgeTree', () => {
  it('puts the goals at the top and the points they need beneath them, as deep as the graph goes', () => {
    const nodes = [node('c1', 'C1'), node('b2', 'B2'), node('b1', 'B1'), node('a2', 'A2')]
    const tree = courseKnowledgeTree(nodes, [edge('b2', 'c1'), edge('b1', 'b2'), edge('a2', 'b1')])

    expect(outline(tree)).toEqual(['C1', '  B2', '    B1', '      A2'])
  })

  it('keeps a link that a longer chain already implies: the point is drawn once and names the other point', () => {
    const nodes = [node('goal', 'C1'), node('mid', 'B2'), node('base', 'B1'), node('plain', 'B1')]
    // base is a prerequisite of mid, and of the goal directly too. Both links are real, so both are kept.
    const tree = courseKnowledgeTree(nodes, [edge('base', 'goal'), edge('mid', 'goal'), edge('base', 'mid'), edge('plain', 'goal')])

    expect(outline(tree)).toEqual(['GOAL', '  MID', '    BASE [also GOAL]', '  PLAIN'])
  })

  it('lists the prerequisites of a point highest level first, and the goals the same way', () => {
    const nodes = [node('c1', 'C1'), node('b1', 'B1'), node('b2', 'B2'), node('b2z', 'B2'), node('c1b', 'C1')]
    const tree = courseKnowledgeTree(nodes, [edge('b1', 'c1'), edge('b2z', 'c1'), edge('b2', 'c1')])

    expect(outline(tree)).toEqual(['C1', '  B2', '  B2Z', '  B1', 'C1B'])
  })

  it('draws a shared prerequisite once, beneath the first point that needs it, and names the others', () => {
    const nodes = [node('one', 'C1'), node('two', 'C1'), node('base', 'B2'), node('root', 'B1')]
    const tree = courseKnowledgeTree(nodes, [edge('base', 'one'), edge('base', 'two'), edge('root', 'base')])

    expect(outline(tree)).toEqual(['ONE', '  BASE [also TWO]', '    ROOT', 'TWO'])
  })

  it('leaves out links to points that are not in the list, and shows a point with no link as a goal', () => {
    const nodes = [node('a', 'C1'), node('lonely', 'B2')]
    const tree = courseKnowledgeTree(nodes, [edge('ghost', 'a'), edge('a', 'ghost'), edge('a', 'a')])

    expect(outline(tree)).toEqual(['A', 'LONELY'])
  })

  it('ends a loop where it closes and does not run forever', () => {
    const nodes = [node('top', 'C1'), node('x', 'B2'), node('y', 'B1')]
    const tree = courseKnowledgeTree(nodes, [edge('x', 'top'), edge('y', 'x'), edge('x', 'y')])

    expect(outline(tree)).toEqual(['TOP', '  X', '    Y'])
  })

  it('still places points that only lean on each other, with no goal above them', () => {
    const tree = courseKnowledgeTree([node('p', 'B2'), node('q', 'B1')], [edge('p', 'q'), edge('q', 'p')])

    expect(outline(tree)).toEqual(['P', '  Q'])
  })

  it('is empty for no points', () => {
    expect(courseKnowledgeTree([], [edge('a', 'b')])).toEqual([])
  })

  describe('as lines of a table', () => {
    const nodes = [node('c1', 'C1'), node('b2', 'B2'), node('b1', 'B1'), node('other', 'C1')]
    const tree = courseKnowledgeTree(nodes, [edge('b2', 'c1'), edge('b1', 'b2')])
    const codes = (lines: ReturnType<typeof visibleKnowledgeLines>) => lines.map((line) => `${line.depth}:${line.row.node.code}`)

    it('lists every line in reading order with its depth', () => {
      expect(codes(visibleKnowledgeLines(tree, new Set()))).toEqual(['0:C1', '1:B2', '2:B1', '0:OTHER'])
    })

    it('leaves out what is beneath a folded point but keeps the point', () => {
      expect(codes(visibleKnowledgeLines(tree, new Set(['b2'])))).toEqual(['0:C1', '1:B2', '0:OTHER'])
      expect(codes(visibleKnowledgeLines(tree, new Set(['c1'])))).toEqual(['0:C1', '0:OTHER'])
    })
  })
})
