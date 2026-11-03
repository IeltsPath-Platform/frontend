import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@/test/render'
import type { LessonSummary, PracticeTestMilestone, TopicSummary } from '~types/learningPath'
import { CourseSkillBoard } from './CourseSkillBoard'

const { getTopicLessons } = vi.hoisted(() => ({ getTopicLessons: vi.fn() }))
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  learningApi: { getTopicLessons },
}))
vi.mock('./TopicLessonsPanel', () => ({ TopicLessonsPanel: ({ topicId }: { topicId: string }) => <div data-testid={`lessons-${topicId}`} /> }))

function topic(id: string, skill: string, sequenceOrder: number, over: Partial<TopicSummary> = {}): TopicSummary {
  return {
    id, course: null, code: id, title: `Chặng ${id}`, description: '', sequenceOrder, status: 'LOCKED',
    completedLessons: 0, totalLessons: 6, lockedReason: null, skill, ...over,
  }
}

function lesson(id: string, sortOrder: number, status: LessonSummary['status']): LessonSummary {
  return { id, title: id, sortOrder, status, estimatedMinutes: 10, lockedReason: null }
}

const topics = [
  topic('r1', 'READING', 1, { status: 'PASSED', completedLessons: 6 }),
  topic('r2', 'READING', 2, { status: 'IN_PROGRESS', completedLessons: 2 }),
  topic('r3', 'READING', 3),
  topic('l1', 'LISTENING', 4, { status: 'IN_PROGRESS' }),
]

function milestone(packageId: string, afterTopicSequence: number): PracticeTestMilestone {
  return {
    packageId, packageVersionId: `${packageId}-v`, code: packageId, title: `Đề ${packageId}`, afterTopicSequence,
    status: 'LOCKED', percent: null,
  }
}

function renderBoard(path = '/learn/courses/c1', tests: PracticeTestMilestone[] = []) {
  const practiceTests = { milestones: tests, startingId: null, start: vi.fn() }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/learn/courses/:courseId" element={<CourseSkillBoard course={null} onUnlocked={vi.fn()} practiceTests={practiceTests} topics={topics} />} />
        <Route path="/learn/lessons/:lessonId" element={<p>Trang bài học</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CourseSkillBoard', () => {
  beforeEach(() => {
    getTopicLessons.mockReset()
  })

  it('opens the chặng the learner is on so its lessons are in view', () => {
    renderBoard()
    expect(screen.getByTestId('lessons-r2')).toBeInTheDocument()
    expect(screen.queryByTestId('lessons-r1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('lessons-r3')).not.toBeInTheDocument()
  })

  it('opens the chặng being studied when the learner moves to another skill', () => {
    renderBoard()
    fireEvent.click(screen.getByRole('button', { name: /^Listening/ }))
    expect(screen.getByTestId('lessons-l1')).toBeInTheDocument()
  })

  it('shows how many lessons each chặng holds', () => {
    renderBoard()
    expect(screen.getAllByText(/Chặng 01 · 6 bài/).length).toBeGreaterThan(0)
  })

  it('goes straight to the next open lesson of the chặng being studied', async () => {
    getTopicLessons.mockResolvedValue({
      lessons: [lesson('b3', 3, 'LOCKED'), lesson('b2', 2, 'AVAILABLE'), lesson('b1', 1, 'COMPLETED')],
    })
    renderBoard()
    fireEvent.click(screen.getByRole('button', { name: /Học tiếp/ }))
    expect(await screen.findByText('Trang bài học')).toBeInTheDocument()
    expect(getTopicLessons).toHaveBeenCalledWith('r2')
  })

  it('offers to start when the skill has not been touched', () => {
    renderBoard('/learn/courses/c1?skill=LISTENING')
    expect(screen.getByRole('button', { name: /Bắt đầu học/ })).toBeInTheDocument()
  })

  it('draws a practice test inside the skill of the chặng it opens after, straight after that chặng', () => {
    // Counted across the course: r1, r2, r3, l1. Test "a" opens after r2, test "b" after l1.
    renderBoard('/learn/courses/c1?skill=READING', [milestone('a', 2), milestone('b', 4)])
    const route = screen.getByRole('list', { name: 'Các chặng Reading' })
    const items = Array.from(route.children).map((item) => item.textContent ?? '')
    expect(items).toHaveLength(4)
    expect(items[1]).toContain('Chặng r2')
    expect(items[2]).toContain('Đề a')
    expect(items[3]).toContain('Chặng r3')
    expect(screen.queryByText('Đề b')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Listening/ }))
    const listening = screen.getByRole('list', { name: 'Các chặng Listening' })
    expect(Array.from(listening.children).map((item) => item.textContent ?? '')[1]).toContain('Đề b')
  })

  it('keeps a practice test whose chặng is unknown at the end of the route so it is not lost', () => {
    renderBoard('/learn/courses/c1', [milestone('z', 9)])
    const end = screen.getByRole('list', { name: 'Về đích' })
    expect(end).toHaveTextContent('Đề z')
    expect(end).toHaveTextContent('Mở sau chặng thứ 9 của khóa')
  })

  it('stays on the page and opens the chặng when no lesson is open', async () => {
    getTopicLessons.mockResolvedValue({ lessons: [lesson('b1', 1, 'COMPLETED')] })
    renderBoard()
    fireEvent.click(screen.getByRole('button', { name: /Học tiếp/ }))
    await waitFor(() => expect(getTopicLessons).toHaveBeenCalled())
    expect(screen.queryByText('Trang bài học')).not.toBeInTheDocument()
    expect(screen.getByTestId('lessons-r2')).toBeInTheDocument()
  })
})
