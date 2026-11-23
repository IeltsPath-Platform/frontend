import { act, fireEvent, render, screen, waitFor, within } from '@/test/render'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { courseId, makeCatalogPackage, makeCatalogPage, makePackage, packageId, topicId } from '../testFixtures'
import { PackagesPage } from './PackagesPage'

const api = vi.hoisted(() => ({ listPackages: vi.fn(), getPackage: vi.fn(), previewVersion: vi.fn(), listSchedules: vi.fn() }))
const pickers = vi.hoisted(() => ({ fetchCourses: vi.fn(), fetchTopics: vi.fn(), fetchLessons: vi.fn() }))
vi.mock('../api/packageApi', () => api)
vi.mock('../../courses/api/courseApi', () => ({ fetchCourses: pickers.fetchCourses }))
vi.mock('../../lessons/api/lessonApi', () => ({ fetchTopics: pickers.fetchTopics, fetchLessons: pickers.fetchLessons }))
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname + location.search}</output> }
function show(path = '/content-author/packages') { render(<MemoryRouter initialEntries={[path]}><PackagesPage /><Location /></MemoryRouter>) }
describe('PackagesPage', () => {
  beforeEach(() => {
    api.listPackages.mockReset().mockResolvedValue(makeCatalogPage([makeCatalogPackage()]))
    api.listSchedules.mockReset().mockResolvedValue([])
    pickers.fetchCourses.mockReset().mockResolvedValue([{ id: courseId, name: 'Foundation' }])
    pickers.fetchTopics.mockReset().mockResolvedValue([{ id: topicId, name: 'Reading topic', courseId }])
    pickers.fetchLessons.mockReset().mockResolvedValue([{ id: 'lesson-one', title: 'Reading lesson' }])
  })
  afterEach(() => vi.useRealTimers())
  it('opens the editor of a package in a side drawer from the actions menu, keeping the catalog behind it', async () => {
    api.getPackage.mockResolvedValue(makePackage())
    show()
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Hành động của gói READING-PRACTICE-1' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chỉnh sửa gói READING-PRACTICE-1' }))
    expect(screen.getByTestId('location')).toHaveTextContent(`/content-author/packages?package=${packageId}`)
    const drawer = await screen.findByRole('dialog', { name: 'Reading practice' })
    expect(api.getPackage).toHaveBeenCalledWith(packageId, expect.any(AbortSignal))
    expect(await within(drawer).findByRole('button', { name: 'Thêm phần' })).toBeInTheDocument()
    expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument()
    fireEvent.click(within(drawer).getByRole('button', { name: 'Đóng' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Reading practice' })).not.toBeInTheDocument())
    expect(screen.getByTestId('location')).not.toHaveTextContent('package=')
  })
  it('reopens the drawer from the address, so a refresh or a shared link lands on the same package', async () => {
    api.getPackage.mockResolvedValue(makePackage())
    show(`/content-author/packages?package=${packageId}`)
    expect(await screen.findByRole('dialog', { name: 'Reading practice' })).toBeInTheDocument()
  })
  it('ignores a package address that is not an ID', async () => {
    show('/content-author/packages?package=not-a-uuid')
    await screen.findByRole('table')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.getPackage).not.toHaveBeenCalled()
  })
  it('shows the detail of a package from the actions menu without leaving the catalog, on the draft version', async () => {
    api.getPackage.mockResolvedValue(makePackage())
    api.previewVersion.mockResolvedValue({
      sections: [{ sectionId: 's1', title: 'Phần đọc', instructions: null, passage: 'The passage.', audio: null,
        items: [{ questionVersionId: 'qv1', stem: 'Which option is correct?', options: [] }] }],
      answers: [],
    })
    show()
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Hành động của gói READING-PRACTICE-1' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chi tiết gói READING-PRACTICE-1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết gói' })
    expect(await within(dialog).findByText('Which option is correct?')).toBeInTheDocument()
    expect(api.getPackage).toHaveBeenCalledWith(packageId, expect.any(AbortSignal))
    // The draft (version 2) is the one the editor opens on.
    expect(api.previewVersion).toHaveBeenCalledWith(packageId, makePackage().versions.find((version) => version.status === 'DRAFT')!.id, expect.any(AbortSignal))
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/content-author\/packages$/)
  })
  it('folds each section of a preview under its title with the number of questions, and opens it on a click', async () => {
    api.getPackage.mockResolvedValue(makePackage())
    api.previewVersion.mockResolvedValue({
      sections: [
        { sectionId: 's1', title: 'Phần đọc', instructions: null, passage: null, audio: null, items: [{ questionVersionId: 'qv1', stem: 'First stem?', options: [] }] },
        { sectionId: 's2', title: 'Phần nghe', instructions: null, passage: null, audio: null,
          items: [{ questionVersionId: 'qv2', stem: 'Second stem?', options: [] }, { questionVersionId: 'qv3', stem: 'Third stem?', options: [] }] },
      ],
      answers: [],
    })
    show()
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Hành động của gói READING-PRACTICE-1' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chi tiết gói READING-PRACTICE-1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết gói' })
    await within(dialog).findByText('Phần nghe')
    expect(within(dialog).getByText('1 câu')).toBeInTheDocument()
    expect(within(dialog).getByText('2 câu')).toBeInTheDocument()
    expect(within(dialog).getByText('Third stem?')).not.toBeVisible()
    fireEvent.click(within(dialog).getByText('Phần nghe'))
    expect(within(dialog).getByText('Third stem?')).toBeVisible()
    // The numbering runs on across sections.
    expect(within(dialog).getByText('3', { selector: '.adm-pv-question__number' })).toBeInTheDocument()
  })
  it('says so when a package has no version to preview', async () => {
    api.getPackage.mockResolvedValue(makePackage([]))
    show()
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Hành động của gói READING-PRACTICE-1' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chi tiết gói READING-PRACTICE-1' }))
    expect(await screen.findByText('Gói chưa có phiên bản nào để xem trước.')).toBeInTheDocument()
    expect(api.previewVersion).not.toHaveBeenCalled()
  })
  it('renders the catalog and sends type, status and dependent filters to the server', async () => {
    show()
    expect(await screen.findByRole('link', { name: /READING-PRACTICE-1 · Reading practice/ })).toHaveAttribute('href', `/content-author/packages?package=${packageId}`)
    expect(screen.getByText('Có bản nháp')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Loại gói'), { target: { value: 'TOPIC_TEST' } })
    fireEvent.change(screen.getByLabelText('Trạng thái gói'), { target: { value: 'DRAFT' } })
    fireEvent.change(screen.getByLabelText('Lọc khóa học'), { target: { value: courseId } })
    fireEvent.change(screen.getByLabelText('Lọc chủ đề'), { target: { value: topicId } })
    await waitFor(() => expect(screen.getByLabelText('Lọc bài học')).toBeEnabled())
    fireEvent.change(screen.getByLabelText('Lọc bài học'), { target: { value: 'lesson-one' } })
    await waitFor(() => expect(api.listPackages).toHaveBeenLastCalledWith({ type: 'TOPIC_TEST', status: 'DRAFT', courseId, topicId, lessonId: 'lesson-one', q: undefined, page: 0, size: 25 }, expect.any(AbortSignal)))
    fireEvent.change(screen.getByLabelText('Lọc khóa học'), { target: { value: '' } })
    await waitFor(() => expect(api.listPackages).toHaveBeenLastCalledWith({ type: 'TOPIC_TEST', status: 'DRAFT', courseId: undefined, topicId: undefined, lessonId: undefined, q: undefined, page: 0, size: 25 }, expect.any(AbortSignal)))
  })
  it('debounces search for 300 milliseconds and keeps literal percent and underscore text', async () => {
    vi.useFakeTimers()
    show()
    await act(async () => { await Promise.resolve() })
    fireEvent.change(screen.getByLabelText('Tìm mã hoặc tiêu đề'), { target: { value: '  X%_Final  ' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(299) })
    expect(api.listPackages).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(api.listPackages).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'X%_Final' }), expect.any(AbortSignal))
  })
  it('offers retry for catalog failures and then shows the empty state', async () => {
    api.listPackages.mockRejectedValueOnce(new HttpError(503, 'Chưa tải được gói')).mockResolvedValue(makeCatalogPage([]))
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được gói')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Chưa có gói phù hợp')).toBeInTheDocument()
    expect(api.listPackages).toHaveBeenCalledTimes(2)
  })
  it('shows the placement pool filter and independent published counts in the catalog', async () => {
    const placementRows = [
      makeCatalogPackage({ id: '00000000-0000-4000-8000-000000000013', packageType: 'PLACEMENT_TEST', placementPool: 'BAND_0_3', status: 'PUBLISHED' }),
      makeCatalogPackage({ id: '00000000-0000-4000-8000-000000000014', packageType: 'PLACEMENT_TEST', placementPool: 'BAND_3_5', status: 'DRAFT' }),
      makeCatalogPackage({ id: '00000000-0000-4000-8000-000000000015', packageType: 'PLACEMENT_TEST', placementPool: 'BAND_5_9', status: 'PUBLISHED' }),
      makeCatalogPackage({ id: '00000000-0000-4000-8000-000000000012', packageType: 'PLACEMENT_TEST', placementPool: 'BAND_5_9', status: 'PUBLISHED' }),
    ]
    api.listPackages.mockImplementation((filters) => Promise.resolve(filters?.type !== 'PLACEMENT_TEST' ? makeCatalogPage([makeCatalogPackage()])
      : filters.size === 1 ? makeCatalogPage([], { size: 1, totalElements: placementRows.filter((row) => row.status === 'PUBLISHED' && row.placementPool === filters.placementPool).length })
      : makeCatalogPage(placementRows)))
    show()
    fireEvent.change(screen.getByLabelText('Loại gói'), { target: { value: 'PLACEMENT_TEST' } })
    expect(await screen.findByLabelText('Lọc kho')).toBeInTheDocument()
    expect(await screen.findAllByText('Band 0–3')).toHaveLength(3)
    expect(screen.getByText('Cần thêm đề: lượt thi lại sẽ lặp đề')).toBeInTheDocument()
    expect(screen.getByText('Chưa có đề, học viên không chọn được kho này')).toBeInTheDocument()
    expect(api.listPackages).toHaveBeenCalledWith({ type: 'PLACEMENT_TEST', status: 'PUBLISHED', placementPool: 'BAND_5_9', page: 0, size: 1 }, expect.any(AbortSignal))
    expect(screen.getAllByRole('columnheader', { name: 'Kho' })).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Lọc kho'), { target: { value: 'BAND_3_5' } })
    await waitFor(() => expect(api.listPackages).toHaveBeenCalledWith(expect.objectContaining({ type: 'PLACEMENT_TEST', placementPool: 'BAND_3_5' }), expect.any(AbortSignal)))
    expect(screen.getAllByText(/Band 5–9/).length).toBeGreaterThan(1)
  })
  it('pages through the catalog and starts again from the first page when a filter changes', async () => {
    api.listPackages.mockImplementation((filters) => Promise.resolve(makeCatalogPage(
      [makeCatalogPackage({ id: `00000000-0000-4000-8000-00000000010${filters.page ?? 0}`, code: `PAGE-${filters.page ?? 0}`, title: 'Row' })],
      { page: filters.page ?? 0, totalElements: 60 })))
    show()
    expect(await screen.findByText('Trang 1 / 3 · 60 gói')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(await screen.findByText('Trang 2 / 3 · 60 gói')).toBeInTheDocument()
    expect(api.listPackages).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 25 }), expect.any(AbortSignal))
    expect(screen.getByRole('cell', { name: '26' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(await screen.findByText('Trang 3 / 3 · 60 gói')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Trạng thái gói'), { target: { value: 'DRAFT' } })
    await waitFor(() => expect(api.listPackages).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'DRAFT', page: 0 }), expect.any(AbortSignal)))
    expect(await screen.findByText('Trang 1 / 3 · 60 gói')).toBeInTheDocument()
  })
})
