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
    expect(await within(content).findByText('57 KP đang hoạt động')).toHaveAttribute('href', '/content-author/knowledge-graph')
    expect(within(content).getByRole('img', { name: /45 trên 57 KP đang hoạt động đã có câu hỏi xuất bản; 12 KP chưa có/ })).toBeInTheDocument()
    expect(within(content).getAllByText('79%')).toHaveLength(2)
    expect(within(content).getByText('Phiên bản câu hỏi chờ xuất bản').closest('a')).toHaveAttribute('href', '/content-author/questions')
    expect(within(content).getByText('Phiên bản câu hỏi chờ xuất bản').closest('a')).toHaveTextContent('4')
    expect(within(content).getByRole('img', { name: /Bài học theo trạng thái: Đã xuất bản 9, Bản nháp 2, Đã lưu trữ 0/ })).toBeInTheDocument()
    expect(within(content).getByText('bài học').closest('a')).toHaveTextContent('11 bài học')

    const health = screen.getByRole('region', { name: 'Sức khỏe cây tri thức' })
    expect(await within(health).findByText('KP cô lập')).toBeInTheDocument()
    expect(within(health).getByText('KP cô lập').previousSibling).toHaveTextContent('2')
    expect(within(health).getAllByLabelText('Ổn')).toHaveLength(2)
    expect(within(health).getAllByLabelText('Cần xử lý')).toHaveLength(1)

    expect(await screen.findByText('Thiếu bộ câu hỏi ôn tập')).toBeInTheDocument()
    expect(await screen.findByText('13% đúng · 40 lượt')).toBeInTheDocument()
    expect(screen.getByText('97% đúng · 30 lượt')).toBeInTheDocument()
  })

  it('draws the skill and CEFR charts from the grouped counts', async () => {
    api.fetchContentOverview.mockResolvedValue({
      knowledgePoints: {
        total: 70,
        byStatus: { ACTIVE: 57, INACTIVE: 13 },
        bySkill: { LISTENING: 10, READING: 22, WRITING: 8, SPEAKING: 14, NONE: 3 },
        byCefr: { A1: 5, B1: 30, C2: 20, NONE: 2 },
      },
      activeKnowledgePointsWithoutPublishedQuestion: 12,
    })
    renderPage()

    const content = await screen.findByRole('region', { name: 'Nội dung' })
    const skills = await within(content).findByRole('list', { name: 'Số KP đang hoạt động theo kỹ năng' })
    expect(within(skills).getAllByRole('listitem')).toHaveLength(5)
    expect(within(within(skills).getByText('Đọc').closest('li')!).getByText('22')).toBeInTheDocument()
    expect(within(skills).getByText('Chưa gán kỹ năng')).toBeInTheDocument()

    const cefr = within(content).getByRole('img', { name: /theo cấp CEFR, từ A1 đến C2/ })
    expect(within(cefr).getByText('B1')).toBeInTheDocument()
    expect(within(cefr).getByText('Chưa gán')).toBeInTheDocument()
  })

  it('keeps the other blocks when one source fails', async () => {
    api.fetchAuthorWorkItems.mockRejectedValue(new HttpError(503, 'Dịch vụ học tập chưa sẵn sàng'))
    renderPage()

    const work = await screen.findByRole('region', { name: 'Việc cần làm của R&D' })
    expect(await within(work).findByRole('alert')).toHaveTextContent('Dịch vụ học tập chưa sẵn sàng')
    expect(await screen.findByText('57 KP đang hoạt động')).toBeInTheDocument()
    expect(screen.getByText('Sức khỏe cây tri thức')).toBeInTheDocument()
  })

  it('says a chart has no numbers yet when the server does not send them', async () => {
    api.fetchContentOverview.mockResolvedValue({})
    renderPage()

    const content = await screen.findByRole('region', { name: 'Nội dung' })
    expect(await within(content).findAllByText('Chưa có số liệu.')).toHaveLength(4)
    expect(within(content).queryByRole('img')).not.toBeInTheDocument()
  })

  it('says there is nothing to do when the queue and statistics are empty', async () => {
    api.fetchAuthorWorkItems.mockResolvedValue([])
    api.fetchQuestionStats.mockResolvedValue([])
    renderPage()

    expect(await screen.findAllByText('Chưa có gì cần xử lý')).toHaveLength(2)
  })
})
