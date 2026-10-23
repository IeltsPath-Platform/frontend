import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminSearchContext } from '../../adminSearch'
import type { KnowledgeTree, KnowledgeTreeHealth } from '../types'
import { KnowledgeGraphPage } from './KnowledgeGraphPage'

const { api, auth } = vi.hoisted(() => ({
  api: { fetchKnowledgeTree: vi.fn(), fetchKnowledgeTreeHealth: vi.fn(), fetchCourses: vi.fn() },
  auth: vi.fn(),
}))
vi.mock('../api/knowledgeGraphApi', () => api)
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: auth }))
// The canvas needs real layout measurements; the page's own behaviour is what these tests cover.
vi.mock('@xyflow/react', () => ({
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Position: { Left: 'left', Right: 'right' },
  Handle: () => null,
  Controls: () => null,
  ReactFlow: ({ nodes }: { nodes: Array<{ id: string; type: string; data: { node?: { code: string }; onSelect?: (id: string) => void } }> }) => (
    <ul data-testid="canvas">
      {nodes.filter((item) => item.type === 'kp').map((item) => (
        <li key={item.id}><button onClick={() => item.data.onSelect?.(item.id)} type="button">{item.data.node?.code}</button></li>
      ))}
    </ul>
  ),
}))

const tree: KnowledgeTree = {
  nodes: [
    { id: 'a', code: 'R55_SCANNING', name: 'Scanning', skill: 'READING', kind: 'STRATEGY', status: 'ACTIVE', cefrLevel: 'B1', canDo: 'Scan for dates.', scopeIn: 'Short texts.', scopeOut: null, courseId: 'c1', band: 5.5, lessonIds: ['l1', 'l2'] },
    { id: 'b', code: 'R60_SKIMMING', name: 'Skimming', skill: 'READING', kind: 'STRATEGY', status: 'ACTIVE', cefrLevel: 'B2', canDo: 'Skim a passage.' },
    { id: 'c', code: 'S60_PART2', name: 'Long turn', skill: 'SPEAKING', kind: 'STRATEGY', status: 'INACTIVE', cefrLevel: 'B2', canDo: 'Talk for two minutes.' },
  ],
  edges: [{ from: 'a', to: 'b' }],
}
const health: KnowledgeTreeHealth = { isolatedIds: ['c'], missingMetadataIds: [], levelViolations: [] }

function renderPage(query = '', path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminSearchContext.Provider value={{ query, setQuery: vi.fn() }}>
        <KnowledgeGraphPage />
      </AdminSearchContext.Provider>
    </MemoryRouter>,
  )
}

