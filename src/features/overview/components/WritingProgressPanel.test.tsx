import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { writingProgressApi, type WritingProgress, type WritingTaskProgress } from '../api/writingProgressApi'
import { WritingProgressPanel } from './WritingProgressPanel'

const session = vi.hoisted(() => ({ isLoggedIn: true, email: 'learner@example.test' }))
vi.mock('@/features/auth/authSession', () => ({ useAuthSession: () => session }))
vi.mock('../api/writingProgressApi', () => ({ writingProgressApi: { get: vi.fn() } }))

const point = (id: string, day: number, band: number, promptVersion = 'writing-rubric@v1+tplv1') => ({
  submissionId: id,
  source: 'LESSON',
  gradedAt: `2026-11-0${day}T10:00:00Z`,
  overallBand: band,
  criteria: { TR: band, CC: band, LR: band, GRA: band },
  promptVersion,
})

function task(points: ReturnType<typeof point>[], overrides: Partial<WritingTaskProgress> = {}): WritingTaskProgress {
  return {
    task: 'TASK_2',
    points,
    recurringErrors: [],
    fixedErrors: [],
    insufficient: points.length < 3,
    ...overrides,
  }
}

function respond(block: WritingTaskProgress) {
  const body: WritingProgress = { tasks: [block] }
  vi.mocked(writingProgressApi.get).mockResolvedValue(body)
}

function mount() {
  return render(<MemoryRouter><WritingProgressPanel /></MemoryRouter>)
}

describe('WritingProgressPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    session.isLoggedIn = true
  })

  it('draws the trend, the recurring errors and a practice button for three or more essays', async () => {
    respond(task([point('a', 1, 5), point('b', 2, 5.5), point('c', 3, 6, 'writing-rubric@v2+tplv1')], {
      recurringErrors: [{
        errorCode: 'TENSE', errorName: 'Tense', fixHint: 'Use the past tense for finished events',
        practiceKnowledgePointId: 'kp-1', essaysWithError: 2, essaysTotal: 3, lastSeenAt: '2026-11-03T10:00:00Z',
      }],
    }))

    mount()

    expect(await screen.findByRole('img', { name: /Band tổng ước tính qua 3 bài/ })).toBeInTheDocument()
    expect(screen.getByText('Tense')).toBeInTheDocument()
    expect(screen.getByText('2/3 bài')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Luyện lỗi này' })).toBeInTheDocument()
  })

  it('hides the practice button when the error has no practice set', async () => {
    respond(task([point('a', 1, 5), point('b', 2, 5), point('c', 3, 5)], {
      recurringErrors: [{
        errorCode: 'ARTICLE', errorName: 'Article', fixHint: 'Add a or an', practiceKnowledgePointId: null,
        essaysWithError: 1, essaysTotal: 3, lastSeenAt: '2026-11-03T10:00:00Z',
      }],
    }))

    mount()

    await screen.findByText('Article')
    expect(screen.queryByRole('button', { name: 'Luyện lỗi này' })).not.toBeInTheDocument()
  })

  it('shows the scores as a list and asks for more essays when there are fewer than three', async () => {
    respond(task([point('a', 1, 5), point('b', 2, 5.5)]))

    mount()

    expect(await screen.findByText(/Cần thêm 1 bài/)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Band tổng/ })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Điểm từng bài' })).toBeInTheDocument()
  })

  it('says so when no essay has been graded yet', async () => {
    respond(task([]))

    mount()

    expect(await screen.findByText(/Chưa có bài Writing nào được chấm/)).toBeInTheDocument()
    await waitFor(() => expect(writingProgressApi.get).toHaveBeenCalledWith('TASK_2', expect.any(AbortSignal)))
  })
})
