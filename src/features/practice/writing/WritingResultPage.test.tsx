import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/httpClient'
import { WritingResultPage } from './WritingResultPage'

vi.mock('@/components/SiteNavbar', () => ({ SiteNavbar: () => null }))
const { startStudyPointPractice } = vi.hoisted(() => ({ startStudyPointPractice: vi.fn() }))
vi.mock('@/features/learning-path/lib/studyPointPractice', () => ({ startStudyPointPractice }))

const submissionId = '30000000-0000-4000-8000-000000000001'
const kpId = '50000000-0000-4000-8000-000000000001'
const ESSAY = 'The chart shows sales. Sales rose to 40 in 2020. Sales fell to 10 in 2021. I think this is sad.'
const FELL = 'Sales fell to 10 in 2021.'

const criterion = (code: string, band: number, extra = {}) => ({
  code, band, strengths: ['Rõ ý'], improvements: ['Thêm số liệu'], knowledgePointJudgments: [], ...extra,
})
const base = {
  submissionId, status: 'GRADED', task: 'TASK_1', wordCount: 20, overallBand: 6, passed: true, essayText: ESSAY,
  summary: 'Bài khá.', criteria: [criterion('TA', 6), criterion('CC', 6), criterion('LR', 6), criterion('GRA', 6)],
  corrections: [] as unknown[],
}
const task1 = {
  ...base,
  criteria: [
    criterion('TA', 5, {
      limited: true, evidence: ['Sales rose to 40 in 2020.'], descriptor: 'Band 5: …',
      nextBand: { band: 6, descriptor: 'Nêu đủ đặc điểm chính' },
    }),
    criterion('CC', 6), criterion('LR', 6), criterion('GRA', 6),
  ],
  bandLimits: [{ reason: 'T1_NO_OVERVIEW', criterion: 'TA', cap: 5, message: 'Thiếu đoạn tổng quan nên TA bị giới hạn ở 5' }],
  corrections: [{
    excerpt: FELL, suggestion: 'Sales fell to 15 in 2021.', category: 'TASK', errorCode: 'T1_DATA_MISREPORTED',
    errorName: 'Số liệu sai', fixHint: 'Đối chiếu bảng', severity: 3, start: 49, end: 74, reason: 'Bảng ghi 15', certainty: 'ERROR',
  }, {
    excerpt: 'I think this is sad.', suggestion: 'Remove the opinion.', category: 'TASK', start: 75, end: 95, certainty: 'SUGGESTION',
  }],
  errorGroups: [{ errorCode: 'T1_DATA_MISREPORTED', errorName: 'Số liệu sai', category: 'TASK', count: 1, severity: 3,
    fixHint: 'Đối chiếu bảng', example: { wrong: 'fell to 10', right: 'fell to 15' } }],
  priorities: [
    { title: 'Số liệu sai', explanation: 'Đối chiếu bảng', excerpts: [FELL], action: 'Đọc lại bảng', errorCodes: ['T1_DATA_MISREPORTED'], practiceKnowledgePointId: kpId, source: 'RULE' },
    { title: 'Thiếu tổng quan', source: 'AI' },
  ],
  dataChecks: { wrong: [{ excerpt: FELL, expected: 'Năm 2021 doanh số là 15.' }], correctCount: 1, hasOverview: false, hasPersonalOpinion: true },
  revision: { previousSubmissionId: '60000000-0000-4000-8000-000000000001', fixedCodes: ['PLURAL_FORM'], repeatedCodes: ['T1_DATA_MISREPORTED'], newCodes: ['WORD_CHOICE'] },
}
const task2 = {
  ...base, task: 'TASK_2',
  taskChecks: {
    questionParts: [
      { part: 'Nêu ý kiến', addressed: 'FULL', excerpt: 'Sales rose to 40 in 2020.' },
      { part: 'Đưa giải pháp', addressed: 'NONE' },
    ],
    position: { required: true, stated: false },
    outline: [
      { role: 'INTRODUCTION', mainIdea: 'Giới thiệu', developed: false, excerpt: 'The chart shows sales.' },
      { role: 'BODY', mainIdea: 'Kỹ năng', developed: true },
    ],
    partialAnswer: true, noPosition: true, inconsistentPosition: false, noConclusion: true,
  },
}

