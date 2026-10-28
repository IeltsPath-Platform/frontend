import { act, fireEvent, render, screen, waitFor } from '@/test/render'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { courseId, makeCatalogPackage, packageId, topicId } from '../testFixtures'
import { PackagesPage } from './PackagesPage'

const api = vi.hoisted(() => ({ listPackages: vi.fn() }))
const pickers = vi.hoisted(() => ({ fetchCourses: vi.fn(), fetchTopics: vi.fn(), fetchLessons: vi.fn() }))
vi.mock('../api/packageApi', () => api)
vi.mock('../../courses/api/courseApi', () => ({ fetchCourses: pickers.fetchCourses }))
vi.mock('../../lessons/api/lessonApi', () => ({ fetchTopics: pickers.fetchTopics, fetchLessons: pickers.fetchLessons }))
function Location() { return <output data-testid="location">{useLocation().pathname}</output> }
function show() { render(<MemoryRouter initialEntries={['/content-author/packages']}><PackagesPage /><Location /></MemoryRouter>) }
describe('PackagesPage', () => {
  beforeEach(() => {
    api.listPackages.mockReset().mockResolvedValue([makeCatalogPackage()])
    pickers.fetchCourses.mockReset().mockResolvedValue([{ id: courseId, name: 'Foundation' }])
    pickers.fetchTopics.mockReset().mockResolvedValue([{ id: topicId, name: 'Reading topic', courseId }])
    pickers.fetchLessons.mockReset().mockResolvedValue([{ id: 'lesson-one', title: 'Reading lesson' }])
  })
  afterEach(() => vi.useRealTimers())
  it('renders the catalog and sends type, status and dependent filters to the server', async () => {
    show()
    expect(await screen.findByRole('link', { name: /READING-PRACTICE-1 · Reading practice/ })).toHaveAttribute('href', `/content-author/packages/${packageId}`)
    expect(screen.getByText('Có bản nháp')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Loại gói'), { target: { value: 'TOPIC_TEST' } })
    fireEvent.change(screen.getByLabelText('Trạng thái gói'), { target: { value: 'DRAFT' } })
    fireEvent.change(screen.getByLabelText('Lọc khóa học'), { target: { value: courseId } })
    fireEvent.change(screen.getByLabelText('Lọc chủ đề'), { target: { value: topicId } })
    await waitFor(() => expect(screen.getByLabelText('Lọc bài học')).toBeEnabled())
    fireEvent.change(screen.getByLabelText('Lọc bài học'), { target: { value: 'lesson-one' } })
    await waitFor(() => expect(api.listPackages).toHaveBeenLastCalledWith({ type: 'TOPIC_TEST', status: 'DRAFT', courseId, topicId, lessonId: 'lesson-one', q: undefined }, expect.any(AbortSignal)))
    fireEvent.change(screen.getByLabelText('Lọc khóa học'), { target: { value: '' } })
    await waitFor(() => expect(api.listPackages).toHaveBeenLastCalledWith({ type: 'TOPIC_TEST', status: 'DRAFT', courseId: undefined, topicId: undefined, lessonId: undefined, q: undefined }, expect.any(AbortSignal)))
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
    api.listPackages.mockRejectedValueOnce(new HttpError(503, 'Chưa tải được gói')).mockResolvedValue([])
    show()
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được gói')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Chưa có gói phù hợp')).toBeInTheDocument()
    expect(api.listPackages).toHaveBeenCalledTimes(2)
  })
  it('retains direct UUID navigation and rejects a malformed ID', async () => {
    show()
    await screen.findByRole('table')
    fireEvent.click(screen.getByText('Mở trực tiếp bằng ID'))
    const input = screen.getByLabelText('ID gói (UUID)')
    fireEvent.change(input, { target: { value: 'not-a-uuid' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Mở gói có sẵn' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Nhập ID gói hợp lệ')
    fireEvent.change(input, { target: { value: ` ${packageId} ` } })
    fireEvent.submit(screen.getByRole('form', { name: 'Mở gói có sẵn' }))
    expect(screen.getByTestId('location')).toHaveTextContent(`/content-author/packages/${packageId}`)
  })
})
