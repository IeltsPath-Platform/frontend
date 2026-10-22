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
      '/content-author/content', '/content-author/courses', '/content-author/knowledge-graph', '/content-author/lessons', '/content-author/questions', '/content-author/rubrics',
    ])
  })

  it('shows an examiner only the knowledge graph', () => {
    expect(menuFor(['EXAMINER']).map((item) => item.path)).toEqual(['/admin/knowledge-graph'])
  })

  it('shows learners nothing', () => {
    expect(menuFor(['CUSTOMER'])).toEqual([])
    expect(menuFor(undefined)).toEqual([])
  })

  it('looks up route roles and rejects unknown routes', () => {
    expect(rolesFor('/admin/lessons')).toEqual(['CONTENT_AUTHOR'])
    expect(rolesFor('/content-author/lessons')).toEqual(['CONTENT_AUTHOR'])
    expect(rolesFor('/content-author/users')).toEqual([])
    expect(rolesFor('/admin/users')).toEqual(['ADMIN'])
    expect(rolesFor('/admin/unknown')).toEqual([])
  })
})
