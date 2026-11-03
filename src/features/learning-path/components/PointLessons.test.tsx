import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { TreePoint } from '~types/learningPath'
import { PointLessons } from './PointLessons'

const base: TreePoint = {
  knowledgePointId: 'p1', code: 'PR_MATCHING_INFORMATION', name: 'Tìm đoạn chứa thông tin', skill: 'READING', kind: null,
  cefrLevel: 'B2', canDo: null, mastery: null, tier: null, evidenceCount: 0, nextReviewAt: null, prerequisiteIds: [],
  practiceAvailable: true,
}

function renderLessons(point: TreePoint) {
  return render(<MemoryRouter><PointLessons courseId="course-1" point={point} /></MemoryRouter>)
}

describe('PointLessons', () => {
  it('links each lesson that teaches the point, with its chặng number and name and its number in the chặng', () => {
    renderLessons({
      ...base,
      topic: { topicId: 't3', name: 'Matching Information', position: 3 },
      lessons: [
        { lessonId: 'l1', title: 'Quét đoạn tìm chi tiết', position: 1, topicId: 't3', topicName: 'Matching Information', topicPosition: 3 },
        { lessonId: 'l2', title: 'Bẫy từ đồng nghĩa', position: 2, topicId: 't3', topicName: 'Matching Information', topicPosition: 3 },
      ],
    })
    const section = screen.getByRole('region', { name: 'Học ở đâu' })
    const links = within(section).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/learn/lessons/l1', '/learn/lessons/l2'])
    expect(links[0]).toHaveTextContent('Quét đoạn tìm chi tiết')
    expect(links[0]).toHaveTextContent('Chặng 03 · Matching Information · Bài 1')
    expect(links[1]).toHaveTextContent('Bài 2')
  })

  it('names the chặng that owns a point no lesson teaches, and links to it', () => {
    renderLessons({ ...base, topic: { topicId: 't3', name: 'Matching Information', position: 3 }, lessons: [] })
    const link = screen.getByRole('link', { name: 'Chặng 03 · Matching Information' })
    expect(link).toHaveAttribute('href', '/learn/courses/course-1?topic=t3')
    expect(screen.getByText(/chưa có bài học riêng/)).toBeInTheDocument()
  })

  it('draws nothing when the server does not say where the point is taught', () => {
    renderLessons(base)
    expect(screen.queryByRole('region', { name: 'Học ở đâu' })).not.toBeInTheDocument()
  })
})
