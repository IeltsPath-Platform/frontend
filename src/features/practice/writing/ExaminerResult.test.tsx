import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { WritingResultPage } from './WritingResultPage'

vi.mock('@/components/SiteNavbar', () => ({ SiteNavbar: () => null }))

const submissionId = '30000000-0000-4000-8000-000000000001'
const examinerId = '20000000-0000-4000-8000-000000000001'
const ESSAY = 'The figure have rose dramatically. Business led in 2010.'
const submission = { submissionId, status: 'AWAITING_EXAMINER', task: 'TASK_1', wordCount: 8, essayText: ESSAY }
const profile = { id: examinerId, displayName: 'Ms Lan Phương', avatarUrl: null, bio: null, ieltsBand: 8.5, certificates: [{ name: 'CELTA', issuer: 'Cambridge', year: 2018, score: null }], acceptingSubmissions: true }
const pending = { reviewSubmissionId: '40000000-0000-4000-8000-000000000001', examinerId, status: 'PENDING' }
const done = {
  ...pending, status: 'DONE', band: 6.5, errorCodes: ['VERB_FORM'], feedback: 'Bài khá, cần chia động từ.',
  criteria: [
    { criterion: 'taskResponse', band: 6, comment: 'Trả lời đủ ý.' }, { criterion: 'coherence', band: 6.5, comment: 'Mạch lạc.' },
    { criterion: 'lexical', band: 7, comment: 'Từ vựng tốt.' }, { criterion: 'grammar', band: 6.5, comment: 'Cần chia động từ.' },
  ],
  annotations: [{ excerpt: 'have rose', start: 11, end: 20, errorCode: 'VERB_FORM', suggestion: 'have risen' }],
}

type Call = { path: string }
const calls: Call[] = []
const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
function server(review: () => Response) {
  fetchMock.mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname
    calls.push({ path })
    if (path === `/api/learning/writing-submissions/${submissionId}`) return json(submission)
    if (path === `/api/learning/writing-submissions/${submissionId}/human-review`) return review()
    if (path === `/api/users/examiners/${examinerId}`) return json(profile)
    return json({}, 404)
  })
}
const show = () => render(<MemoryRouter initialEntries={[`/practice/writing/submissions/${submissionId}/result`]}><Routes>
  <Route path="/practice/writing/submissions/:submissionId/result" element={<WritingResultPage />} />
</Routes></MemoryRouter>)

