import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import type { WritingTask } from './writingApi'
import { useGradeFlow } from './useGradeFlow'

vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => ({ isLoggedIn: true, hydrated: true, roles: ['CUSTOMER'] }) }))

const ids = {
  request: '00000000-0000-4000-8000-0000000000a1', version: '10000000-0000-4000-8000-000000000001',
  question: '10000000-0000-4000-8000-000000000002', lan: '20000000-0000-4000-8000-000000000001',
  quan: '20000000-0000-4000-8000-000000000002', submission: '30000000-0000-4000-8000-000000000001',
}
const task: WritingTask = {
  packageId: 'p', packageVersionId: ids.version, sectionId: 's', questionVersionId: ids.question, packageTitle: 'Cambridge 18',
  title: 'Library visits', partNo: 1, task: 'TASK_1', minWords: null, timeLimitSeconds: 1200, instructions: null,
  prompt: 'Summarise the table.', guide: null, guideSteps: null, images: [],
}
const ESSAY = 'word '.repeat(60).trim()
const SHORT_ESSAY = 'word '.repeat(10).trim()
const examiner = (id: string, name: string, extra = {}) => ({ id, displayName: name, avatarUrl: null, bio: 'Giáo viên IELTS', ieltsBand: 8.5, certificates: [{ name: 'CELTA', issuer: 'Cambridge', year: 2018, score: null }], acceptingSubmissions: true, ...extra })
const subscription = (overrides = {}) => ({
  id: 's', userId: 'u', planId: 'p', planCode: 'PREMIUM', planName: 'Premium', status: 'ACTIVE', startsAt: '2026-10-01T00:00:00Z',
  endsAt: '2099-01-01T00:00:00Z', humanGradingCreditsTotal: 4, humanGradingCreditsUsed: 0, remainingCredits: 4,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', ...overrides,
})
const wallet = (balance: number) => ({ userId: 'u', balance, totalCredited: balance, totalDebited: 0, updatedAt: '2026-10-01T00:00:00Z' })

type Call = { path: string; method: string; body: unknown }
const calls: Call[] = []
const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

interface Server {
  balance?: number
  /** The subscription body; null answers 204 (none); 'error' answers 500. */
  subscription?: unknown
  full?: string[]
  /** Teachers held back by too many late jobs: they cannot take a submission either, and are worded differently. */
  backlog?: string[]
  submit?: () => Response
  /** The essay of this prompt that still waits for its teacher, if any. */
  waiting?: string | null
}
function server({ balance = 0, subscription: sub = subscription(), full = [], backlog = [], submit, waiting = null }: Server = {}) {
  fetchMock.mockImplementation(async (input, options = {}) => {
    const url = new URL(String(input))
    const call = { path: url.pathname, method: options.method ?? 'GET', body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body }
    calls.push(call)
    switch (url.pathname) {
      case '/api/access/me/points': return json(wallet(balance))
      case '/api/access/me/subscription': return sub === 'error' ? json({ message: 'down' }, 500) : sub === null ? json(null, 204) : json(sub)
      case '/api/learning/free-writing/grading-terms': return json({ pointCost: 3, minWords: 50, maxWords: 1000 })
      case '/api/users/examiners': return json([examiner(ids.lan, 'Ms Lan Phương'), examiner(ids.quan, 'Mr Minh Quân')])
      case '/api/assessments/examiners/availability': return json([...new Set([...full, ...backlog])].map((examinerId) => ({ examinerId, full: true, backlog: backlog.includes(examinerId) })))
      case '/api/learning/free-writing/examiner-submissions/pending': return json(waiting ? { pending: true, submissionId: waiting } : { pending: false })
      case '/api/learning/free-writing/examiner-submissions': return submit ? submit() : json({ submissionId: ids.submission, status: 'AWAITING_EXAMINER' })
      default: return json({}, 404)
    }
  })
}

