import { describe, expect, it } from 'vitest'
import { menuFor, rolesFor } from './adminMenu'

describe('adminMenu', () => {
  it('gives authors every item', () => {
    expect(menuFor(['CONTENT_AUTHOR']).map((item) => item.label)).toEqual([
      'Tổng quan', 'Cây tri thức', 'Bài học', 'Ngân hàng câu hỏi',
    ])
    expect(menuFor(['ADMIN'])).toHaveLength(4)
  })

  it('shows an examiner only the knowledge graph', () => {
    expect(menuFor(['EXAMINER']).map((item) => item.path)).toEqual(['/admin/knowledge-graph'])
  })

  it('shows learners nothing', () => {
    expect(menuFor(['CUSTOMER'])).toEqual([])
    expect(menuFor(undefined)).toEqual([])
  })

  it('looks up the roles of a route', () => {
    expect(rolesFor('/admin/lessons')).toEqual(['ADMIN', 'CONTENT_AUTHOR'])
    expect(rolesFor('/admin/unknown')).toEqual([])
  })
})
