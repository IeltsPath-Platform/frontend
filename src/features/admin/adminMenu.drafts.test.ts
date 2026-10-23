import { describe, expect, it, vi } from 'vitest'
vi.mock('./ai-drafts/draftFlags', () => ({ QUESTION_DRAFTS_ENABLED: true }))
import { menuFor, rolesFor } from './adminMenu'

describe('enabled question generation menu', () => {
  it('shows the question draft entry only to content authors', () => {
    expect(menuFor(['CONTENT_AUTHOR']).find((item) => item.path === '/content-author/ai-drafts')?.label).toBe('Sinh nội dung bằng AI')
    for (const roles of [['ADMIN'], ['EXAMINER'], ['CUSTOMER'], undefined]) {
      expect(menuFor(roles).some((item) => item.path === '/content-author/ai-drafts')).toBe(false)
    }
    expect(rolesFor('/content-author/ai-drafts')).toEqual(['CONTENT_AUTHOR'])
    expect(rolesFor('/admin/ai-drafts')).toEqual([])
  })
})
