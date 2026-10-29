import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminSearchContext } from '../../adminSearch'
import type { KnowledgeTree, KnowledgeTreeHealth } from '../types'
import { KnowledgeGraphPage } from './KnowledgeGraphPage'

const { api, points, lessons, auth } = vi.hoisted(() => ({
  api: { fetchKnowledgeTree: vi.fn(), fetchKnowledgeTreeHealth: vi.fn(), fetchCourses: vi.fn() },
  points: {
    fetchKnowledgePoints: vi.fn(), fetchPrerequisites: vi.fn(), createKnowledgePoint: vi.fn(), updateKnowledgePoint: vi.fn(),
    replacePrerequisites: vi.fn(), deactivateKnowledgePoint: vi.fn(), activateKnowledgePoint: vi.fn(),
  },
  lessons: { fetchTopics: vi.fn() },
  auth: vi.fn(),
}))
vi.mock('../api/knowledgeGraphApi', () => api)
vi.mock('../api/knowledgePointApi', () => points)
vi.mock('../../lessons/api/lessonApi', () => lessons)
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: auth }))
const tree: KnowledgeTree = {
  nodes: [
    { id: 'a', code: 'R55_SCANNING', name: 'Scanning', skill: 'READING', kind: 'STRATEGY', status: 'ACTIVE', cefrLevel: 'B1', canDo: 'Scan for dates.', scopeIn: 'Short texts.', scopeOut: null, courseId: 'c1', band: 5.5, lessonIds: ['l1', 'l2'] },
    { id: 'b', code: 'R60_SKIMMING', name: 'Skimming', skill: 'READING', kind: 'STRATEGY', status: 'ACTIVE', cefrLevel: 'B2', canDo: 'Skim a passage.' },
    { id: 'c', code: 'S60_PART2', name: 'Long turn', skill: 'SPEAKING', kind: 'STRATEGY', status: 'INACTIVE', cefrLevel: 'B2', canDo: 'Talk for two minutes.' },
  ],
  edges: [{ from: 'a', to: 'b' }],
}
const health: KnowledgeTreeHealth = { isolatedIds: ['c'], missingMetadataIds: [], levelViolations: [] }
const record = (id: string, code: string, name: string, extra: object = {}) => ({
  id, topicId: 't1', code, name, kind: 'STRATEGY', learningType: 'PROCEDURE', skill: 'READING', description: 'Old description',
  status: 'ACTIVE', cefrLevel: 'B1', canDo: 'Scan for dates.', scopeIn: 'Short texts.', scopeOut: null, ...extra,
})
const allPoints = [record('a', 'R55_SCANNING', 'Scanning'), record('b', 'R60_SKIMMING', 'Skimming', { cefrLevel: 'B2' })]

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
    lessons.fetchTopics.mockResolvedValue([{ id: 't1', code: 'READING_1', name: 'Reading basics', skill: 'READING', courseId: null, status: 'ACTIVE', sortOrder: 1 }])
    points.fetchKnowledgePoints.mockResolvedValue(allPoints)
    points.fetchPrerequisites.mockResolvedValue([])
    points.createKnowledgePoint.mockResolvedValue(record('n', 'R55_NEW', 'New one'))
    points.updateKnowledgePoint.mockResolvedValue(allPoints[0])
    points.replacePrerequisites.mockResolvedValue(undefined)
    points.deactivateKnowledgePoint.mockResolvedValue(undefined)
    points.activateKnowledgePoint.mockResolvedValue(undefined)
  })

  it('loads the tree and its health report and shows the counts and warnings', async () => {
    renderPage()

    expect(await screen.findByText('2 cạnh'.replace('2', '1'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/3 KP/)).toBeInTheDocument()
    expect(await screen.findByText('1 KP chưa nối')).toBeInTheDocument()
    expect(screen.getByText('0 cạnh ngược cấp')).toBeInTheDocument()
    expect(api.fetchKnowledgeTree).toHaveBeenCalledWith({ skill: '', courseId: '', includeInactive: false }, expect.any(AbortSignal))
  })

  it('lists the points of each skill in a table of its own: the goal first, and what it needs beneath it', async () => {
    renderPage()

    const reading = await screen.findByRole('region', { name: 'Bảng Reading' })
    const rows = within(within(reading).getByRole('table', { name: 'Điểm kiến thức Reading' })).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.querySelector('code')?.textContent)).toEqual(['R60_SKIMMING', 'R55_SCANNING'])
    expect(within(rows[0]!).getByText('B2')).toBeInTheDocument()
    expect(within(reading).getByRole('heading', { name: /^Reading/ })).toHaveTextContent('Reading2')
    // The chart is not on the page: it opens in a popup.
    expect(screen.queryByRole('group', { name: 'Đồ thị Reading' })).not.toBeInTheDocument()
  })

  it('opens the details of a point from the actions menu at the end of its row', async () => {
    renderPage()
    const reading = await screen.findByRole('region', { name: 'Bảng Reading' })
    expect(within(reading).getByRole('columnheader', { name: 'Hành động' })).toBeInTheDocument()

    fireEvent.click(within(reading).getByRole('button', { name: 'Hành động của R55_SCANNING' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Xem chi tiết R55_SCANNING' }))

    // Details of a row open in a dialog in the middle of the screen, not in a panel on the page.
    expect(await screen.findByRole('dialog', { name: 'Chi tiết R55_SCANNING' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('stacks each skill in a block of its own, apart from the filters', async () => {
    renderPage()
    const reading = await screen.findByRole('region', { name: 'Bảng Reading' })
    const apart = screen.getByRole('region', { name: 'Điểm kiến thức chưa nối' })

    expect(reading).toHaveClass('adm-block')
    expect(apart).toHaveClass('adm-block')
    expect(reading.contains(screen.getByLabelText('Kỹ năng'))).toBe(false)
    expect(reading.contains(apart)).toBe(false)
  })

  it('sets the points that no link reaches in a table of their own', async () => {
    renderPage()

    const apart = await screen.findByRole('region', { name: 'Điểm kiến thức chưa nối' })
    expect(within(apart).getByText('S60_PART2')).toBeInTheDocument()
    expect(within(apart).getByText('Chưa nối')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Bảng Reading' })).queryByText('S60_PART2')).not.toBeInTheDocument()
  })

  it('folds the points beneath a point and opens them again', async () => {
    renderPage()
    await screen.findByText('R55_SCANNING')

    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn R60_SKIMMING' }))
    expect(screen.queryByText('R55_SCANNING')).not.toBeInTheDocument()
    expect(screen.getByText('R60_SKIMMING')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mở R60_SKIMMING' }))
    expect(screen.getByText('R55_SCANNING')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thu gọn R55_SCANNING' })).not.toBeInTheDocument()
  })

  it('opens the org chart of a skill in a popup, and the details of a chosen point in a dialog above it', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Xem sơ đồ Reading' }))

    const popup = await screen.findByRole('dialog', { name: 'Sơ đồ Reading' })
    expect(within(popup).getByRole('group', { name: 'Đồ thị Reading' })).toBeInTheDocument()
    expect(within(popup).getByText('2 điểm kiến thức')).toBeInTheDocument()
    expect(within(popup).getByRole('list', { name: 'Màu theo kỹ năng' })).toHaveTextContent('Reading')

    fireEvent.click(within(popup).getByRole('button', { name: 'R60_SKIMMING: Skimming' }))
    expect(await screen.findByRole('dialog', { name: 'Chi tiết R60_SKIMMING' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('folds a branch of the chart, zooms it and fits it to its frame', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Xem sơ đồ Reading' }))
    const popup = await screen.findByRole('dialog', { name: 'Sơ đồ Reading' })

    fireEvent.click(within(popup).getByRole('button', { name: 'Thu gọn nhánh R60_SKIMMING' }))
    expect(within(popup).queryByRole('button', { name: 'R55_SCANNING: Scanning' })).not.toBeInTheDocument()
    expect(within(popup).getByRole('button', { name: 'Mở nhánh R60_SKIMMING' })).toHaveTextContent('+1')
    fireEvent.click(within(popup).getByRole('button', { name: 'Mở tất cả' }))
    expect(within(popup).getByRole('button', { name: 'R55_SCANNING: Scanning' })).toBeInTheDocument()

    fireEvent.click(within(popup).getByRole('button', { name: 'Phóng to' }))
    fireEvent.click(within(popup).getByRole('button', { name: 'Thu nhỏ' }))
    expect(within(popup).getByRole('button', { name: /^Đặt lại về 100%/ })).toBeInTheDocument()
    expect(within(popup).getByRole('button', { name: 'Vừa khung' })).toBeInTheDocument()
  })

  it('closes the details of a point and leaves the chart popup open beneath', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Xem sơ đồ Reading' }))
    const popup = await screen.findByRole('dialog', { name: 'Sơ đồ Reading' })
    fireEvent.click(within(popup).getByRole('button', { name: 'R55_SCANNING: Scanning' }))
    const detail = await screen.findByRole('dialog', { name: 'Chi tiết R55_SCANNING' })

    fireEvent.click(within(detail).getByRole('button', { name: 'Đóng' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Chi tiết R55_SCANNING' })).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'Sơ đồ Reading' })).toBeInTheDocument()
  })

  it('opens the point named by the kp query, as a work item link does', async () => {
    renderPage('', '/content-author/knowledge-graph?kp=a')

    expect(await screen.findByRole('dialog', { name: 'Chi tiết R55_SCANNING' })).toBeInTheDocument()
  })

  it('opens no dialog for a kp that is not in the tree', async () => {
    renderPage('', '/content-author/knowledge-graph?kp=missing')

    await screen.findByText(/3 KP/)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the details of a point with its prerequisites, dependents, course and lessons', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Hành động của R55_SCANNING' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Xem chi tiết R55_SCANNING' }))

    const panel = await screen.findByRole('dialog', { name: 'Chi tiết R55_SCANNING' })
    expect(within(panel).getByText('Scan for dates.')).toBeInTheDocument()
    expect(within(panel).getByText('IELTS 5.5 (band 5.5)')).toBeInTheDocument()
    expect(within(panel).getByText('2 bài học liên kết')).toBeInTheDocument()
    const dependents = within(panel).getByRole('heading', { name: 'Mở ra' }).closest('section') as HTMLElement
    expect(within(dependents).getByRole('button', { name: 'R60_SKIMMING' })).toBeInTheDocument()

    fireEvent.click(within(dependents).getByRole('button', { name: 'R60_SKIMMING' }))
    const next = await screen.findByRole('dialog', { name: 'Chi tiết R60_SKIMMING' })
    const before = within(next).getByRole('heading', { name: 'Cần học trước' }).closest('section') as HTMLElement
    expect(within(before).getByRole('button', { name: 'R55_SCANNING' })).toBeInTheDocument()
  })

  it('keeps the way to a match when the topbar search is on: the matches and the points above them, nothing folded', async () => {
    renderPage('scan')

    const reading = await screen.findByRole('region', { name: 'Bảng Reading' })
    expect(within(reading).getByText('R55_SCANNING')).toBeInTheDocument()
    // The goal is listed to show where the match sits, in the muted colour of a point that did not match itself.
    expect(within(reading).getByText('R60_SKIMMING').closest('tr')).toHaveClass('is-context')
    expect(within(reading).queryByRole('button', { name: /^Thu gọn R/ })).not.toBeInTheDocument()
    expect(within(reading).getByRole('button', { name: 'Thu gọn tất cả' })).toBeDisabled()
    expect(within(reading).getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText(/1 khớp “scan”/)).toBeInTheDocument()
  })

  it('leaves out a skill with no match and every point that leads to none', async () => {
    renderPage('skim')

    const reading = await screen.findByRole('region', { name: 'Bảng Reading' })
    expect(within(reading).getByText('R60_SKIMMING')).toBeInTheDocument()
    expect(within(reading).queryByText('R55_SCANNING')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Điểm kiến thức chưa nối' })).not.toBeInTheDocument()
  })

  it('shows only the points with a warning when asked, and says so when none match', async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText('Chỉ KP có cảnh báo'))

    const apart = await screen.findByRole('region', { name: 'Điểm kiến thức chưa nối' })
    expect(within(apart).getByText('S60_PART2')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Bảng Reading' })).not.toBeInTheDocument()
  })

  it('says so when the search matches no point', async () => {
    renderPage('zzz')

    expect(await screen.findByText('Không có knowledge point nào khớp')).toBeInTheDocument()
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
    expect(screen.getByText('R55_SCANNING')).toBeInTheDocument()
  })

  it('says so when the filters match nothing', async () => {
    api.fetchKnowledgeTree.mockResolvedValue({ nodes: [], edges: [] })
    renderPage()

    expect(await screen.findByText('Không có knowledge point nào')).toBeInTheDocument()
  })

  it('folds and opens every branch of a skill at once', async () => {
    renderPage()
    const reading = await screen.findByRole('region', { name: 'Bảng Reading' })
    expect(within(reading).getByRole('button', { name: 'Mở tất cả' })).toBeDisabled()

    fireEvent.click(within(reading).getByRole('button', { name: 'Thu gọn tất cả' }))
    expect(within(reading).queryByText('R55_SCANNING')).not.toBeInTheDocument()
    expect(within(reading).getByText('R60_SKIMMING')).toBeInTheDocument()
    expect(within(reading).getByRole('button', { name: 'Thu gọn tất cả' })).toBeDisabled()

    fireEvent.click(within(reading).getByRole('button', { name: 'Mở tất cả' }))
    expect(within(reading).getByText('R55_SCANNING')).toBeInTheDocument()
  })

  it('creates a point in a drawer, with the points it needs', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo điểm kiến thức' }))
    const drawer = await screen.findByRole('dialog', { name: 'Tạo điểm kiến thức' })
    await within(drawer).findByLabelText('Mã')

    fireEvent.click(within(drawer).getByRole('button', { name: 'Lưu' }))
    expect(await screen.findByText(/Cần nhập mã, tên, chủ đề, loại, kiểu học, can-do/)).toBeInTheDocument()
    expect(points.createKnowledgePoint).not.toHaveBeenCalled()

    fireEvent.change(within(drawer).getByLabelText('Mã'), { target: { value: 'bad code' } })
    fireEvent.change(within(drawer).getByLabelText('Tên'), { target: { value: 'New one' } })
    fireEvent.change(within(drawer).getByLabelText('Chủ đề'), { target: { value: 't1' } })
    fireEvent.click(within(drawer).getByRole('radio', { name: 'Strategy' }))
    fireEvent.click(within(drawer).getByRole('radio', { name: 'Procedure' }))
    fireEvent.change(within(drawer).getByLabelText('Can-do'), { target: { value: 'Do a thing.' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Lưu' }))
    expect(await screen.findByText(/Mã phải có dạng/)).toBeInTheDocument()

    fireEvent.change(within(drawer).getByLabelText('Mã'), { target: { value: 'R55_NEW' } })
    fireEvent.click(within(drawer).getByRole('checkbox', { name: /R60_SKIMMING/ }))
    fireEvent.click(within(drawer).getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(points.createKnowledgePoint).toHaveBeenCalledWith(expect.objectContaining({
      topicId: 't1', code: 'R55_NEW', name: 'New one', kind: 'STRATEGY', learningType: 'PROCEDURE', skill: null, cefrLevel: null, canDo: 'Do a thing.',
    })))
    expect(points.replacePrerequisites).toHaveBeenCalledWith('n', ['b'])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tạo điểm kiến thức' })).not.toBeInTheDocument())
    await waitFor(() => expect(api.fetchKnowledgeTree).toHaveBeenCalledTimes(2))
  })

  it('edits a point in a drawer, keeping the description the tree does not carry and the points it needs', async () => {
    points.fetchPrerequisites.mockResolvedValue([allPoints[1]])
    renderPage()
    const reading = await screen.findByRole('region', { name: 'Bảng Reading' })
    fireEvent.click(within(reading).getByRole('button', { name: 'Hành động của R55_SCANNING' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sửa R55_SCANNING' }))

    const drawer = await screen.findByRole('dialog', { name: 'Sửa R55_SCANNING' })
    const name = await within(drawer).findByLabelText('Tên')
    expect(name).toHaveValue('Scanning')
    expect(within(drawer).getByLabelText('Mô tả')).toHaveValue('Old description')
    expect(within(drawer).getByRole('checkbox', { name: /R60_SKIMMING/ })).toBeChecked()
    expect(within(drawer).queryByRole('checkbox', { name: /R55_SCANNING/ })).not.toBeInTheDocument()

    fireEvent.change(name, { target: { value: 'Scanning for details' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(points.updateKnowledgePoint).toHaveBeenCalledWith('a', expect.objectContaining({
      name: 'Scanning for details', description: 'Old description', skill: 'READING', cefrLevel: 'B1',
    })))
    // The points it needs did not change, so they are not written again.
    expect(points.replacePrerequisites).not.toHaveBeenCalled()
  })

  it('shows the reason when a point cannot be saved and keeps the drawer open', async () => {
    points.updateKnowledgePoint.mockRejectedValue(new Error('boom'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Hành động của R55_SCANNING' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sửa R55_SCANNING' }))
    const drawer = await screen.findByRole('dialog', { name: 'Sửa R55_SCANNING' })
    await within(drawer).findByLabelText('Tên')

    fireEvent.click(within(drawer).getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Có lỗi xảy ra, vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Sửa R55_SCANNING' })).toBeInTheDocument()
  })

  it('stops using a point after a question, and brings an inactive one back', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Hành động của R55_SCANNING' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Ngừng dùng R55_SCANNING' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Ngừng dùng' }))
    await waitFor(() => expect(points.deactivateKnowledgePoint).toHaveBeenCalledWith('a'))

    fireEvent.click(await screen.findByRole('button', { name: 'Hành động của S60_PART2' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Kích hoạt S60_PART2' }))
    await waitFor(() => expect(points.activateKnowledgePoint).toHaveBeenCalledWith('c'))
  })

  it('offers no create or edit to a reader who is not an author', async () => {
    auth.mockReturnValue({ roles: ['EXAMINER'] })
    renderPage()
    await screen.findByText(/3 KP/)
    expect(screen.queryByRole('button', { name: 'Tạo điểm kiến thức' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hành động của R55_SCANNING' }))
    expect(await screen.findByRole('menuitem', { name: 'Xem chi tiết R55_SCANNING' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Sửa R55_SCANNING' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Ngừng dùng R55_SCANNING' })).not.toBeInTheDocument()
  })
})
