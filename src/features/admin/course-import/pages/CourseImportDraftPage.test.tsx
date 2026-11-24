import { fireEvent, render, screen, waitFor } from '@/test/render'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { CourseImportDraftPage } from './CourseImportDraftPage'

const id = '10000000-0000-4000-8000-000000000001'
const courseId = '10000000-0000-4000-8000-000000000009'
type Call = { path: string; method: string; body: unknown }
const calls: Call[] = []
const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const cells = { code: 'C1', name: 'Khóa thử', bandLevel: '4.5' }
const outline = {
  course: { cells, row: 3, code: 'C1', name: 'Khóa thử', bandLevel: '4.5' }, topics: [], courseTests: [], milestones: [], questions: [],
}
const detail = (errors: unknown[], extra = {}) => ({
  id, filename: 'course.xlsx', status: 'DRAFT', importedCourseId: null, updatedAt: '2026-11-24T08:00:00Z',
  sheets: { Course: [{ number: 3, cells }] },
  report: { valid: errors.length === 0, errors, warnings: [], outline, summary: { topics: 0, lessons: 0, questions: 0, packages: 0 } }, ...extra,
})
const conflict = { sheet: 'Course', row: 3, column: 'code', code: 'CODE_CONFLICT', message: 'x' }

function backend(respond: (call: Call) => Response) {
  fetchMock.mockImplementation(async (input, options = {}) => {
    const url = new URL(String(input))
    const call = { path: url.pathname, method: options.method ?? 'GET', body: options.body }
    calls.push(call)
    return respond(call)
  })
}
const button = (name: string | RegExp) => screen.getByRole('button', { name })
function show() {
  return render(<MemoryRouter initialEntries={[`/content-author/course-import/${id}`]}><Routes>
    <Route element={<CourseImportDraftPage />} path="/content-author/course-import/:draftId" />
  </Routes></MemoryRouter>)
}

describe('CourseImportDraftPage', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('shows the problems of a draft and keeps Import locked while there are errors', async () => {
    backend(() => json(detail([conflict])))
    show()

    expect(await screen.findByText('Còn 1 lỗi cần sửa.')).toBeInTheDocument()
    expect(button('Import')).toBeDisabled()
    expect(button('Lưu bản nháp')).toBeDisabled()
  })

  it('saves an edit, shows the new check, and only then lets the draft be imported', async () => {
    let saved = false
    backend(({ method, path }) => {
      if (method === 'PUT') { saved = true; return json(detail([])) }
      if (method === 'POST' && path.endsWith('/import')) return json({ courseId, topicIds: [], lessonIds: [], questionIds: [], packageIds: [], warnings: [] }, 201)
      return json(saved ? detail([]) : detail([conflict]))
    })
    show()
    await screen.findByText('Còn 1 lỗi cần sửa.')

    fireEvent.click(button('Xem khóa học'))
    fireEvent.change(await screen.findByLabelText('Mã khóa học'), { target: { value: 'C2' } })
    fireEvent.click(button('Đóng'))
    expect(await screen.findByText(/Có thay đổi chưa lưu/)).toBeInTheDocument()
    expect(button('Import')).toBeDisabled()

    fireEvent.click(button('Lưu bản nháp'))
    expect(await screen.findByText('Không còn lỗi, có thể nhập.')).toBeInTheDocument()
    const put = calls.find((call) => call.method === 'PUT')!
    expect(JSON.parse(String(put.body)).sheets.Course[0].cells.code).toBe('C2')

    await waitFor(() => expect(button('Import')).toBeEnabled())
    fireEvent.click(button('Import'))
    expect(await screen.findByText('Đã tạo khóa học (chưa kích hoạt)')).toBeInTheDocument()
  })

  it('does not allow an imported draft to be changed', async () => {
    backend(() => json(detail([], { status: 'IMPORTED', importedCourseId: courseId })))
    show()

    expect(await screen.findByText(/Đã nhập thành khóa học/)).toBeInTheDocument()
    expect(button('Import')).toBeDisabled()
    expect(button('Lưu bản nháp')).toBeDisabled()
  })
})