const fetchMock = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
function show(submission: unknown) {
  fetchMock.mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname
    return path === `/api/learning/writing-submissions/${submissionId}` ? json(submission) : json({}, 404)
  })
  return render(<MemoryRouter initialEntries={[`/practice/writing/submissions/${submissionId}/result`]}><Routes>
    <Route path="/practice/writing/submissions/:submissionId/result" element={<WritingResultPage />} />
  </Routes></MemoryRouter>)
}

describe('the result of an essay graded by the AI', () => {
  beforeEach(() => {
    fetchMock.mockReset(); startStudyPointPractice.mockReset(); vi.stubGlobal('fetch', fetchMock); setAccessToken('test-access-token')
    Element.prototype.scrollIntoView = vi.fn()
  })
  afterEach(() => { clearAccessToken(); vi.unstubAllGlobals() })

  it('puts the problems to work on first right under the band, with a practice button only where there is a set', async () => {
    show(task1)

    const block = await screen.findByRole('region', { name: '2 vấn đề cần tập trung trước tiên' })
    const [first, second] = within(block).getAllByRole('listitem')
    expect(within(first).getByText('Số liệu sai')).toBeInTheDocument()
    expect(within(first).getByText(/Đọc lại bảng/)).toBeInTheDocument()
    expect(within(second).getByText('Thiếu tổng quan')).toBeInTheDocument()
    expect(within(block).getAllByRole('button', { name: 'Luyện lỗi này' })).toHaveLength(1)

    fireEvent.click(within(first).getByRole('button', { name: 'Luyện lỗi này' }))
    await waitFor(() => expect(startStudyPointPractice).toHaveBeenCalledTimes(1))
    expect(startStudyPointPractice.mock.calls[0][0]).toMatchObject({ practiceKnowledgePointId: kpId, code: 'T1_DATA_MISREPORTED' })
  })

  it('marks the essay at the range the server sent and shows a suggestion apart from an error', async () => {
    const { container } = show(task1)
    await screen.findByLabelText('Bài viết đã đánh dấu')

    const marks = [...container.querySelectorAll('mark')]
    expect(marks.map((mark) => mark.textContent)).toEqual([FELL, 'I think this is sad.'])
    expect(marks[0]).not.toHaveClass('wr-mark-suggestion')
    expect(marks[1]).toHaveClass('wr-mark-suggestion')
  })

  it('explains each correction: why it is wrong, the rule, a similar example, and that a suggestion is only a suggestion', async () => {
    show(task1)
    const list = await screen.findByRole('region', { name: 'Các lỗi cần sửa' })

    const [error, suggestion] = within(list).getAllByRole('listitem')
    expect(within(error).getByText('Tại sao sai?').parentElement).toHaveTextContent('Bảng ghi 15')
    expect(within(error).getByText('Quy tắc:').parentElement).toHaveTextContent('Đối chiếu bảng')
    expect(error).toHaveTextContent('Ví dụ tương tự: “fell to 10” → “fell to 15”')
    expect(within(error).queryByText('Gợi ý')).not.toBeInTheDocument()
    expect(within(suggestion).getByText('Gợi ý')).toBeInTheDocument()
  })

  it('shows the figures the essay got wrong against the chart, and the checklist only for the flags the model gave', async () => {
    show(task1)
    const checks = await screen.findByRole('region', { name: 'Kiểm tra số liệu so với biểu đồ' })

    expect(within(checks).getByRole('cell', { name: `“${FELL}”` })).toBeInTheDocument()
    expect(within(checks).getByRole('cell', { name: 'Năm 2021 doanh số là 15.' })).toBeInTheDocument()
    expect(within(checks).getByText('1 câu số liệu đúng.')).toBeInTheDocument()
    expect(within(checks).getByText(/Chưa có đoạn tổng quan/)).toBeInTheDocument()
    expect(within(checks).getByText(/Có ý kiến cá nhân/)).toBeInTheDocument()
    // overviewAccurate was not given: no line, and none while there is no overview at all.
    expect(within(checks).queryByText(/Tổng quan/)).not.toBeInTheDocument()
  })

  it('scrolls the essay to a quoted excerpt when it is clicked', async () => {
    show(task1)
    const checks = await screen.findByRole('region', { name: 'Kiểm tra số liệu so với biểu đồ' })

    fireEvent.click(within(checks).getByRole('button', { name: `“${FELL}”` }))

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(document.getElementById('wr-seg-49')).toHaveClass('is-focus')
  })

  it('shows the next band, the evidence and why a cap lowered the criterion', async () => {
    show(task1)
    await screen.findByLabelText('Bài viết đã đánh dấu')

    expect(screen.getByText('Thiếu đoạn tổng quan nên TA bị giới hạn ở 5')).toBeInTheDocument()
    expect(screen.getByText(/Để lên band 6\.0:/).parentElement).toHaveTextContent('Nêu đủ đặc điểm chính')
    expect(screen.getByText('Dẫn chứng:').parentElement).toHaveTextContent('Sales rose to 40 in 2020.')
  })

  it('compares an essay sent again with the version before', async () => {
    show(task1)
    const revision = await screen.findByRole('region', { name: 'So với bài trước' })

    expect(within(revision).getByText('Đã sửa 1 dạng lỗi.')).toBeInTheDocument()
    expect(within(revision).getByText('Còn lặp lại: Số liệu sai.')).toBeInTheDocument()
    expect(within(revision).getByText('Lỗi mới: WORD_CHOICE.')).toBeInTheDocument()
  })

  it('shows the corrected essay beside the original, with what changed marked', async () => {
    const { container } = show(task1)
    fireEvent.click(await screen.findByText('Đọc bản đã sửa'))

    const changed = [...container.querySelectorAll('.wr-corrected ins')].map((node) => node.textContent)
    expect(changed).toEqual(['Sales fell to 15 in 2021.', 'Remove the opinion.'])
    expect(screen.getByLabelText('Bài viết đã đánh dấu')).toHaveTextContent(FELL)
  })

  it('shows what a Task 2 essay answered of the question, its position, its conclusion and its outline', async () => {
    show(task2)
    const checks = await screen.findByRole('region', { name: 'Kiểm tra theo yêu cầu của đề' })

    const rows = within(checks).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Nêu ý kiến')
    expect(rows[1]).toHaveTextContent('Đã trả lời đủ')
    expect(rows[2]).toHaveTextContent('Đưa giải pháp')
    expect(rows[2]).toHaveTextContent('Chưa trả lời')
    expect(within(checks).getByText(/chưa nêu quan điểm rõ ràng/)).toBeInTheDocument()
    expect(within(checks).getByText(/Chưa có đoạn kết bài/)).toBeInTheDocument()
    expect(within(checks).getByText('Dàn ý bài của bạn')).toBeInTheDocument()
    expect(within(checks).getByText(/Mở bài/).parentElement).toHaveTextContent('Chưa triển khai')
  })

  it('still shows a grade stored before these fields: no new section, the marks found by the excerpt', async () => {
    const { container } = show({ ...base, corrections: [{ excerpt: FELL, suggestion: 'x', category: 'GRAMMAR' }] })
    await screen.findByLabelText('Bài viết đã đánh dấu')

    expect(container.querySelectorAll('mark')).toHaveLength(1)
    expect(screen.queryByRole('region', { name: /vấn đề cần tập trung/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'So với bài trước' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Kiểm tra/ })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Các lỗi cần sửa' })).toHaveTextContent('Sales fell to 10 in 2021.')
    expect(screen.queryByText('Luyện lỗi này')).not.toBeInTheDocument()
  })
})
