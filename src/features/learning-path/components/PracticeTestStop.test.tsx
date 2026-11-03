import { fireEvent, render, screen, waitFor } from '@/test/render'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, learningApi } from '../api'
import { afterTopicLabel } from '../lib/courseSkills'
import { usePracticeTests } from '../lib/usePracticeTests'
import type { PracticeTestMilestone, TopicSummary } from '~types/learningPath'
import { PracticeTestStop } from './PracticeTestStop'

const milestone = (overrides: Partial<PracticeTestMilestone> = {}): PracticeTestMilestone => ({
  packageId: 'pkg-1', packageVersionId: 'ver-1', code: 'PT-1', title: 'Đề luyện giữa khóa', afterTopicSequence: 2,
  status: 'LOCKED', percent: null, ...overrides,
})

const topics = ['Chặng một', 'Chặng hai', 'Chặng ba'].map((title, index): TopicSummary => ({
  id: `t${index + 1}`, course: null, code: `t${index + 1}`, title, description: '', sequenceOrder: index + 1, status: 'LOCKED',
  completedLessons: 0, totalLessons: 4, lockedReason: null, skill: 'READING',
}))

function Where() {
  const location = useLocation()
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>
}

/** The page's wiring in small: the hook that loads and starts the tests, and a stop for each one. */
function Tests() {
  const tests = usePracticeTests('course-1', topics)
  return (
    <ol>
      {tests.milestones.map((row, index) => (
        <PracticeTestStop
          after={afterTopicLabel(topics, row)}
          index={index}
          key={row.packageId}
          milestone={row}
          onStart={(m) => void tests.start(m)}
          startingId={tests.startingId}
        />
      ))}
    </ol>
  )
}

function renderIt() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<><Tests /><Where /></>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PracticeTestStop', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('draws nothing when the course has no practice-test milestone', async () => {
    const list = vi.spyOn(learningApi, 'listPracticeTests').mockResolvedValue([])
    renderIt()
    await waitFor(() => expect(list).toHaveBeenCalledWith('course-1'))
    expect(screen.queryByRole('heading', { name: /Đề luyện/ })).not.toBeInTheDocument()
  })

  it('draws nothing, without breaking the page, when the list cannot be read', async () => {
    const list = vi.spyOn(learningApi, 'listPracticeTests').mockRejectedValue(new ApiError(500, 'SERVER_ERROR', 'Lỗi'))
    renderIt()
    await waitFor(() => expect(list).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: /Đề luyện/ })).not.toBeInTheDocument()
  })

  it('names the chặng a locked milestone opens after and offers no way to start it', async () => {
    vi.spyOn(learningApi, 'listPracticeTests').mockResolvedValue([milestone()])
    renderIt()
    expect(await screen.findByText('Mở sau chặng “Chặng hai”')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Đề luyện giữa khóa' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows no number that could be read as a position inside a skill, even when the chặng has no known title', async () => {
    vi.spyOn(learningApi, 'listPracticeTests').mockResolvedValue([milestone({ afterTopicSequence: 9 })])
    renderIt()
    expect(await screen.findByText('Mở sau chặng thứ 9 của khóa')).toBeInTheDocument()
  })

  it('gives the test, builds the attempt and opens it as a practice test of the course', async () => {
    vi.spyOn(learningApi, 'listPracticeTests').mockResolvedValue([milestone({ status: 'AVAILABLE' })])
    const assign = vi.spyOn(learningApi, 'createPracticeTestAssignment')
      .mockResolvedValue({ assignmentId: 'a-1', courseId: 'course-1', packageVersionId: 'ver-9', packageCode: 'pkg-1' })
    const attempt = vi.spyOn(learningApi, 'createAttempt').mockResolvedValue({ id: 'attempt-7' } as never)
    renderIt()
    fireEvent.click(await screen.findByRole('button', { name: 'Làm đề' }))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/learn/tests/attempt-7?course=course-1&practice=1'))
    expect(assign).toHaveBeenCalledWith('course-1', 'pkg-1')
    expect(attempt).toHaveBeenCalledWith(expect.objectContaining({ packageVersionId: 'ver-9' }))
  })

  it('shows the first result of a finished test and still lets the learner retake it', async () => {
    vi.spyOn(learningApi, 'listPracticeTests').mockResolvedValue([milestone({ status: 'DONE', percent: 85 })])
    renderIt()
    expect(await screen.findByText('85%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Làm lại' })).toBeEnabled()
  })

  it('tells the learner which chặng to finish when the server says the test is still locked', async () => {
    const list = vi.spyOn(learningApi, 'listPracticeTests').mockResolvedValue([milestone({ status: 'AVAILABLE' })])
    vi.spyOn(learningApi, 'createPracticeTestAssignment')
      .mockRejectedValue(new ApiError(403, 'PRACTICE_TEST_LOCKED', 'Pass the milestone topic first'))
    renderIt()
    fireEvent.click(await screen.findByRole('button', { name: 'Làm đề' }))
    expect(await screen.findByText('Đề luyện chưa mở. Hoàn thành chặng “Chặng hai” trước.')).toBeInTheDocument()
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })
})
