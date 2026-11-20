import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { SubmissionHistoryPage } from './SubmissionHistoryPage'

vi.mock('@/components/SiteNavbar', () => ({ SiteNavbar: () => null }))
// The page reads topic names through the learning API. Without a configured API base URL (a machine with no .env file, such
// as the CI runner) the app picks the in-browser mock instead of the fetch calls this test answers, so the choice is fixed here.
vi.mock('@/lib/env', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/env')>()), USE_MOCK_LEARNING: false }))

const id = (n: number) => `50000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const entry = (n: number, overrides = {}) => ({
  kind: 'WRITING', id: id(n), submittedAt: `2026-11-1${n}T01:00:00Z`, skill: 'WRITING', task: 'TASK_2', promptPreview: `Question ${n}`, band: 6.5,
  percent: null, correctCount: null, totalCount: null, passed: true, status: 'GRADED', lessonId: id(70 + n), topicId: null, courseId: null,
  attemptId: null, packageVersionId: null, revisionNo: 1, ...overrides,
})
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const calls: string[] = []
const fetchMock = vi.fn<typeof fetch>()

interface Fixture {
  course?: unknown[][]
  free?: Record<string, unknown[][]>
  bank?: Record<string, unknown[]>
  reviews?: unknown[][]
  knowledge?: unknown[][]
}

function server({ course = [[]], free = {}, bank = {}, reviews = [[]], knowledge = [[]] }: Fixture) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input))
    calls.push(url.pathname + url.search)
    const page = Number(url.searchParams.get('page') ?? 0)
    if (url.pathname === '/api/learning/submission-history') {
      const scope = url.searchParams.get('scope')
      const pages = scope === 'COURSE' ? course : scope === 'KNOWLEDGE' ? knowledge : free[url.searchParams.get('skill') ?? ''] ?? [[]]
      return json({ items: pages[page] ?? [], page, size: 10, hasNext: page < pages.length - 1 })
    }
    if (url.pathname === '/api/assessments/practice/history') {
      const items = bank[url.searchParams.get('skill') ?? ''] ?? []
      return json({ totalElements: items.length, page, size: 10, items })
    }
    if (url.pathname === '/api/learning/examiner-reviews') return json({ items: reviews[page] ?? [], page, size: 10, hasNext: page < reviews.length - 1 })
    if (url.pathname === '/api/assessments/grading-jobs/mine') return json([])
    if (url.pathname === '/api/learning/topics') {
      return json([{ topicId: id(60), code: 'TENSES', name: 'Thì hiện tại hoàn thành', description: '', sequenceOrder: 1, status: 'IN_PROGRESS',
        completedLessonCount: 0, totalLessonCount: 3, course: null }])
    }
    if (url.pathname === '/api/content/practice-tests/search') return json({ items: [], page: 0, size: 50, totalElements: 0 })
    return json({}, 404)
  })
}

const show = (path = '/submission-history') => render(<MemoryRouter initialEntries={[path]}><Routes>
  <Route path="/submission-history" element={<SubmissionHistoryPage />} />
  <Route path="/practice/writing/submissions/:submissionId/result" element={<p>Kết quả bài viết</p>} />
</Routes></MemoryRouter>)

const lines = () => within(screen.getByRole('region')).getAllByRole('listitem')

describe('the page "Lịch sử nộp bài"', () => {
  beforeEach(() => { calls.length = 0; fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token') })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('lists the free practice sets of knowledge points in their own tab, each opening its set', async () => {
    server({ knowledge: [[{ ...entry(4), kind: 'KP_PRACTICE', skill: 'WRITING', task: null, promptPreview: null, band: null, status: null,
      lessonId: null, correctCount: 7, totalCount: 10, passed: true, attemptId: id(9), knowledgePointId: id(61),
      knowledgePointCode: 'TREND', knowledgePointName: 'Từ vựng mô tả xu hướng' }]] })
    show('/submission-history?tab=knowledge')

    expect(await screen.findByText('Từ vựng mô tả xu hướng')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Luyện theo kiến thức' })).toHaveAttribute('aria-selected', 'true')
    const [row] = lines()
    expect(row).toHaveTextContent('Đúng 7/10 câu')
    expect(within(row).getByRole('link', { name: 'Xem kết quả' })).toHaveAttribute('href', `/learn/practice/${id(9)}`)
    expect(calls).toContain('/api/learning/submission-history?scope=KNOWLEDGE&page=0&size=10')
  })

  it('opens on what was submitted in a course, newest first as the server lists it, with four tabs', async () => {
    server({ course: [[entry(2), entry(1, { kind: 'PRACTICE', correctCount: 4, totalCount: 5, percent: null, promptPreview: null, task: null })]] })
    show()

    expect(screen.getByRole('heading', { level: 1, name: 'Lịch sử nộp bài' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Trong khóa học', 'Luyện tập 4 kỹ năng', 'Luyện theo kiến thức', 'Bài giáo viên đã chấm'])
    expect(screen.getByRole('tab', { name: 'Trong khóa học' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Question 2')).toBeInTheDocument()
    const rows = lines()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Writing trong bài học')
    expect(within(rows[0]).getByRole('link', { name: 'Xem nhận xét' })).toHaveAttribute('href', `/practice/writing/submissions/${id(2)}/result?from=%2Fsubmission-history`)
    expect(rows[1]).toHaveTextContent('Practice · ')
    expect(calls).toContain('/api/learning/submission-history?scope=COURSE&page=0&size=10')
  })

  it('names a lesson line by its topic with one call for the page, and never opens a lesson for its title', async () => {
    server({ course: [[entry(1, { kind: 'PRACTICE', skill: 'READING', correctCount: 4, totalCount: 5, topicId: id(60) }), entry(2, { kind: 'PRACTICE', skill: 'READING', correctCount: 5, totalCount: 5, topicId: id(60) })]] })
    show()

    expect(await screen.findAllByText('Practice trong chủ đề “Thì hiện tại hoàn thành”')).toHaveLength(2)
    expect(calls.filter((call) => call.startsWith('/api/learning/topics'))).toHaveLength(1)
    expect(calls.filter((call) => call.startsWith('/api/learning/lessons/'))).toHaveLength(0)
  })

  it('says so when nothing was submitted in a course yet', async () => {
    server({ course: [[]] })
    show()

    expect(await screen.findByText('Bạn chưa nộp bài nào trong khóa học')).toBeInTheDocument()
  })

  it('loads older lines on request and keeps the ones already shown', async () => {
    server({ course: [[entry(2)], [entry(1)]] })
    show()
    await screen.findByText('Question 2')

    fireEvent.click(screen.getByRole('button', { name: /Xem thêm/ }))

    expect(await screen.findByText('Question 1')).toBeInTheDocument()
    expect(lines()).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Xem thêm/ })).not.toBeInTheDocument()
  })

  it('lists free practice Reading from Assessment by default, and Writing from Learning after choosing it', async () => {
    server({
      bank: { READING: [{ attemptId: id(8), packageId: id(40), packageVersionId: id(41), skill: 'READING', scope: 'FULL', partNos: [], status: 'SUBMITTED', submittedAt: '2026-11-13T09:00:00Z', percent: 70 }] },
      free: { WRITING: [[entry(3, { promptPreview: 'Free essay question' })]] },
    })
    show('/submission-history?tab=practice')

    expect(await screen.findByText('Bài Reading')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reading' })).toHaveAttribute('aria-pressed', 'true')
    expect(calls).toContain('/api/assessments/practice/history?skill=READING&page=0&size=10')

    fireEvent.click(screen.getByRole('button', { name: 'Writing' }))

    expect(await screen.findByText('Free essay question')).toBeInTheDocument()
    expect(calls).toContain('/api/learning/submission-history?scope=FREE&page=0&size=10&skill=WRITING')
  })

  it('says which skill is empty', async () => {
    server({})
    show('/submission-history?tab=practice&skill=speaking')

    expect(await screen.findByText('Bạn chưa nộp bài Speaking nào')).toBeInTheDocument()
  })

  it('keeps the teacher list as its own tab', async () => {
    server({ reviews: [[{ submissionId: id(1), reviewSubmissionId: id(101), source: 'FREE_WRITING', task: 'TASK_2', promptPreview: 'Sent to a teacher', wordCount: 260, requestedAt: '2026-10-21T01:00:00Z' }]] })
    show()

    fireEvent.click(screen.getByRole('tab', { name: 'Bài giáo viên đã chấm' }))

    expect(await screen.findByText('Sent to a teacher')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Bài giáo viên đã chấm' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows an error with a way to try again when a list cannot be loaded', async () => {
    fetchMock.mockImplementation(async () => json({ message: 'Dịch vụ đang bận' }, 503))
    show()

    expect(await screen.findByRole('button', { name: /Thử lại/ })).toBeInTheDocument()
  })
})
