import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { OverviewPage } from './OverviewPage'

const { api, graph } = vi.hoisted(() => ({
  api: { fetchContentOverview: vi.fn(), fetchAuthorWorkItems: vi.fn(), fetchQuestionStats: vi.fn() },
  graph: { fetchKnowledgeTreeHealth: vi.fn() },
}))
vi.mock('../api/overviewApi', () => api)
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => graph)

const stat = (id: string, attempts: number, correct: number) => ({ questionVersionId: id, attempts, correct, difficulty: null })

function renderPage() {
  return render(<MemoryRouter><OverviewPage /></MemoryRouter>)
}

describe('OverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchContentOverview.mockResolvedValue({
      knowledgePoints: { total: 70, byStatus: { ACTIVE: 57, INACTIVE: 13 } },
      activeKnowledgePointsWithoutPublishedQuestion: 12,
      draftQuestionVersions: 4,
      lessons: { DRAFT: 2, PUBLISHED: 9 },
    })
    graph.fetchKnowledgeTreeHealth.mockResolvedValue({ isolatedIds: ['a', 'b'], missingMetadataIds: [], levelViolations: [] })
    api.fetchAuthorWorkItems.mockResolvedValue([
      { id: 'w1', queue: 'CONTENT_AUTHOR', kind: 'CONTENT_GAP', detail: 'R55_SCAN ran out of sets', status: 'OPEN' },
    ])
    api.fetchQuestionStats.mockResolvedValue([stat('aaaaaaaa-1', 40, 5), stat('bbbbbbbb-2', 30, 29), stat('cccccccc-3', 25, 12)])
  })

  it('shows the counts of every block with links to the screen that fixes them', async () => {
    renderPage()

    const content = await screen.findByRole('region', { name: 'Nội dung' })
    expect(await within(content).findByText('57')).toBeInTheDocument()
    expect(within(content).getByText('Phiên bản câu hỏi chờ xuất bản').closest('a')).toHaveAttribute('href', '/admin/questions')
    expect(within(content).getByText('Bài học đã xuất bản').previousSibling).toHaveTextContent('9')

    const health = screen.getByRole('region', { name: 'Sức khỏe cây tri thức' })
    expect(await within(health).findByText('KP cô lập')).toBeInTheDocument()
    expect(within(health).getByText('KP cô lập').previousSibling).toHaveTextContent('2')

    expect(await screen.findByText('Thiếu bộ câu hỏi ôn tập')).toBeInTheDocument()
    expect(await screen.findByText('13% đúng · 40 lượt')).toBeInTheDocument()
    expect(screen.getByText('97% đúng · 30 lượt')).toBeInTheDocument()
  })

  it('keeps the other blocks when one source fails', async () => {
    api.fetchAuthorWorkItems.mockRejectedValue(new HttpError(503, 'Dịch vụ học tập chưa sẵn sàng'))
    renderPage()

    const work = await screen.findByRole('region', { name: 'Việc cần làm của R&D' })
    expect(await within(work).findByRole('alert')).toHaveTextContent('Dịch vụ học tập chưa sẵn sàng')
    expect(await screen.findByText('57')).toBeInTheDocument()
    expect(screen.getByText('Sức khỏe cây tri thức')).toBeInTheDocument()
  })

  it('shows an unknown count as a dash when the server does not send it', async () => {
    api.fetchContentOverview.mockResolvedValue({})
    renderPage()

    const content = await screen.findByRole('region', { name: 'Nội dung' })
    expect(await within(content).findAllByText('—')).toHaveLength(5)
  })

  it('says there is nothing to do when the queue and statistics are empty', async () => {
    api.fetchAuthorWorkItems.mockResolvedValue([])
    api.fetchQuestionStats.mockResolvedValue([])
    renderPage()

    expect(await screen.findAllByText('Chưa có gì cần xử lý')).toHaveLength(2)
  })
})
