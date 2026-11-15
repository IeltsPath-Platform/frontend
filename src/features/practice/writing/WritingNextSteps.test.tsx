import type { ComponentProps } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EssayKnowledgeJudgment, EssayStudyPoint } from '~types/learningPath'
import { ApiError } from '@/features/learning-path/api'
import { getPracticeSinceEssay, type PracticeSince } from '../history/submissionHistoryApi'
import { WritingNextSteps } from './WritingNextSteps'

vi.mock('../history/submissionHistoryApi', async (original) => ({
  ...(await original<typeof import('../history/submissionHistoryApi')>()),
  getPracticeSinceEssay: vi.fn(),
}))
const practiceSince = vi.mocked(getPracticeSinceEssay)

const ta: EssayStudyPoint = {
  kind: 'CRITERION', criterionCode: 'TA', band: 3, knowledgePointId: 'kp-ta', code: 'TA', name: 'Hoàn thành yêu cầu Task 1 (TA)',
  title: null, reason: 'Write a clear overview, select and compare the key features of a chart.',
}
const lr: EssayStudyPoint = { ...ta, criterionCode: 'LR', band: 4, knowledgePointId: 'kp-lr', name: 'Vốn từ vựng (LR)' }
const failed: EssayStudyPoint = {
  kind: 'KNOWLEDGE_POINT', criterionCode: null, band: null, knowledgePointId: 'kp-chart', code: 'CHART', name: 'Mô tả biểu đồ (Task 1)',
  title: 'Mô tả biểu đồ (Task 1)', reason: 'Nêu sai xu hướng chính của biểu đồ.', excerpt: 'Overall, the young people is going library.',
  practiceKnowledgePointId: 'kp-chart',
}
const aiNote: EssayStudyPoint = {
  kind: 'AI', criterionCode: null, band: null, knowledgePointId: null, code: null, name: null,
  title: 'Task Achievement', reason: 'Luyện đọc bảng và viết overview đúng xu hướng chính.',
}
const judgments: EssayKnowledgeJudgment[] = [
  { knowledgePointId: 'kp-chart', code: 'CHART', name: 'Mô tả biểu đồ (Task 1)', judgment: 'FAIL', excerpt: failed.excerpt!, reason: failed.reason },
  { knowledgePointId: 'kp-trend', code: 'TREND', name: 'Từ vựng mô tả xu hướng (Task 1)', judgment: 'PASS', excerpt: null, reason: null },
  { knowledgePointId: 'kp-data', code: 'DATA', name: 'Dẫn số liệu', judgment: 'NOT_ASSESSED', excerpt: null, reason: null },
]
const practised = (knowledgePointId: string, extra: Partial<PracticeSince> = {}): PracticeSince => ({
  knowledgePointId, attempts: 2, lastAttemptId: '6f1c2f0e-1111-4c1c-9a1a-000000000001', lastSubmittedAt: '2026-11-15T08:00:00Z',
  lastCorrectCount: 7, lastTotalCount: 10, lastPassed: true, ...extra,
})

function renderSteps(props: Partial<ComponentProps<typeof WritingNextSteps>>) {
  return render(
    <MemoryRouter>
      <WritingNextSteps backTo="/practice/writing/submissions/s-1/result" judgments={undefined} points={[]} {...props} />
    </MemoryRouter>,
  )
}

beforeEach(() => { practiceSince.mockReset() })

