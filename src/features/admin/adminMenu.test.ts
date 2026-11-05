import { describe, expect, it } from 'vitest'
import { menuFor, rolesFor } from './adminMenu'

describe('adminMenu', () => {
  it('shows administrators only the four system screens', () => {
    expect(menuFor(['ADMIN']).map((item) => item.path)).toEqual([
      '/admin/system', '/admin/users', '/admin/services', '/admin/activity',
    ])
  })

  it('shows content authors their content screens', () => {
    expect(menuFor(['CONTENT_AUTHOR']).map((item) => item.path)).toEqual([
      '/content-author', '/content-author/courses', '/content-author/knowledge-graph', '/content-author/questions', '/content-author/packages', '/content-author/course-drafts', '/content-author/course-import',
      '/content-author/work-items', '/content-author/ai-evaluation',
      '/content-author/rubrics', '/content-author/error-types', '/content-author/ai-drafts',
    ])
  })

  it('shows an examiner their dashboard, the grading screens and the knowledge graph', () => {
    expect(menuFor(['EXAMINER']).map((item) => item.path)).toEqual([
      '/examiner', '/examiner/grading/writing', '/examiner/grading/speaking', '/examiner/knowledge-graph',
    ])
  })

  it('keeps the examiner screens to examiners', () => {
    for (const path of ['/examiner', '/examiner/profile', '/examiner/grading/writing', '/examiner/grading/speaking']) {
      expect(rolesFor(path)).toEqual(['EXAMINER'])
      for (const role of ['ADMIN', 'CONTENT_AUTHOR', 'CUSTOMER']) expect(menuFor([role]).some((item) => item.path === path)).toBe(false)
    }
  })

  it('keeps the profile screen out of the sidebar but open to examiners', () => {
    expect(menuFor(['EXAMINER']).some((item) => item.path === '/examiner/profile')).toBe(false)
    expect(rolesFor('/examiner/profile')).toEqual(['EXAMINER'])
  })

  it('shows learners nothing', () => {
    expect(menuFor(['CUSTOMER'])).toEqual([])
    expect(menuFor(undefined)).toEqual([])
  })

  it('restricts package editing to content authors', () => {
    expect(rolesFor('/content-author/packages')).toEqual(['CONTENT_AUTHOR'])
    expect(menuFor(['CONTENT_AUTHOR']).find((item) => item.path === '/content-author/packages')?.label).toBe('Đề & gói câu hỏi')
    for (const role of ['ADMIN', 'EXAMINER', 'CUSTOMER']) expect(menuFor([role]).some((item) => item.path.includes('/packages'))).toBe(false)
  })

  it('shows the work queue, examiner review and AI evaluation only to content authors', () => {
    const paths = ['/content-author/work-items', '/content-author/ai-evaluation', '/content-author/course-import']
    const labels = ['Việc cần làm', 'Đánh giá AI chấm Writing', 'Nhập khóa học từ Excel']
    paths.forEach((path, index) => {
      expect(menuFor(['CONTENT_AUTHOR']).find((item) => item.path === path)?.label).toBe(labels[index])
      expect(rolesFor(path)).toEqual(['CONTENT_AUTHOR'])
      for (const role of ['ADMIN', 'EXAMINER', 'CUSTOMER']) expect(menuFor([role]).some((item) => item.path === path)).toBe(false)
    })
  })

  it('looks up route roles and rejects unknown routes', () => {
    // Lessons are edited in a panel on the course page, so there is no lessons route left to grant.
    expect(rolesFor('/content-author/lessons')).toEqual([])
    expect(rolesFor('/content-author/courses')).toEqual(['CONTENT_AUTHOR'])
    expect(rolesFor('/content-author/users')).toEqual([])
    expect(rolesFor('/admin/users')).toEqual(['ADMIN'])
    expect(rolesFor('/admin/unknown')).toEqual([])
    expect(rolesFor('/examiner/knowledge-graph')).toEqual(['EXAMINER'])
    expect(rolesFor('/content-author/knowledge-graph')).toEqual(['CONTENT_AUTHOR'])
    expect(rolesFor('/admin/knowledge-graph')).toEqual(['CONTENT_AUTHOR', 'EXAMINER'])
    expect(rolesFor('/admin/examiner/profile')).toEqual(['EXAMINER'])
    expect(rolesFor('/admin/grading/writing')).toEqual(['EXAMINER'])
  })

  it('limits each workspace menu to its own pages for staff with multiple roles', () => {
    const roles = ['ADMIN', 'CONTENT_AUTHOR', 'EXAMINER']
    for (const area of ['admin', 'content-author', 'examiner'] as const) {
      const items = menuFor(roles, area)
      expect(items.length).toBeGreaterThan(0)
      expect(items.every((item) => item.path === `/${area}` || item.path.startsWith(`/${area}/`))).toBe(true)
    }
  })

  it('shows question generation only to content authors', () => {
    expect(menuFor(['CONTENT_AUTHOR']).some((item) => item.path === '/content-author/ai-drafts')).toBe(true)
    for (const role of ['ADMIN', 'EXAMINER', 'CUSTOMER']) expect(menuFor([role]).some((item) => item.path === '/content-author/ai-drafts')).toBe(false)
    expect(rolesFor('/content-author/ai-drafts')).toEqual(['CONTENT_AUTHOR'])
    expect(rolesFor('/admin/ai-drafts')).toEqual([])
  })
})