describe('KnowledgeGraphPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.mockReturnValue({ roles: ['CONTENT_AUTHOR'] })
    api.fetchKnowledgeTree.mockResolvedValue(tree)
    api.fetchKnowledgeTreeHealth.mockResolvedValue(health)
    api.fetchCourses.mockResolvedValue([{ id: 'c1', code: 'IELTS_5_5', name: 'IELTS 5.5', bandLevel: 5.5 }])
  })

  it('loads the tree and its health report and shows the counts and warnings', async () => {
    renderPage()

    expect(await screen.findByText('2 cạnh'.replace('2', '1'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/3 KP/)).toBeInTheDocument()
    expect(await screen.findByText('1 KP chưa nối')).toBeInTheDocument()
    expect(screen.getByText('0 cạnh ngược cấp')).toBeInTheDocument()
    expect(api.fetchKnowledgeTree).toHaveBeenCalledWith({ skill: '', courseId: '', includeInactive: false }, expect.any(AbortSignal))
  })

  it('opens the point named by the kp query, as a work item link does', async () => {
    renderPage('', '/content-author/knowledge-graph?kp=a')

    expect(await screen.findByRole('complementary', { name: 'Chi tiết R55_SCANNING' })).toBeInTheDocument()
  })

  it('shows no panel for a kp that is not in the tree', async () => {
    renderPage('', '/content-author/knowledge-graph?kp=missing')

    await screen.findByText(/3 KP/)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('opens the details of a point with its prerequisites, dependents, course and lessons', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'R55_SCANNING' }))

    const panel = await screen.findByRole('complementary', { name: 'Chi tiết R55_SCANNING' })
    expect(within(panel).getByText('Scan for dates.')).toBeInTheDocument()
    expect(within(panel).getByText('IELTS 5.5 (band 5.5)')).toBeInTheDocument()
    expect(within(panel).getByText('2 bài học liên kết')).toBeInTheDocument()
    const dependents = within(panel).getByRole('heading', { name: 'Mở ra' }).closest('section') as HTMLElement
    expect(within(dependents).getByRole('button', { name: 'R60_SKIMMING' })).toBeInTheDocument()

    fireEvent.click(within(dependents).getByRole('button', { name: 'R60_SKIMMING' }))
    const next = await screen.findByRole('complementary', { name: 'Chi tiết R60_SKIMMING' })
    const before = within(next).getByRole('heading', { name: 'Cần học trước' }).closest('section') as HTMLElement
    expect(within(before).getByRole('button', { name: 'R55_SCANNING' })).toBeInTheDocument()
  })

  it('filters the table by the topbar search and by warnings', async () => {
    renderPage('skim')
    fireEvent.click(await screen.findByRole('button', { name: 'Bảng' }))

    const table = await screen.findByRole('table')
    expect(within(table).getByText('R60_SKIMMING')).toBeInTheDocument()
    expect(within(table).queryByText('R55_SCANNING')).not.toBeInTheDocument()
    expect(screen.getByText(/1 khớp “skim”/)).toBeInTheDocument()
  })

  it('marks isolated points in the table and can show only the flagged ones', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Bảng' }))
    fireEvent.click(await screen.findByLabelText('Chỉ KP có cảnh báo'))

    const table = await screen.findByRole('table')
    expect(within(table).getByText('S60_PART2')).toBeInTheDocument()
    expect(within(table).getByText('Chưa nối')).toBeInTheDocument()
    expect(within(table).queryByText('R55_SCANNING')).not.toBeInTheDocument()
  })

  it('asks for inactive points only when an author turns the option on', async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText('Hiện KP chưa kích hoạt'))

    await waitFor(() => expect(api.fetchKnowledgeTree).toHaveBeenLastCalledWith(
      { skill: '', courseId: '', includeInactive: true }, expect.any(AbortSignal)))
  })

  it('does not offer inactive points to an examiner', async () => {
    auth.mockReturnValue({ roles: ['EXAMINER'] })
    renderPage()

    await screen.findByText(/3 KP/)
    expect(screen.queryByLabelText('Hiện KP chưa kích hoạt')).not.toBeInTheDocument()
    expect(api.fetchKnowledgeTree).toHaveBeenCalledWith({ skill: '', courseId: '', includeInactive: false }, expect.any(AbortSignal))
  })

  it('sends the chosen skill and course to the API', async () => {
    renderPage()
    await screen.findByText(/3 KP/)
    fireEvent.change(screen.getByLabelText('Kỹ năng'), { target: { value: 'WRITING' } })
    await waitFor(() => expect(api.fetchKnowledgeTree).toHaveBeenLastCalledWith(
      { skill: 'WRITING', courseId: '', includeInactive: false }, expect.any(AbortSignal)))
  })

  it('shows an error with a retry when the tree cannot be loaded', async () => {
    api.fetchKnowledgeTree.mockRejectedValueOnce(new Error('boom'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Có lỗi xảy ra')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText(/3 KP/)).toBeInTheDocument()
  })

  it('still draws the graph when only the health check fails', async () => {
    api.fetchKnowledgeTreeHealth.mockRejectedValue(new Error('down'))
    renderPage()

    expect(await screen.findByText(/3 KP/)).toBeInTheDocument()
    expect(await screen.findByText(/Không tải được kiểm tra đồ thị/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'R55_SCANNING' })).toBeInTheDocument()
  })

  it('says so when the filters match nothing', async () => {
    api.fetchKnowledgeTree.mockResolvedValue({ nodes: [], edges: [] })
    renderPage()

    expect(await screen.findByText('Không có knowledge point nào')).toBeInTheDocument()
  })
})
