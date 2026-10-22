import { describe, expect, it } from 'vitest'
import { lessonEditorSchema, lessonSummarySchema } from './types'

describe('lesson schemas', () => {
  it('normalises the internal spelling (lessonId, blockId, asset) to plain ids and sorts the blocks', () => {
    const lesson = lessonEditorSchema.parse({
      lessonId: 'l1', topicId: 't1', code: 'L1', title: 'Skimming', status: 'PUBLISHED',
      knowledgePoints: [{ id: 'kp1', code: 'R55_X', name: 'X' }],
      blocks: [
        { blockId: 'b2', blockType: 'EXERCISE', sortOrder: 2, questions: [{ questionVersionId: 'v1', stem: 'Q?' }] },
        { id: 'b1', blockType: 'ASSET', sortOrder: 1, asset: { id: 'a1' } },
      ],
    })

    expect(lesson.id).toBe('l1')
    expect(lesson.knowledgePointIds).toEqual(['kp1'])
    expect(lesson.blocks.map((block) => block.id)).toEqual(['b1', 'b2'])
    expect(lesson.blocks[0].assetId).toBe('a1')
    expect(lesson.blocks[1].questions[0].questionVersionId).toBe('v1')
    expect(lesson.summary).toBe('')
  })

  it('rejects a lesson or block without an id', () => {
    expect(lessonEditorSchema.safeParse({ code: 'L', title: 'T', status: 'DRAFT' }).success).toBe(false)
    expect(lessonEditorSchema.safeParse({ id: 'l', code: 'L', title: 'T', status: 'DRAFT', blocks: [{ blockType: 'TEXT' }] }).success).toBe(false)
  })

  it('normalises a list item and counts its knowledge points', () => {
    const item = lessonSummarySchema.parse({ id: 'l1', code: 'L1', title: 'T', status: 'DRAFT', blockCount: 3, knowledgePointIds: ['a', 'b'] })
    expect(item).toMatchObject({ id: 'l1', blockCount: 3, knowledgePointCount: 2, sortOrder: 0, estimatedMinutes: null })
  })
})