describe('WritingNextSteps', () => {
  it('renders nothing when there is nothing to study and nothing judged', () => {
    const { container } = renderSteps({})
    expect(container).toBeEmptyDOMElement()
  })

  it('lists the failed point of the question once, before the weak criteria, in numbered order', () => {
    renderSteps({ judgments, points: [ta, lr, failed, aiNote], onPractise: vi.fn() })
    expect(screen.getByRole('heading', { name: 'Nên học gì tiếp' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByRole('heading', { name: 'Mô tả biểu đồ (Task 1)' })).toBeInTheDocument()
    expect(within(items[1]).getByRole('heading', { name: 'Hoàn thành yêu cầu Task 1 (TA)' })).toBeInTheDocument()
    expect(within(items[2]).getByRole('heading', { name: 'Vốn từ vựng (LR)' })).toBeInTheDocument()
    expect(screen.getAllByText('Mô tả biểu đồ (Task 1)')).toHaveLength(1)
  })

  it('shows the sentence and the reason of a failed point, and a criterion with its band and the AI advice', () => {
    renderSteps({ judgments, points: [ta, failed, aiNote] })
    const failedItem = screen.getByRole('heading', { name: 'Mô tả biểu đồ (Task 1)' }).closest('li')!
    expect(within(failedItem).getByText('Overall, the young people is going library.').tagName).toBe('Q')
    expect(within(failedItem).getByText('Nêu sai xu hướng chính của biểu đồ.')).toBeInTheDocument()
    const criterionItem = screen.getByRole('heading', { name: 'Hoàn thành yêu cầu Task 1 (TA)' }).closest('li')!
    expect(within(criterionItem).getByText('Task Achievement · band 3.0')).toBeInTheDocument()
    expect(within(criterionItem).getByText('Luyện đọc bảng và viết overview đúng xu hướng chính.')).toBeInTheDocument()
    expect(screen.queryByText(/select and compare the key features/)).not.toBeInTheDocument()
  })

  it('folds the passed and unjudged points of the question into one line', async () => {
    renderSteps({ judgments, points: [failed] })
    const summary = screen.getByText('Các điểm kiến thức khác của đề (2)')
    expect(summary.closest('details')).not.toHaveAttribute('open')
    await userEvent.click(summary)
    expect(screen.getByText('Từ vựng mô tả xu hướng (Task 1)', { exact: false })).toBeVisible()
    expect(screen.getByText('Dẫn số liệu', { exact: false })).toBeVisible()
  })

  it('says nothing needs more practice when every point of the question is settled', () => {
    renderSteps({ judgments: [judgments[1]] })
    expect(screen.getByText('Bài này không có điểm nào cần luyện thêm.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('starts practice on the knowledge point of a step', async () => {
    const onPractise = vi.fn().mockResolvedValue(undefined)
    renderSteps({ points: [failed], onPractise })
    await userEvent.click(screen.getByRole('button', { name: 'Luyện tập Mô tả biểu đồ (Task 1)' }))
    expect(onPractise).toHaveBeenCalledExactlyOnceWith(failed)
  })

  it('has no practice button for a failed point without a practice set, nor without a callback', () => {
    const { unmount } = renderSteps({ points: [{ ...failed, practiceKnowledgePointId: null }], onPractise: vi.fn() })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    unmount()
    renderSteps({ points: [ta] })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows a refusal under its own step and allows a retry', async () => {
    const onPractise = vi.fn().mockRejectedValueOnce(new ApiError(409, 'FREE_PRACTICE_EXHAUSTED', 'exhausted')).mockResolvedValueOnce(undefined)
    renderSteps({ points: [ta, lr], onPractise })
    const button = screen.getByRole('button', { name: 'Luyện tập Hoàn thành yêu cầu Task 1 (TA)' })
    await userEvent.click(button)
    expect(await within(button.closest('li')!).findByRole('alert')).toHaveTextContent('Đã hết bộ luyện tự do')
    expect(within(screen.getByRole('heading', { name: 'Vốn từ vựng (LR)' }).closest('li')!).queryByRole('alert')).not.toBeInTheDocument()
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  describe('what was practised since the essay', () => {
    it('asks for the practice targets of the steps and marks each step practised or not', async () => {
      practiceSince.mockResolvedValue([practised('kp-chart')])
      renderSteps({ submissionId: 's-1', judgments, points: [failed, ta, aiNote], onPractise: vi.fn() })

      const failedItem = (await screen.findByText(/Đã luyện 2 lần sau bài này/)).closest('li')!
      expect(practiceSince).toHaveBeenCalledWith('s-1', ['kp-chart', 'kp-ta'], expect.anything())
      expect(within(failedItem).getByText(/lần gần nhất · 7\/10 câu, đạt/)).toBeInTheDocument()
      expect(within(failedItem).getByRole('link', { name: 'Xem lần gần nhất' }))
        .toHaveAttribute('href', '/learn/practice/6f1c2f0e-1111-4c1c-9a1a-000000000001')
      expect(within(failedItem).getByRole('button', { name: 'Luyện lại Mô tả biểu đồ (Task 1)' })).toBeInTheDocument()

      const taItem = screen.getByRole('heading', { name: 'Hoàn thành yêu cầu Task 1 (TA)' }).closest('li')!
      expect(within(taItem).getByText('Chưa luyện sau bài này')).toBeInTheDocument()
      expect(within(taItem).getByRole('button', { name: 'Luyện tập Hoàn thành yêu cầu Task 1 (TA)' })).toBeInTheDocument()

      expect(screen.getByText('1/2')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Xem tất cả lần luyện' })).toHaveAttribute('href', '/submission-history?tab=knowledge')
    })

    it('says nothing about practice while it is unknown or when it cannot be read', async () => {
      let refuse!: (reason: Error) => void
      practiceSince.mockImplementation(() => new Promise((_, reject) => { refuse = reject }))
      renderSteps({ submissionId: 's-1', points: [failed], onPractise: vi.fn() })

      expect(practiceSince).toHaveBeenCalledOnce()
      expect(screen.queryByText(/luyện sau bài này/)).not.toBeInTheDocument()
      await act(async () => { refuse(new Error('down')) })
      expect(screen.queryByText(/luyện sau bài này/)).not.toBeInTheDocument()
      expect(screen.queryByText(/luyện sau bài này/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Luyện tập Mô tả biểu đồ (Task 1)' })).toBeInTheDocument()
    })

    it('does not ask without an essay or without anything to practise', () => {
      renderSteps({ points: [failed] })
      renderSteps({ submissionId: 's-1', points: [aiNote] })
      expect(practiceSince).not.toHaveBeenCalled()
    })
  })
})
