import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminSearchProvider } from '../../AdminSearchProvider'
import { LessonsPage } from './LessonsPage'

const { api, graph } = vi.hoisted(() => ({
  api: { fetchTopics: vi.fn(), fetchLessons: vi.fn(), createLesson: vi.fn(), reorderLessons: vi.fn() },
  graph: { fetchCourses: vi.fn() },
}))
vi.mock('../api/lessonApi', () => api)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => graph)

const summary = (id: string, title: string, sortOrder: number) => ({
  id, topicId: 't1', code: id.toUpperCase(), title, summary: null, sortOrder, status: 'DRAFT' as const,
  estimatedMinutes: null, blockCount: 2, knowledgePointCount: 1,
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminSearchProvider><LessonsPage /></AdminSearchProvider>
    </MemoryRouter>,
  )
}

describe('LessonsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    graph.fetchCourses.mockResolvedValue([{ id: 'c1', name: 'IELTS Reading' }])
    api.fetchTopics.mockResolvedValue([
      { id: 't1', code: 'R-SKIM', name: 'Skimming', skill: 'READING', courseId: 'c1', status: 'ACTIVE', sortOrder: 1 },
    ])
    api.fetchLessons.mockResolvedValue([summary('l1', 'Lesson one', 1), summary('l2', 'Lesson two', 2)])
  })

  it('asks for a topic first, then lists its lessons in every status', async () => {
    renderPage()
    expect(await screen.findByText('Chọn một chủ đề để xem các bài học')).toBeInTheDocument()

    fireEvent.change(await screen.findByLabelText('Chủ đề'), { target: { value: 't1' } })

    expect(await screen.findByRole('link', { name: 'Lesson one' })).toHaveAttribute('href', '/admin/lessons/l1')
    expect(screen.getAllByText('Nháp')).toHaveLength(2)
  })

  it('moves a lesson down by sending the new order', async () => {
    api.reorderLessons.mockResolvedValue(undefined)
    renderPage()
    fireEvent.change(await screen.findByLabelText('Chủ đề'), { target: { value: 't1' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Đưa Lesson one xuống' }))

    await waitFor(() => expect(api.reorderLessons).toHaveBeenCalledWith('t1', ['l2', 'l1']))
  })

  it('creates a draft lesson in the chosen topic', async () => {
    api.createLesson.mockResolvedValue(undefined)
    renderPage()
    fireEvent.change(await screen.findByLabelText('Chủ đề'), { target: { value: 't1' } })
    await screen.findByRole('link', { name: 'Lesson one' })
    fireEvent.click(screen.getByRole('button', { name: /Bài học mới/ }))

    fireEvent.change(screen.getByLabelText('Mã bài học'), { target: { value: 'R-SKIM-3' } })
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Lesson three' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bài học nháp' }))

    await waitFor(() => expect(api.createLesson).toHaveBeenCalledWith('t1', {
      code: 'R-SKIM-3', title: 'Lesson three', summary: '', summaryMarkdown: '', estimatedMinutes: null,
    }))
  })
})
