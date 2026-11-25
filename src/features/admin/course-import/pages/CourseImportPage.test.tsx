import { fireEvent, render, screen, waitFor } from '@/test/render'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { CourseImportPage } from './CourseImportPage'

const base = '/api/content/admin/course-import'
const draftId = '10000000-0000-4000-8000-000000000001'
type Call = { path: string; method: string; body: unknown }
const calls: Call[] = []
const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const emptyReport = { valid: true, errors: [], warnings: [] }
const draft = { id: draftId, filename: 'course.xlsx', status: 'DRAFT', importedCourseId: null, updatedAt: '2026-11-24T08:00:00Z', sheets: {}, report: emptyReport }
const summary = { id: draftId, filename: 'old.xlsx', status: 'DRAFT', importedCourseId: null, courseCode: 'C1', courseName: 'Khóa cũ', updatedAt: '2026-11-24T08:00:00Z' }

function backend(respond: (call: Call) => Response) {
  fetchMock.mockImplementation(async (input, options = {}) => {
    const url = new URL(String(input))
    const call = { path: url.pathname, method: options.method ?? 'GET', body: options.body }
    calls.push(call)
    return respond(call)
  })
}
const workbook = (name = 'course.xlsx', bytes = 10) => new File([new Uint8Array(bytes)], name, { type: 'application/octet-stream' })
function pick(file: File) { fireEvent.change(screen.getByLabelText(/File Excel/), { target: { files: [file] } }) }
const button = (name: string) => screen.getByRole('button', { name })
function show() {
  return render(<MemoryRouter initialEntries={['/content-author/course-import']}><Routes>
    <Route element={<CourseImportPage />} path="/content-author/course-import" />
    <Route element={<p>Trang bản nháp</p>} path="/content-author/course-import/:id" />
  </Routes></MemoryRouter>)
}

describe('CourseImportPage', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('keeps the check locked until a usable file is chosen, then keeps the file as a draft and opens it', async () => {
    backend(({ method }) => method === 'POST' ? json(draft, 201) : json([]))
    show()
    expect(button('Kiểm tra')).toBeDisabled()

    pick(workbook())
    expect(button('Kiểm tra')).toBeEnabled()
    fireEvent.click(button('Kiểm tra'))

    expect(await screen.findByText('Trang bản nháp')).toBeInTheDocument()
    expect(calls).toContainEqual({ path: `${base}/drafts`, method: 'POST', body: expect.any(FormData) })
  })

  it('does not call the API for a file over 5 MB or one that is not .xlsx', async () => {
    backend(() => json([]))
    show()
    await screen.findByText(/Chưa có bản nháp nào/)

    pick(workbook('big.xlsx', 5 * 1024 * 1024 + 1))
    expect(screen.getByText(/File lớn hơn 5 MB/)).toBeInTheDocument()
    expect(button('Kiểm tra')).toBeDisabled()

    pick(workbook('data.csv'))
    expect(screen.getByText(/Chọn file Excel .xlsx có dữ liệu/)).toBeInTheDocument()
    expect(button('Kiểm tra')).toBeDisabled()
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(0)
  })

  it('shows what is wrong when the file cannot be read and keeps no draft', async () => {
    const refused = { message: 'x', details: { code: 'COURSE_IMPORT_INVALID', valid: false, errors: [{ sheet: 'Lessons', row: 0, column: '', code: 'SHEET_MISSING', message: 'm' }], warnings: [] } }
    backend(({ method }) => method === 'POST' ? json(refused, 422) : json([]))
    show()
    pick(workbook())
    fireEvent.click(button('Kiểm tra'))

    expect(await screen.findByText('Thiếu trang tính')).toBeInTheDocument()
    expect(screen.getByText('File chưa đọc được nên chưa lưu bản nháp.')).toBeInTheDocument()
  })

  it('lists the kept drafts with a link to open each', async () => {
    backend(() => json([summary]))
    show()

    expect(await screen.findByText('old.xlsx')).toBeInTheDocument()
    expect(screen.getByText('Khóa cũ')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mở' })).toHaveAttribute('href', `/content-author/course-import/${draftId}`)
  })

  it('downloads the template through the authenticated client', async () => {
    const create = vi.fn(() => 'blob:template')
    const revoke = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    backend(({ path }) => path.endsWith('/template') ? new Response(new Uint8Array([80, 75, 3, 4]), { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }) : json([]))
    show()

    fireEvent.click(button('Tải template'))

    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:template'))
    expect(calls).toContainEqual({ path: `${base}/template`, method: 'GET', body: undefined })
    expect(create).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    click.mockRestore()
  })
})
