import { describe, expect, it } from 'vitest'
import type { Rubric } from '../types'
import { activationProblem, rubricDraft } from './rubricDraft'

const active: Rubric = { code: 'IELTS_WRITING_T2', task: 'TASK_2', version: 3, status: 'ACTIVE', sourceNote: 'Bản chuẩn', criteria: [{ code: 'TR', name: 'Task Response', description: 'Đáp ứng đề', sortOrder: 1, knowledgePointId: 'kp1', bandDescriptors: [{ band: 7, descriptor: 'Phát triển ý rõ ràng' }] }], examples: [{ band: 6.5, prompt: 'Đề bài', essay: 'Bài viết', commentary: 'Nhận xét' }] }
describe('rubricDraft', () => {
  it('deep copies all authored content and chooses the next available version', () => {
    const result = rubricDraft(active, [{ ...active, version: 8, status: 'DRAFT' }])
    expect(result.version).toBe(9)
    expect(result.criteria[0]?.bandDescriptors).toEqual(active.criteria[0]?.bandDescriptors)
    expect(result.examples).toEqual(active.examples)
    expect(result).not.toHaveProperty('status')
    expect(result.criteria[0]).not.toHaveProperty('knowledgePointId')
    result.criteria[0]!.bandDescriptors[0]!.descriptor = 'Nội dung mới'
    result.examples[0]!.essay = 'Bài viết mới'
    expect(active.criteria[0]!.bandDescriptors[0]!.descriptor).toBe('Phát triển ý rõ ràng')
    expect(active.examples[0]!.essay).toBe('Bài viết')
  })
  it('uses the active version even when the draft list is empty', () => {
    expect(rubricDraft(active, []).version).toBe(4)
  })
  it('explains the criteria needed for activation', () => {
    expect(activationProblem(rubricDraft(active, []))).toContain('TR, CC, LR, GRA')
  })
})
