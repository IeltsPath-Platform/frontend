import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { answerConfirm } from '@/test/confirm'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { draft, draftId, makePackage, nextSectionId, packageId, published, publishedId, section, sectionId, sectionRequest } from '../testFixtures'
import type { ContentPackage } from '../types'
import { PackageEditorPage } from './PackageEditorPage'

const { api } = vi.hoisted(() => ({ api: {
  getPackage: vi.fn(), createDraftVersion: vi.fn(), addSection: vi.fn(), updateSection: vi.fn(), deleteSection: vi.fn(), reorderSections: vi.fn(),
  listSchedules: vi.fn(), previewVersion: vi.fn(), publishVersion: vi.fn(), scheduleVersion: vi.fn(), cancelSchedule: vi.fn(),
  addSectionQuestion: vi.fn(), removeSectionQuestion: vi.fn(), reorderSectionQuestions: vi.fn(),
  updatePassage: vi.fn(), deletePassage: vi.fn(), updateAudio: vi.fn(), deleteAudio: vi.fn(), uploadAudio: vi.fn(),
} }))
vi.mock('../api/packageApi', () => api)
function Location() { return <output data-testid="location">{useLocation().search}</output> }
function show(query = '', id = packageId) {
  return render(<MemoryRouter initialEntries={[`/content-author/packages/${id}${query}`]}>
    <Routes><Route path="/content-author/packages/:packageId" element={<PackageEditorPage />} /></Routes><Location />
  </MemoryRouter>)
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
async function edit() {
  fireEvent.click(await screen.findByRole('button', { name: 'Sửa Reading One' }))
  return screen.getByRole('form', { name: 'Sửa phần Reading One' })
}
describe('PackageEditorPage', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.getPackage.mockResolvedValue(makePackage())
    api.createDraftVersion.mockResolvedValue({ ...draft, sections: [] })
    api.addSection.mockResolvedValue(section)
    api.updateSection.mockResolvedValue(section)
    api.deleteSection.mockResolvedValue(undefined)
    api.reorderSections.mockResolvedValue(undefined)
    api.listSchedules.mockResolvedValue([])
  })
  afterEach(() => vi.restoreAllMocks())

  it('selects the existing draft by default and puts its ID in the query', async () => {
    show('?view=sections')
    expect(await screen.findByRole('heading', { name: 'Bản 2 · Bản nháp' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`view=sections&version=${draftId}`))
    expect(api.getPackage).toHaveBeenCalledWith(packageId, expect.any(AbortSignal))
    expect(screen.queryByRole('button', { name: 'Tạo bản nháp mới' })).not.toBeInTheDocument()
  })
  it('honors the requested published version and keeps it read only', async () => {
    api.getPackage.mockResolvedValue(makePackage([{ ...published, sections: [section] }, draft]))
    show(`?version=${publishedId}`)
    expect(await screen.findByRole('heading', { name: 'Bản 1 · Đã xuất bản' })).toBeInTheDocument()
    expect(screen.getByText(/Phiên bản này chỉ xem/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sửa Reading One' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thêm phần' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm câu hỏi' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Lưu đoạn văn' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Lưu audio' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Xuất bản ngay' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Chọn phiên bản'), { target: { value: draftId } })
    expect(screen.getByRole('heading', { name: 'Bản 2 · Bản nháp' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(`version=${draftId}`)
  })
  it('rejects an invalid package ID without a fetch', () => {
    show('', 'invalid')
    expect(screen.getByRole('alert')).toHaveTextContent('ID gói không hợp lệ')
    expect(api.getPackage).not.toHaveBeenCalled()
  })
  it('shows an unknown requested version without exposing section writes', async () => {
    show('?version=unknown')
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy phiên bản đã chọn')
    expect(screen.queryByRole('button', { name: 'Thêm phần' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sửa Reading One' })).not.toBeInTheDocument()
    expect(api.updateSection).not.toHaveBeenCalled()
  })
  it('creates a draft for an empty package, reloads it and selects the returned version', async () => {
    api.getPackage.mockResolvedValueOnce(makePackage([])).mockResolvedValue(makePackage([{ ...draft, sections: [] }]))
    show('?view=sections')
    expect(await screen.findByText('Gói chưa có phiên bản')).toBeInTheDocument()
    expect(screen.getByLabelText('Chọn phiên bản')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bản nháp mới' }))
    expect(await screen.findByText('Phiên bản chưa có phần nào')).toBeInTheDocument()
    expect(api.createDraftVersion).toHaveBeenCalledExactlyOnceWith(packageId, '{}')
    expect(api.getPackage).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`view=sections&version=${draftId}`))
  })
  it('preserves every persisted section field, including exact seconds and cover, when saving', async () => {
    show()
    const form = await edit()
    expect(within(form).getByLabelText('Thời gian (phút)')).toHaveValue(91 / 60)
    fireEvent.change(within(form).getByLabelText('Tiêu đề phần'), { target: { value: 'Revised Reading' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.updateSection).toHaveBeenCalledExactlyOnceWith(packageId, draftId, sectionId, { ...sectionRequest, title: 'Revised Reading' }))
    await waitFor(() => expect(api.getPackage).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('form', { name: 'Sửa phần Reading One' })).not.toBeInTheDocument()
  })
  it('preserves a negative stored sort order when saving section metadata', async () => {
    api.getPackage.mockResolvedValue(makePackage([{ ...draft, sections: [{ ...section, sortOrder: -1 }] }]))
    show()
    const form = await edit()
    fireEvent.change(within(form).getByLabelText('Tiêu đề phần'), { target: { value: 'Renamed section' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.updateSection).toHaveBeenCalledExactlyOnceWith(packageId, draftId, sectionId, { ...sectionRequest, title: 'Renamed section', sortOrder: -1 }))
  })
  it.each([0, -60])('preserves an unchanged stored duration of %i seconds during a metadata edit', async (timeLimitSeconds) => {
    api.getPackage.mockResolvedValue(makePackage([{ ...draft, sections: [{ ...section, timeLimitSeconds }] }]))
    show()
    const form = await edit()
    fireEvent.change(within(form).getByLabelText('Tiêu đề phần'), { target: { value: 'Renamed section' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.updateSection).toHaveBeenCalledExactlyOnceWith(packageId, draftId, sectionId, { ...sectionRequest, title: 'Renamed section', timeLimitSeconds }))
  })

  it('defaults to the current published version when no draft exists', async () => {
    api.getPackage.mockResolvedValue(makePackage([published, { ...draft, status: 'ARCHIVED' }]))
    show()
    expect(await screen.findByRole('heading', { name: 'Bản 1 · Đã xuất bản' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`version=${publishedId}`))
    expect(screen.getByRole('button', { name: 'Tạo bản nháp mới' })).toBeEnabled()
    expect(screen.getByText('Phiên bản chưa có phần nào')).toBeInTheDocument()
  })
  it('creates a section with nullable optional fields and converts minutes to seconds', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm phần' }))
    const form = screen.getByRole('form', { name: 'Thêm phần' })
    fireEvent.change(within(form).getByLabelText('Tiêu đề phần'), { target: { value: ' Listening ' } })
    fireEvent.change(within(form).getByLabelText('Kỹ năng'), { target: { value: 'LISTENING' } })
    fireEvent.change(within(form).getByLabelText('Phần thi'), { target: { value: '3' } })
    fireEvent.change(within(form).getByLabelText('Thời gian (phút)'), { target: { value: '1.5' } })
    fireEvent.change(within(form).getByLabelText('Hướng dẫn'), { target: { value: ' Listen once. ' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.addSection).toHaveBeenCalledExactlyOnceWith(packageId, draftId, {
      title: 'Listening', skill: 'LISTENING', partNo: 3, sortOrder: 5, timeLimitSeconds: 90, instructions: 'Listen once.', coverAssetId: null,
    }))
    await waitFor(() => expect(api.getPackage).toHaveBeenCalledTimes(2))
  })
  it('retains unsaved form values after a draft conflict without retrying the write', async () => {
    api.updateSection.mockRejectedValue(new HttpError(400, 'Draft changed', { details: { code: 'VERSION_NOT_DRAFT' } }))
    show()
    const form = await edit()
    fireEvent.change(within(form).getByLabelText('Tiêu đề phần'), { target: { value: 'Unsaved title' } })
    fireEvent.submit(form)
    expect(await screen.findByRole('alert')).toHaveTextContent('Phiên bản này không còn là bản nháp')
    expect(within(form).getByLabelText('Tiêu đề phần')).toHaveValue('Unsaved title')
    expect(within(form).getByRole('button', { name: 'Lưu phần' })).toBeEnabled()
    expect(api.updateSection).toHaveBeenCalledTimes(1)
    expect(api.getPackage).toHaveBeenCalledTimes(1)
  })
  it('requires confirmation before deleting and reloads the package after deletion', async () => {
    show()
    const button = await screen.findByRole('button', { name: 'Xóa Reading One' })
    fireEvent.click(button)
    const popup = await answerConfirm(false)
    expect(popup).toHaveTextContent('tài nguyên gốc được giữ lại')
    expect(api.deleteSection).not.toHaveBeenCalled()
    fireEvent.click(button)
    await answerConfirm(true)
    await waitFor(() => expect(api.deleteSection).toHaveBeenCalledExactlyOnceWith(packageId, draftId, sectionId))
    await waitFor(() => expect(api.getPackage).toHaveBeenCalledTimes(2))
  })
  it('reorders the whole version with one API call and locks writes through the refresh', async () => {
    const initial = makePackage([{ ...draft, sections: [section, { ...section, id: nextSectionId, title: 'Reading Two', sortOrder: 8 }] }])
    const write = deferred<void>()
    const reload = deferred<ContentPackage>()
    api.getPackage.mockResolvedValueOnce(initial).mockReturnValueOnce(reload.promise)
    api.reorderSections.mockReturnValue(write.promise)
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Đưa Reading One xuống' }))
    expect(api.reorderSections).toHaveBeenCalledExactlyOnceWith(packageId, draftId, [nextSectionId, sectionId])
    expect(api.updateSection).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Sửa Reading One' })).toBeDisabled()
    expect(screen.getByLabelText('Chọn phiên bản')).toBeDisabled()
    await act(async () => write.resolve())
    await waitFor(() => expect(api.getPackage).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('button', { name: 'Thêm phần' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đưa Reading One xuống' })).toBeDisabled()
    await act(async () => reload.resolve(initial))
    expect(screen.getByRole('button', { name: 'Sửa Reading One' })).toBeEnabled()
  })
  it('locks editing, version switching and cancellation while a save is pending', async () => {
    const write = deferred<typeof section>()
    api.updateSection.mockReturnValue(write.promise)
    show()
    const form = await edit()
    expect(screen.getByLabelText('Chọn phiên bản')).toBeDisabled()
    fireEvent.submit(form)
    expect(within(form).getByLabelText('Tiêu đề phần')).toBeDisabled()
    expect(within(form).getByRole('button', { name: 'Hủy' })).toBeDisabled()
    fireEvent.submit(form)
    expect(api.updateSection).toHaveBeenCalledTimes(1)
    await act(async () => write.resolve(section))
  })
  it('shows rich question metadata and enables section content authoring in a draft', async () => {
    show()
    const article = await screen.findByRole('article', { name: 'Reading One' })
    expect(within(article).getByText(section.questions[0]!.stem!)).toBeInTheDocument()
    expect(within(article).getByRole('button', { name: 'Thêm câu hỏi' })).toBeEnabled()
    expect(within(article).getByRole('button', { name: 'Lưu đoạn văn' })).toBeEnabled()
    expect(within(article).getByRole('button', { name: 'Lưu audio' })).toBeEnabled()
    expect(within(article).queryByText(/Chờ backend/)).not.toBeInTheDocument()
  })
  it('retries a failed detail load without starting any writes', async () => {
    api.getPackage.mockRejectedValueOnce(new HttpError(404, 'Package missing')).mockResolvedValue(makePackage())
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Package missing')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('heading', { name: 'Bản 2 · Bản nháp' })).toBeInTheDocument()
    expect(api.getPackage).toHaveBeenCalledTimes(2)
    expect(api.createDraftVersion).not.toHaveBeenCalled()
  })
})
