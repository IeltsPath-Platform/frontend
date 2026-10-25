import { describe, expect, it } from 'vitest'
import { QUESTION_DRAFTS_ENABLED } from './ai-drafts/draftFlags'
import { menuFor, rolesFor } from './adminMenu'

describe('course draft menu', () => {
  it('shows course construction and question generation only to content authors', () => {
    expect(QUESTION_DRAFTS_ENABLED).toBe(true)
    expect(menuFor(['CONTENT_AUTHOR']).find((item) => item.path === '/content-author/course-drafts')?.label).toBe('Dựng khóa học')
    expect(menuFor(['CONTENT_AUTHOR']).find((item) => item.path === '/content-author/ai-drafts')?.label).toBe('Sinh nội dung bằng AI')
    for (const roles of [['ADMIN'], ['EXAMINER'], ['CUSTOMER'], undefined]) {
      expect(menuFor(roles).some((item) => item.path === '/content-author/course-drafts')).toBe(false)
      expect(menuFor(roles).some((item) => item.path === '/content-author/ai-drafts')).toBe(false)
    }
    expect(rolesFor('/content-author/course-drafts')).toEqual(['CONTENT_AUTHOR'])
    expect(rolesFor('/admin/course-drafts')).toEqual([])
  })
})