describe('the result of an essay sent to a teacher', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('says the teacher is still grading, shows who they are and the essay, and can be checked again', async () => {
    server(() => json(pending))
    show()

    expect(await screen.findByRole('region', { name: 'Đang chờ giáo viên chấm' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Giáo viên chấm bài' })).toHaveTextContent('Ms Lan Phương')
    expect(screen.getByRole('region', { name: 'Giáo viên chấm bài' })).toHaveTextContent('IELTS 8.5')
    expect(screen.getByRole('region', { name: 'Bài viết' })).toHaveTextContent(ESSAY)
    expect(screen.queryByLabelText('Band Score')).not.toBeInTheDocument()

    const before = calls.filter((call) => call.path.endsWith('/human-review')).length
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra lại/ }))
    await waitFor(() => expect(calls.filter((call) => call.path.endsWith('/human-review')).length).toBe(before + 1))
  })

  it("shows the teacher's band, the four criteria with their comments, the feedback and the essay marked up", async () => {
    server(() => json(done))
    show()

    const band = await screen.findByLabelText('Band Score')
    expect(band).toHaveTextContent('6.5')
    const result = screen.getByRole('region', { name: 'Kết quả chấm bài' })
    expect(result).toHaveTextContent('Task Response / Achievement')
    expect(result).toHaveTextContent('Trả lời đủ ý.')
    expect(result).toHaveTextContent('Grammatical Range & Accuracy')
    expect(within(result).getByLabelText('Nhận xét chung')).toHaveTextContent('Bài khá, cần chia động từ.')
    expect(within(result).getByLabelText('Loại lỗi giáo viên ghi nhận')).toHaveTextContent('VERB_FORM')

    const essay = screen.getByRole('region', { name: 'Bài viết' })
    expect(essay.querySelector('mark')).toHaveTextContent('have rose')
    expect(essay).toHaveTextContent('The figure have rose1 dramatically. Business led in 2010.')
    const fixes = screen.getByRole('region', { name: 'Các lỗi giáo viên ghi nhận' })
    expect(fixes).toHaveTextContent('have rose')
    expect(fixes).toHaveTextContent('have risen')
    expect(screen.queryByRole('region', { name: 'Đang chờ giáo viên chấm' })).not.toBeInTheDocument()
  })

  it('explains each kind of error by its name and how to fix it, and links to the list of graded essays', async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname
      if (path === `/api/learning/writing-submissions/${submissionId}`) return json(submission)
      if (path === `/api/learning/writing-submissions/${submissionId}/human-review`) return json(done)
      if (path === '/api/content/error-types/approved') {
        return json([{ code: 'VERB_FORM', name: 'Dạng của động từ', category: 'GRAMMAR', fixHint: 'Chia động từ theo thì và chủ ngữ.' }])
      }
      return json({}, 404)
    })
    show()

    const glossary = await screen.findByRole('region', { name: 'Các loại lỗi trong bài' })
    expect(glossary).toHaveTextContent('Dạng của động từ')
    expect(glossary).toHaveTextContent('Chia động từ theo thì và chủ ngữ.')
    const fixes = screen.getByRole('region', { name: 'Các lỗi giáo viên ghi nhận' })
    expect(fixes).toHaveTextContent('Dạng của động từ')
    expect(fixes).toHaveTextContent('Cách sửa: Chia động từ theo thì và chủ ngữ.')
    expect(within(screen.getByRole('region', { name: 'Kết quả chấm bài' })).getByLabelText('Loại lỗi giáo viên ghi nhận')).toHaveTextContent('Dạng của động từ')
    expect(screen.getByRole('link', { name: 'Xem tất cả bài giáo viên đã chấm' })).toHaveAttribute('href', '/writing-reviews')
  })

  it('falls back to the code when the error types cannot be read, with no glossary', async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname
      if (path === `/api/learning/writing-submissions/${submissionId}`) return json(submission)
      if (path === `/api/learning/writing-submissions/${submissionId}/human-review`) return json(done)
      return json({ message: 'down' }, 503)
    })
    show()

    expect(await screen.findByLabelText('Band Score')).toHaveTextContent('6.5')
    expect(screen.getByRole('region', { name: 'Các lỗi giáo viên ghi nhận' })).toHaveTextContent('VERB_FORM')
    expect(screen.queryByRole('region', { name: 'Các loại lỗi trong bài' })).not.toBeInTheDocument()
  })

  it('puts the essay beside its errors in the first screen, and the teacher\'s comments below', async () => {
    server(() => json(done))
    show()

    expect(await screen.findByLabelText('Band Score')).toHaveTextContent('6.5')
    const strip = screen.getByRole('list', { name: 'Band từng tiêu chí' })
    expect(within(strip).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['TR6.0', 'CC6.5', 'LR7.0', 'GRA6.5'])
    const essay = screen.getByRole('region', { name: 'Bài viết' })
    const fixes = screen.getByRole('region', { name: 'Các lỗi giáo viên ghi nhận' })
    const comments = screen.getByRole('region', { name: 'Kết quả chấm bài' })
    // The essay and the errors share the first screen; the comments come after both.
    expect(essay.closest('.we-split')).toBe(fixes.closest('.we-split'))
    expect(comments.closest('.we-split')).toBeNull()
    expect(essay.compareDocumentPosition(comments) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(within(comments).getByLabelText('Nhận xét chung')).toBeInTheDocument()
    expect(within(comments).getAllByRole('article')).toHaveLength(4)
  })

  it('folds the empty lines of a comment so the text is not stretched', async () => {
    server(() => json({ ...done, feedback: 'Dòng một.\n\n\n\nDòng hai.', criteria: [{ criterion: 'taskResponse', band: 6, comment: 'Ý một.\n\n\n\nÝ hai.' }] }))
    show()

    const comments = await screen.findByRole('region', { name: 'Kết quả chấm bài' })
    expect(within(comments).getByLabelText('Nhận xét chung').textContent).toBe('Dòng một.\nDòng hai.')
    expect(within(comments).getByText(/Ý một\./).textContent).toBe('Ý một.\nÝ hai.')
  })

  it('opens the error of a marked piece of the essay, and marks the same error on both sides', async () => {
    server(() => json(done))
    show()
    const essay = await screen.findByRole('region', { name: 'Bài viết' })
    const piece = essay.querySelector('mark') as HTMLElement

    fireEvent.click(piece)

    const fixes = screen.getByRole('region', { name: 'Các lỗi giáo viên ghi nhận' })
    expect(fixes.querySelector('li')).toHaveClass('is-active')
    expect(piece).toHaveClass('is-active')
  })

  it('lists no errors and shows the essay alone when the teacher marked nothing', async () => {
    server(() => json({ ...done, annotations: null, errorCodes: [] }))
    show()

    expect(await screen.findByRole('region', { name: 'Bài viết' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Các lỗi giáo viên ghi nhận' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Kết quả chấm bài' })).toBeInTheDocument()
  })
  describe('when the teacher is late', () => {
    const other = '20000000-0000-4000-8000-000000000002'
    const otherProfile = { ...profile, id: other, displayName: 'Mr Minh Quân', ieltsBand: 8 }
    const job = (overrides = {}) => ({
      id: '50000000-0000-4000-8000-000000000001', reviewSubmissionId: pending.reviewSubmissionId, skill: 'WRITING', source: 'PRACTICE',
      state: 'OVERDUE', examinerId, requestedAt: '2026-10-21T01:00:00Z', deadline: '2026-10-23T01:00:00Z', canChoose: true, changesLeft: 2,
      createdAt: '2026-10-21T00:59:00Z', ...overrides,
    })
    const changes: unknown[] = []

    /** The learner's job, the review, and the examiners to pick from; changing the examiner makes the job wait again. */
    function lateServer({ current = job(), change = (): Response => json(job({ state: 'WAITING', examinerId: other, changesLeft: 1, canChoose: false })) } = {}) {
      let jobBody: unknown = current
      let reviewBody: unknown = pending
      fetchMock.mockImplementation(async (input, options = {}) => {
        const path = new URL(String(input)).pathname
        calls.push({ path })
        if (path === `/api/learning/writing-submissions/${submissionId}`) return json(submission)
        if (path === `/api/learning/writing-submissions/${submissionId}/human-review`) return json(reviewBody)
        if (path === '/api/assessments/grading-jobs/mine') return json([jobBody])
        if (path === `/api/users/examiners/${examinerId}`) return json(profile)
        if (path === `/api/users/examiners/${other}`) return json(otherProfile)
        if (path === '/api/users/examiners') return json([profile, otherProfile])
        if (path === '/api/assessments/examiners/availability') return json([])
        if (path === `/api/assessments/grading-jobs/${job().id}/examiner` && options.method === 'POST') {
          changes.push(JSON.parse(String(options.body)))
          const answer = change()
          if (answer.ok) { jobBody = await answer.clone().json(); reviewBody = { ...pending, examinerId: other } }
          return answer
        }
        return json({}, 404)
      })
    }
    beforeEach(() => { changes.length = 0; window.localStorage.clear() })

    it('offers to keep waiting or to change the teacher, and says no more is charged', async () => {
      lateServer()
      show()

      const notice = await screen.findByRole('region', { name: 'Giáo viên chưa chấm bài' })
      expect(notice).toHaveTextContent('Giáo viên chưa chấm xong trong 48 giờ')
      expect(within(notice).getByRole('button', { name: 'Tiếp tục chờ Ms Lan Phương' })).toBeInTheDocument()
      expect(within(notice).getByRole('button', { name: 'Yêu cầu đổi giáo viên' })).toBeInTheDocument()
      expect(notice).toHaveTextContent('Còn 2 lần đổi')
      expect(notice).toHaveTextContent('không mất thêm lượt chấm')
    })

    it('shows nothing while the teacher still has time', async () => {
      lateServer({ current: job({ state: 'WAITING', canChoose: false }) })
      show()

      await screen.findByRole('region', { name: 'Đang chờ giáo viên chấm' })
      await waitFor(() => expect(calls.some((call) => call.path === '/api/assessments/grading-jobs/mine')).toBe(true))
      expect(screen.queryByRole('region', { name: 'Giáo viên chưa chấm bài' })).not.toBeInTheDocument()
    })

    it('keeps waiting for the same teacher and remembers the choice', async () => {
      lateServer()
      const first = show()
      fireEvent.click(await screen.findByRole('button', { name: 'Tiếp tục chờ Ms Lan Phương' }))

      const notice = screen.getByRole('region', { name: 'Giáo viên chưa chấm bài' })
      expect(notice).toHaveTextContent('Bạn đang tiếp tục chờ Ms Lan Phương')
      expect(within(notice).queryByRole('button', { name: /Tiếp tục chờ/ })).not.toBeInTheDocument()
      expect(within(notice).getByRole('button', { name: 'Yêu cầu đổi giáo viên' })).toBeInTheDocument()
      expect(changes).toHaveLength(0)

      first.unmount()
      show()
      expect(await screen.findByText(/Bạn đang tiếp tục chờ/)).toBeInTheDocument()
    })

    it('changes the teacher to another one, never offering the late one, and shows the new teacher', async () => {
      lateServer()
      show()
      fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu đổi giáo viên' }))

      const dialog = await screen.findByRole('dialog')
      const choices = await within(dialog).findByRole('radiogroup', { name: 'Giáo viên' })
      expect(choices).toHaveTextContent('Mr Minh Quân')
      expect(choices).not.toHaveTextContent('Ms Lan Phương')
      fireEvent.click(within(dialog).getByRole('radio'))
      fireEvent.click(within(dialog).getByRole('button', { name: 'Chuyển cho Mr Minh Quân' }))

      await waitFor(() => expect(changes).toEqual([{ examinerId: other }]))
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Giáo viên chưa chấm bài' })).not.toBeInTheDocument())
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(await screen.findByRole('region', { name: 'Giáo viên chấm bài' })).toHaveTextContent('Mr Minh Quân')
    })

    it('tells the learner why a change was refused and lets them choose again', async () => {
      lateServer({ change: () => json({ code: 'EXAMINER_UNAVAILABLE', message: 'full', details: { reason: 'FULL' } }, 409) })
      show()
      fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu đổi giáo viên' }))
      const dialog = await screen.findByRole('dialog')
      await within(dialog).findByRole('radiogroup', { name: 'Giáo viên' })
      fireEvent.click(within(dialog).getByRole('radio'))
      fireEvent.click(within(dialog).getByRole('button', { name: 'Chuyển cho Mr Minh Quân' }))

      expect(await within(dialog).findByText(/vừa đủ bài hôm nay hoặc đang tắt nhận bài/)).toBeInTheDocument()
      // The dialog is modal, so the page behind it is hidden from the accessibility tree while it is open.
      expect(screen.getByRole('region', { name: 'Giáo viên chưa chấm bài', hidden: true })).toBeInTheDocument()
      // The choice stays, so the learner can send it again or pick someone else.
      await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Chuyển cho Mr Minh Quân' })).toBeEnabled())
    })

    it('offers no change once both changes were used', async () => {
      lateServer({ current: job({ canChoose: false, changesLeft: 0 }) })
      show()

      const notice = await screen.findByRole('region', { name: 'Giáo viên chưa chấm bài' })
      expect(notice).toHaveTextContent('Bạn đã dùng hết 2 lần đổi giáo viên')
      expect(within(notice).queryByRole('button', { name: 'Yêu cầu đổi giáo viên' })).not.toBeInTheDocument()
      expect(within(notice).getByRole('button', { name: 'Tiếp tục chờ Ms Lan Phương' })).toBeInTheDocument()
    })
  })

  it('shows the review even when the teacher profile cannot be read', async () => {
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname
      if (path.endsWith('/human-review')) return json(done)
      if (path.startsWith('/api/users/examiners/')) return json({ message: 'down' }, 503)
      return json(submission)
    })
    show()

    expect(await screen.findByLabelText('Band Score')).toHaveTextContent('6.5')
    expect(screen.queryByRole('region', { name: 'Giáo viên chấm bài' })).not.toBeInTheDocument()
  })
})
