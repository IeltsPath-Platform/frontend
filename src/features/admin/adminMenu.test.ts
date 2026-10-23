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
      '/content-author/content', '/content-author/courses', '/content-author/knowledge-graph', '/content-author/lessons', '/content-author/questions', '/content-author/packages', '/content-author/rubrics', '/content-author/error-types',
    ])
  })

  it('shows an examiner only the knowledge graph', () => {
    expect(menuFor(['EXAMINER']).map((item) => item.path)).toEqual(['/admin/knowledge-graph'])
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

  it('looks up route roles and rejects unknown routes', () => {
    expect(rolesFor('/admin/lessons')).toEqual(['CONTENT_AUTHOR'])
    expect(rolesFor('/content-author/lessons')).toEqual(['CONTENT_AUTHOR'])
    expect(rolesFor('/content-author/users')).toEqual([])
    expect(rolesFor('/admin/users')).toEqual(['ADMIN'])
    expect(rolesFor('/admin/unknown')).toEqual([])
  })
})
