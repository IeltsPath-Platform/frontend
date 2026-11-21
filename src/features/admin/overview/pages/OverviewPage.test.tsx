import { render, screen, within } from '@/test/render'
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
      { id: 'w1', queue: 'CONTENT_AUTHOR', kind: 'CONTENT_GAP', detail: '{"knowledgePointId":"kp1"}', status: 'OPEN', subject: { type: 'KNOWLEDGE_POINT', id: 'kp1', code: 'R55_SCAN', name: 'Scanning', occurrences: 3 } },
    ])
    api.fetchQuestionStats.mockResolvedValue([stat('aaaaaaaa-1', 40, 5), stat('bbbbbbbb-2', 30, 29), stat('cccccccc-3', 25, 12)])
  })

  it('opens on the few numbers that matter, each linking to the screen that owns it', async () => {
    renderPage()

    const kpis = await screen.findByRole('list', { name: 'Số liệu chính' })
    const kpi = (label: string) => within(kpis).getByText(label).closest('a')!
    await within(kpis).findByText('57')
    expect(kpi('KP đang hoạt động')).toHaveTextContent('57')
    expect(kpi('KP đang hoạt động')).toHaveAttribute('href', '/content-author/knowledge-graph')
    expect(kpi('KP có câu hỏi')).toHaveTextContent('79%')
    expect(kpi('Bài học đã xuất bản')).toHaveTextContent('9')
    expect(kpi('Bản nháp chờ xuất bản')).toHaveTextContent('4')
    expect(kpi('Bản nháp chờ xuất bản')).toHaveAttribute('href', '/content-author/questions?status=DRAFT')
    expect(kpi('Việc của R&D đang mở')).toHaveTextContent('1')
  })

  it('lists everything that needs doing in one block, leaving out what is fine, with filtered links', async () => {
    renderPage()

    const attention = await screen.findByRole('region', { name: 'Cần xử lý ngay' })
    const isolated = await within(attention).findByText('KP cô lập, chưa nối với KP nào')
    expect(isolated.closest('a')).toHaveTextContent('2')
    expect(isolated.closest('a')).toHaveAttribute('href', '/content-author/knowledge-graph?flagged=1')
    expect(within(attention).getByText('KP chưa có câu hỏi đã xuất bản').closest('a')).toHaveTextContent('12')
    expect(within(attention).getByText('Phiên bản câu hỏi chờ xuất bản').closest('a')).toHaveAttribute('href', '/content-author/questions?status=DRAFT')
    // No KP without CEFR or can-do, and no level violation: those two rows are not shown at all.
    expect(within(attention).queryByText('KP thiếu CEFR hoặc can-do')).not.toBeInTheDocument()
    expect(within(attention).queryByText('Cạnh tiên quyết sai cấp độ')).not.toBeInTheDocument()
  })

  it('shows the counts of the content block with links to the screen that fixes them', async () => {
    renderPage()

    const content = await screen.findByRole('region', { name: 'Nội dung' })
    expect(await within(content).findByText('57 KP đang hoạt động')).toHaveAttribute('href', '/content-author/knowledge-graph')
    expect(within(content).getByRole('img', { name: /45 trên 57 KP đang hoạt động đã có câu hỏi xuất bản; 12 KP chưa có/ })).toBeInTheDocument()
    expect(within(content).getAllByText('79%')).toHaveLength(2)
    expect(within(content).getByText('Phiên bản câu hỏi chờ xuất bản').closest('a')).toHaveAttribute('href', '/content-author/questions?status=DRAFT')
    expect(within(content).getByRole('img', { name: /Bài học theo trạng thái: Đã xuất bản 9, Bản nháp 2, Đã lưu trữ 0/ })).toBeInTheDocument()
    expect(within(content).getByText('bài học').closest('a')).toHaveTextContent('11 bài học')

    expect(await screen.findByText('KP thiếu bài luyện')).toBeInTheDocument()
    expect(screen.getByText(/Scanning · Hết bài ôn 3 lần/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem tất cả' })).toHaveAttribute('href', '/content-author/work-items')
    expect(await screen.findByText('13% đúng · 40 lượt')).toBeInTheDocument()
    expect(screen.getByText('97% đúng · 30 lượt')).toBeInTheDocument()
  })

  it('draws no bar for lessons that are all published, and says so', async () => {
    api.fetchContentOverview.mockResolvedValue({
      knowledgePoints: { total: 10, byStatus: { ACTIVE: 10 } },
      activeKnowledgePointsWithoutPublishedQuestion: 0,
      draftQuestionVersions: 0,
      lessons: { DRAFT: 0, PUBLISHED: 189, ARCHIVED: 0 },
    })
    renderPage()

    const content = await screen.findByRole('region', { name: 'Nội dung' })
    expect(await within(content).findByText('Tất cả đã xuất bản')).toBeInTheDocument()
    expect(within(content).getByText('bài học').closest('a')).toHaveTextContent('189 bài học')
    expect(within(content).queryByRole('img', { name: /Bài học theo trạng thái/ })).not.toBeInTheDocument()
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
    expect(screen.getByRole('region', { name: 'Cần xử lý ngay' })).toBeInTheDocument()
  })

  it('names the source that failed in the attention block and still lists the rows of the others', async () => {
    graph.fetchKnowledgeTreeHealth.mockRejectedValue(new HttpError(503, 'Cây tri thức chưa sẵn sàng'))
    renderPage()

    const attention = await screen.findByRole('region', { name: 'Cần xử lý ngay' })
    expect(await within(attention).findByRole('alert')).toHaveTextContent('Không tải được kết quả kiểm tra cây tri thức: Cây tri thức chưa sẵn sàng')
    expect(within(attention).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    expect(within(attention).getByText('KP chưa có câu hỏi đã xuất bản')).toBeInTheDocument()
  })

  it('says a chart has no numbers yet when the server does not send them', async () => {
    api.fetchContentOverview.mockResolvedValue({})
    renderPage()

    const content = await screen.findByRole('region', { name: 'Nội dung' })
    expect(await within(content).findAllByText('Chưa có số liệu.')).toHaveLength(4)
    expect(within(content).queryByRole('img')).not.toBeInTheDocument()
  })

  it('leaves no empty card behind when there is nothing to do, and says all is well', async () => {
    api.fetchContentOverview.mockResolvedValue({
      knowledgePoints: { total: 10, byStatus: { ACTIVE: 10 } },
      activeKnowledgePointsWithoutPublishedQuestion: 0,
      draftQuestionVersions: 0,
      lessons: { PUBLISHED: 3 },
    })
    graph.fetchKnowledgeTreeHealth.mockResolvedValue({ isolatedIds: [], missingMetadataIds: [], levelViolations: [] })
    api.fetchAuthorWorkItems.mockResolvedValue([])
    api.fetchQuestionStats.mockResolvedValue([])
    renderPage()

    const attention = await screen.findByRole('region', { name: 'Cần xử lý ngay' })
    expect(await within(attention).findByText(/Mọi thứ ổn/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Việc cần làm của R&D' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Câu hỏi lệch độ khó' })).not.toBeInTheDocument()
    expect(screen.queryByText('Chưa có gì cần xử lý')).not.toBeInTheDocument()
  })
})