function Harness({ essay }: { essay: string }) {
  const grade = useGradeFlow({ task, mode: 'free', draftKey: 'draft', essay, seconds: 60, label: 'Viết tự do', benefits: ['Band tổng'], extraChecks: [] })
  return <>{grade.pendingNotice}<button type="button" onClick={grade.start}>Hoàn thành</button>{grade.dialogs}</>
}
function Location() { const { pathname } = useLocation(); return <output data-testid="location">{pathname}</output> }
function show(essay = ESSAY) {
  return render(<MemoryRouter initialEntries={['/practice/writing/tasks/s']}><Routes>
    <Route path="/practice/writing/tasks/s" element={<Harness essay={essay} />} />
    <Route path="/practice/writing/submissions/:id/result" element={<p>result page</p>} />
  </Routes><Location /></MemoryRouter>)
}
const finish = async () => { fireEvent.click(screen.getByRole('button', { name: 'Hoàn thành' })); return screen.findByRole('dialog', { name: 'Chọn cách chấm bài' }) }
const cardOf = (dialog: HTMLElement, name: string) => within(within(dialog).getByRole('region', { name }))
const submissions = () => calls.filter((call) => call.method === 'POST' && call.path.endsWith('/examiner-submissions'))

describe('finishing a Writing essay', () => {
  beforeEach(() => {
    calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token')
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(ids.request as ReturnType<typeof crypto.randomUUID>)
  })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.sessionStorage.clear() })

  it('reads the points and the Premium credits, then lets the learner choose between a teacher and the AI', async () => {
    server({ balance: 0 })
    show()

    const dialog = await finish()

    expect(calls.map((call) => call.path)).toEqual(expect.arrayContaining(['/api/access/me/points', '/api/access/me/subscription']))
    expect(cardOf(dialog, 'Giáo viên chấm').getByText('Còn 4 lượt giáo viên chấm (gói Premium).')).toBeInTheDocument()
    expect(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' })).toBeEnabled()
    expect(cardOf(dialog, 'AI chấm').getByText(/số dư 0 point · còn thiếu 3 point/)).toBeInTheDocument()
    expect(cardOf(dialog, 'AI chấm').getByRole('button', { name: 'Nạp point để AI chấm' })).toBeInTheDocument()
  })

  it('sends the essay to the chosen teacher and opens the result page; no point is touched', async () => {
    server({ balance: 0 })
    show()
    const dialog = await finish()

    fireEvent.click(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' }))
    const pick = await screen.findByRole('dialog', { name: 'Chọn giáo viên chấm bài' })
    expect(await within(pick).findByText('Ms Lan Phương')).toBeInTheDocument()
    expect(within(pick).getAllByText('IELTS 8.5')).toHaveLength(2)
    expect(within(pick).getAllByText(/CELTA · Cambridge · 2018/)).toHaveLength(2)
    expect(within(pick).getByRole('button', { name: 'Chọn một giáo viên' })).toBeDisabled()
    fireEvent.click(within(pick).getByRole('radio', { name: /Ms Lan Phương/ }))
    fireEvent.click(within(pick).getByRole('button', { name: 'Gửi cho Ms Lan Phương · 1 lượt' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/practice/writing/submissions/${ids.submission}/result`))
    expect(submissions()).toHaveLength(1)
    expect(submissions()[0].body).toEqual({ requestId: ids.request, packageVersionId: ids.version, questionVersionId: ids.question, essayText: ESSAY, examinerId: ids.lan })
    expect(calls.some((call) => call.path.endsWith('/free-writing/submissions'))).toBe(false)
  })

  it('shows a teacher who already took their share today as full and cannot be picked', async () => {
    server({ full: [ids.quan] })
    show()
    const dialog = await finish()

    fireEvent.click(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' }))
    const pick = await screen.findByRole('dialog', { name: 'Chọn giáo viên chấm bài' })

    expect(await within(pick).findByText('Đã đủ bài hôm nay')).toBeInTheDocument()
    expect(within(pick).getByRole('radio', { name: /Mr Minh Quân/ })).toBeDisabled()
    expect(within(pick).getByRole('radio', { name: /Ms Lan Phương/ })).toBeEnabled()
  })

  it('words a teacher held back by late jobs as not taking new submissions for now, and cannot be picked', async () => {
    server({ backlog: [ids.quan], full: [] })
    show()
    const dialog = await finish()

    fireEvent.click(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' }))
    const pick = await screen.findByRole('dialog', { name: 'Chọn giáo viên chấm bài' })

    expect(await within(pick).findByText('Tạm chưa nhận bài mới')).toBeInTheDocument()
    expect(within(pick).queryByText('Đã đủ bài hôm nay')).not.toBeInTheDocument()
    expect(within(pick).getByRole('radio', { name: /Mr Minh Quân/ })).toBeDisabled()
    expect(within(pick).getByRole('radio', { name: /Ms Lan Phương/ })).toBeEnabled()
  })

  it('keeps the teacher closed without Premium and lets enough points go to the AI confirmation', async () => {
    server({ balance: 10, subscription: null })
    show()
    const dialog = await finish()

    expect(cardOf(dialog, 'Giáo viên chấm').getByText('Cần gói Premium để gửi giáo viên chấm.')).toBeInTheDocument()
    expect(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' })).toBeDisabled()
    fireEvent.click(cardOf(dialog, 'AI chấm').getByRole('button', { name: 'Chấm bằng AI · 3 point' }))

    expect(await screen.findByRole('dialog', { name: 'Chấm bài bằng AI' })).toBeInTheDocument()
  })

  it('sends a learner without enough points to the top-up dialog when they pick the AI', async () => {
    server({ balance: 1, subscription: null })
    show()
    const dialog = await finish()

    fireEvent.click(cardOf(dialog, 'AI chấm').getByRole('button', { name: 'Nạp point để AI chấm' }))

    expect(await screen.findByRole('dialog', { name: 'Bạn chưa đủ point để chấm bài' })).toBeInTheDocument()
    expect(screen.getByText('2 point')).toBeInTheDocument()
  })

  it('says a Premium learner has no credit left, while the AI stays open with enough points', async () => {
    server({ balance: 5, subscription: subscription({ remainingCredits: 0, humanGradingCreditsUsed: 4 }) })
    show()
    const dialog = await finish()

    expect(cardOf(dialog, 'Giáo viên chấm').getByText('Gói Premium của bạn đã hết lượt giáo viên chấm.')).toBeInTheDocument()
    expect(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' })).toBeDisabled()
    expect(cardOf(dialog, 'AI chấm').getByRole('button', { name: 'Chấm bằng AI · 3 point' })).toBeInTheDocument()
  })

  it('leaves the teacher open when the subscription cannot be read, because the server checks it when sending', async () => {
    server({ balance: 0, subscription: 'error' })
    show()
    const dialog = await finish()

    expect(cardOf(dialog, 'Giáo viên chấm').getByText('Dùng 1 lượt giáo viên chấm của gói Premium.')).toBeInTheDocument()
    expect(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' })).toBeEnabled()
  })

  it('tells the learner a teacher refused and lets them send the same essay to another one', async () => {
    let attempts = 0
    server({ submit: () => (++attempts === 1 ? json({ message: 'full', code: 'EXAMINER_UNAVAILABLE' }, 409) : json({ submissionId: ids.submission, status: 'AWAITING_EXAMINER' })) })
    show()
    const dialog = await finish()
    fireEvent.click(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' }))
    const pick = await screen.findByRole('dialog', { name: 'Chọn giáo viên chấm bài' })
    fireEvent.click(await within(pick).findByRole('radio', { name: /Ms Lan Phương/ }))
    fireEvent.click(within(pick).getByRole('button', { name: 'Gửi cho Ms Lan Phương · 1 lượt' }))

    expect(await within(pick).findByText(/vừa đủ bài hôm nay, đang tắt nhận bài hoặc tạm chưa nhận bài mới/)).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/writing/tasks/s')
    fireEvent.click(within(pick).getByRole('radio', { name: /Mr Minh Quân/ }))
    fireEvent.click(within(pick).getByRole('button', { name: 'Gửi cho Mr Minh Quân · 1 lượt' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/result'))
    expect(submissions().map((call) => (call.body as { examinerId: string; requestId: string }).examinerId)).toEqual([ids.lan, ids.quan])
    expect(new Set(submissions().map((call) => (call.body as { requestId: string }).requestId))).toEqual(new Set([ids.request]))
  })

  it('explains that the credit ran out when the server refuses for it', async () => {
    server({ submit: () => json({ message: 'none', code: 'HUMAN_GRADING_CREDIT_REQUIRED' }, 402) })
    show()
    const dialog = await finish()
    fireEvent.click(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' }))
    const pick = await screen.findByRole('dialog', { name: 'Chọn giáo viên chấm bài' })
    fireEvent.click(await within(pick).findByRole('radio', { name: /Ms Lan Phương/ }))
    fireEvent.click(within(pick).getByRole('button', { name: 'Gửi cho Ms Lan Phương · 1 lượt' }))

    expect(await within(pick).findByText(/đã hết lượt giáo viên chấm, hoặc đã hết hạn/)).toBeInTheDocument()
  })

  describe('coming back to a prompt already sent to a teacher', () => {
    it('says so before the learner writes again, keeps the teacher closed and leaves the AI open', async () => {
      server({ balance: 10, waiting: ids.submission })
      show()

      const notice = (await screen.findByText(/đã gửi giáo viên và đang chờ chấm/)).closest('[role="status"]') as HTMLElement
      expect(notice).toHaveTextContent('chọn AI chấm')
      expect(within(notice).getByRole('link', { name: 'Xem bài đang chờ chấm' })).toHaveAttribute('href', `/practice/writing/submissions/${ids.submission}/result`)
      expect(calls.some((call) => call.path.endsWith('/examiner-submissions/pending') && call.method === 'GET')).toBe(true)

      const dialog = await finish()
      expect(cardOf(dialog, 'Giáo viên chấm').getByText(/Bạn gửi lại được sau khi giáo viên chấm xong/)).toBeInTheDocument()
      expect(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' })).toBeDisabled()
      expect(cardOf(dialog, 'AI chấm').getByRole('button', { name: 'Chấm bằng AI · 3 point' })).toBeEnabled()
      expect(submissions()).toHaveLength(0)
    })

    it('shows no notice and keeps the teacher open when nothing waits', async () => {
      server({ balance: 0 })
      show()

      const dialog = await finish()
      expect(screen.queryByText(/đã gửi giáo viên và đang chờ chấm/)).not.toBeInTheDocument()
      expect(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' })).toBeEnabled()
    })

    it('still refuses clearly when the server says the last essay waits, and offers the waiting essay', async () => {
      server({ submit: () => json({ message: 'already sent', code: 'EXAMINER_REVIEW_PENDING', submissionId: ids.submission }, 409) })
      show()
      const dialog = await finish()
      fireEvent.click(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' }))
      const pick = await screen.findByRole('dialog', { name: 'Chọn giáo viên chấm bài' })
      fireEvent.click(await within(pick).findByRole('radio', { name: /Ms Lan Phương/ }))
      fireEvent.click(within(pick).getByRole('button', { name: 'Gửi cho Ms Lan Phương · 1 lượt' }))

      expect(await within(pick).findByText(/đang chờ chấm, nên chưa gửi lại được/)).toBeInTheDocument()
      expect(within(pick).getByText(/lượt chấm của bạn không bị trừ thêm/)).toBeInTheDocument()
      expect(screen.getByTestId('location')).toHaveTextContent('/practice/writing/tasks/s')
      expect(screen.getAllByRole('link', { hidden: true }).some((link) => link.getAttribute('href') === `/practice/writing/submissions/${ids.submission}/result`)).toBe(true)
    })
  })

  it('does not send an essay that is too short, and says how many words it needs', async () => {
    server()
    show(SHORT_ESSAY)
    const dialog = await finish()

    fireEvent.click(cardOf(dialog, 'Giáo viên chấm').getByRole('button', { name: 'Chọn giáo viên' }))
    const pick = await screen.findByRole('dialog', { name: 'Chọn giáo viên chấm bài' })
    fireEvent.click(await within(pick).findByRole('radio', { name: /Ms Lan Phương/ }))

    expect(within(pick).getByText(/Cần ít nhất 50 từ để gửi giáo viên chấm \(hiện có 10\)/)).toBeInTheDocument()
    expect(within(pick).getByRole('button', { name: 'Gửi cho Ms Lan Phương · 1 lượt' })).toBeDisabled()
    expect(submissions()).toHaveLength(0)
  })
})
