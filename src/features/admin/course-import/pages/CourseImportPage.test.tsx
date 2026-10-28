import { fireEvent, render, screen, waitFor } from '@/test/render'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { CourseImportPage } from './CourseImportPage'

const base = '/api/content/admin/course-import'
const ids = ['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002']
type Call = { path: string; method: string; body: unknown }
const calls: Call[] = []
const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const issue = (overrides = {}) => ({ sheet: 'Lessons', row: 4, column: 'knowledgePointCodes', code: 'UNKNOWN_KNOWLEDGE_POINT', message: 'A knowledge point code is not an active one.', ...overrides })
const validReport = { valid: true, errors: [], warnings: [issue({ code: 'FEW_PRACTICE_SETS', row: 3 })], summary: { topics: 2, lessons: 5, questions: 12, packages: 4 } }
const invalidReport = { valid: false, errors: [issue()], warnings: [], summary: { topics: 2, lessons: 5, questions: 12, packages: 4 } }

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
function show() { return render(<MemoryRouter><CourseImportPage /></MemoryRouter>) }

describe('CourseImportPage', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('keeps Import locked until a file has been checked and found valid', async () => {
    backend(() => json(validReport))
    show()
    expect(button('Kiểm tra')).toBeDisabled()
    expect(button('Import')).toBeDisabled()

    pick(workbook())
    expect(button('Kiểm tra')).toBeEnabled()
    expect(button('Import')).toBeDisabled()

    fireEvent.click(button('Kiểm tra'))
    expect(await screen.findByText('File hợp lệ, có thể import.')).toBeInTheDocument()
    expect(screen.getByText(/Sẽ tạo 2 chủ đề, 5 bài học, 12 câu hỏi và 4 gói bài/)).toBeInTheDocument()
    expect(screen.getByText('Chưa đủ bộ luyện tập')).toBeInTheDocument()
    expect(button('Import')).toBeEnabled()
    expect(calls).toEqual([{ path: `${base}/validate`, method: 'POST', body: expect.any(FormData) }])
  })

  it('shows each error with its sheet, Excel row and column and does not allow Import', async () => {
    backend(() => json(invalidReport))
    show()
    pick(workbook())
    fireEvent.click(button('Kiểm tra'))

    expect(await screen.findByText('File chưa hợp lệ.')).toBeInTheDocument()
    const row = screen.getByText('Mã kiến thức không hoạt động').closest('tr')!
    expect(row).toHaveTextContent('Lessons')
    expect(row).toHaveTextContent('4')
    expect(row).toHaveTextContent('knowledgePointCodes')
    expect(button('Import')).toBeDisabled()
  })

  it('locks Import again when another file is chosen after the check', async () => {
    backend(() => json(validReport))
    show()
    pick(workbook())
    fireEvent.click(button('Kiểm tra'))
    await screen.findByText('File hợp lệ, có thể import.')

    pick(workbook('other.xlsx'))

    expect(button('Import')).toBeDisabled()
    expect(screen.queryByText('File hợp lệ, có thể import.')).not.toBeInTheDocument()
  })

  it('does not call the API for a file over 5 MB or one that is not .xlsx', () => {
    backend(() => json(validReport))
    show()

    pick(workbook('big.xlsx', 5 * 1024 * 1024 + 1))
    expect(screen.getByText(/File lớn hơn 5 MB/)).toBeInTheDocument()
    expect(button('Kiểm tra')).toBeDisabled()

    pick(workbook('data.csv'))
    expect(screen.getByText(/Chọn file Excel .xlsx có dữ liệu/)).toBeInTheDocument()
    expect(button('Kiểm tra')).toBeDisabled()
    expect(calls).toHaveLength(0)
  })

  it('imports the checked file and links to the new course and packages', async () => {
    backend(({ path }) => path === `${base}/validate` ? json(validReport) : json({ courseId: ids[0], topicIds: [], lessonIds: [], questionIds: [], packageIds: [ids[1]], warnings: [] }, 201))
    show()
    pick(workbook())
    fireEvent.click(button('Kiểm tra'))
    await screen.findByText('File hợp lệ, có thể import.')

    fireEvent.click(button('Import'))

    expect(await screen.findByText('Đã tạo khóa học (chưa kích hoạt)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Khóa học & chủ đề/ })).toHaveAttribute('href', '/content-author/courses')
    expect(screen.getByRole('link', { name: new RegExp(ids[1]) })).toHaveAttribute('href', `/content-author/packages/${ids[1]}`)
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([`POST ${base}/validate`, `POST ${base}`])
    expect(button('Import')).toBeDisabled()
  })

  it('shows the report again when the import is refused with 422', async () => {
    const refused = { message: 'The workbook has errors', details: { code: 'COURSE_IMPORT_INVALID', valid: false, errors: [issue({ code: 'CODE_CONFLICT', sheet: 'Topics', row: 3, column: 'code' })], warnings: [] } }
    backend(({ path }) => path === `${base}/validate` ? json(validReport) : json(refused, 422))
    show()
    pick(workbook())
    fireEvent.click(button('Kiểm tra'))
    await screen.findByText('File hợp lệ, có thể import.')

    fireEvent.click(button('Import'))

    expect(await screen.findByText('Mã, band hoặc thứ tự đã được sử dụng')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('File có lỗi. Sửa các dòng được báo rồi kiểm tra lại.')
    expect(button('Import')).toBeDisabled()
  })

  it('shows a Vietnamese message for a refused workbook and for an exhausted allowance', async () => {
    backend(({ path }) => path === `${base}/validate` ? json(validReport) : json({ message: 'quota', details: { code: 'IMPORT_QUOTA_EXCEEDED' } }, 429))
    show()
    pick(workbook())
    fireEvent.click(button('Kiểm tra'))
    await screen.findByText('File hợp lệ, có thể import.')

    fireEvent.click(button('Import'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn đã dùng hết lượt nhập hôm nay')
  })

  it('downloads the template through the authenticated client', async () => {
    const create = vi.fn(() => 'blob:template')
    const revoke = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    backend(() => new Response(new Uint8Array([80, 75, 3, 4]), { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }))
    show()

    fireEvent.click(button('Tải template'))

    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:template'))
    expect(calls).toEqual([{ path: `${base}/template`, method: 'GET', body: undefined }])
    expect(create).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    click.mockRestore()
  })
})
