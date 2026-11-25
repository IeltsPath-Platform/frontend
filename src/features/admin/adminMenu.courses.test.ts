import { describe, expect, it } from 'vitest'
import { QUESTION_DRAFTS_ENABLED } from './ai-drafts/draftFlags'
import { menuFor } from './adminMenu'

describe('question generation menu', () => {
  it('shows question generation only to content authors, and no course builder to anyone', () => {
    expect(QUESTION_DRAFTS_ENABLED).toBe(true)
    expect(menuFor(['CONTENT_AUTHOR']).find((item) => item.path === '/content-author/ai-drafts')?.label).toBe('Duyệt câu hỏi AI')
    expect(menuFor(['CONTENT_AUTHOR']).some((item) => item.path === '/content-author/course-drafts')).toBe(false)
    for (const roles of [['ADMIN'], ['EXAMINER'], ['CUSTOMER'], undefined]) {
      expect(menuFor(roles).some((item) => item.path === '/content-author/ai-drafts')).toBe(false)
    }
  })
})
