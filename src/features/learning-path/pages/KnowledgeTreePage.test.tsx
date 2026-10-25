import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TreePoint } from '~types/learningPath'
import { learningApi } from '../api'
import { KnowledgeTreePage } from './KnowledgeTreePage'

vi.mock('../api', async () => ({
  ...await import('../api/apiError'),
  learningApi: { getLearnerTree: vi.fn(), listCourses: vi.fn(), getHearts: vi.fn(), startFreePractice: vi.fn() },
}))

const base: TreePoint = {
  knowledgePointId: 'main', code: 'R55_MAIN', name: 'Nắm ý chính', skill: 'READING', kind: null,
  cefrLevel: 'B1', canDo: null, mastery: .8, tier: 'MAINTAIN', evidenceCount: 8, nextReviewAt: null,
  prerequisiteIds: [], practiceAvailable: true,
}
const points: TreePoint[] = [
  base,
  { ...base, knowledgePointId: 'detail', code: 'R55_DETAIL', name: 'Đọc chi tiết', mastery: .3, tier: 'PRIORITY', prerequisiteIds: ['main'] },
  { ...base, knowledgePointId: 'listen', code: 'L55_SOUND', name: 'Nhận diện âm', skill: 'LISTENING', mastery: null, tier: null, evidenceCount: 0 },
  { ...base, knowledgePointId: 'other', code: 'OTHER_POINT', name: 'Kiến thức bổ trợ', skill: null, practiceAvailable: false },
]

function PracticeDestination() {
  const { state } = useLocation()
  return <p>Đã mở bộ: {state?.freePractice?.pointName}</p>
}

function renderTree() {
  return render(
    <MemoryRouter initialEntries={['/learn/courses/course-1/tree']}>
      <Routes>
        <Route path="/learn/courses/:courseId/tree" element={<KnowledgeTreePage />} />
        <Route path="/learn/practice/:attemptId" element={<PracticeDestination />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(learningApi.getLearnerTree).mockResolvedValue({ courseId: 'course-1', knowledgePoints: points })
  vi.mocked(learningApi.listCourses).mockResolvedValue([{ id: 'course-1', code: 'IELTS55', title: 'IELTS 5.5', bandLevel: 5.5, topicCount: 3, passedTopicCount: 0, completedLessons: 0, totalLessons: 6, lastStudiedAt: null, recommended: true, testStatus: 'NONE' }])
  vi.mocked(learningApi.getHearts).mockResolvedValue({ hearts: 3, maxHearts: 5, nextHeartAt: null, refillCost: 5 })
  vi.mocked(learningApi.startFreePractice).mockResolvedValue({ attemptId: 'attempt-1', packageId: 'package-1', packageVersionId: 'version-1', passage: null, audio: null, questions: [], essays: [] })
})

describe('KnowledgeTreePage error traps', () => {
  const errorTraps: NonNullable<TreePoint['errorTraps']> = [
    { knowledgePointId: 'trap-1', code: 'TFNG_NG_AS_FALSE', name: 'Chọn False khi thông tin không được nêu', tier: 'PRIORITY', mastery: .45, evidenceCount: 5 },
    { knowledgePointId: 'trap-2', code: 'TFNG_FALSE_AS_NG', name: 'Chọn Not Given khi bài đã nói ngược lại', tier: 'MAINTAIN', mastery: .9, evidenceCount: 4 },
  ]

  it('lists the error traps a point has, with their mastery, under that point only', async () => {
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1', knowledgePoints: [{ ...base, errorTraps }, points[1]],
    })
    renderTree()

    const reading = await screen.findByRole('list', { name: 'Điểm kiến thức Reading' })
    const main = within(reading).getByRole('heading', { name: 'Nắm ý chính', level: 4 }).closest('li') as HTMLElement
    const traps = within(main).getByRole('list', { name: 'Lỗi hay gặp' })
    expect(within(traps).getAllByRole('listitem')).toHaveLength(2)
    expect(traps).toHaveTextContent('Chọn False khi thông tin không được nêu')
    expect(traps).toHaveTextContent('45%')
    expect(traps).toHaveTextContent('5 lượt làm')

    const detail = within(reading).getByRole('heading', { name: 'Đọc chi tiết', level: 4 }).closest('li') as HTMLElement
    expect(within(detail).queryByRole('list', { name: 'Lỗi hay gặp' })).not.toBeInTheDocument()
  })

  it('shows no error list when the backend sends none or an empty list', async () => {
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1', knowledgePoints: [{ ...base, errorTraps: [] }, points[1]],
    })
    renderTree()

    await screen.findByRole('region', { name: 'Sơ đồ cây kiến thức' })
    expect(screen.queryByRole('list', { name: 'Lỗi hay gặp' })).not.toBeInTheDocument()
  })
})

describe('KnowledgeTreePage', () => {
  it('groups every real point under its skill and preserves mastery and prerequisites', async () => {
    renderTree()
    const diagram = await screen.findByRole('region', { name: 'Sơ đồ cây kiến thức' })
    expect(within(diagram).getByText('IELTS 5.5')).toBeInTheDocument()
    expect(within(diagram).getByText('3 nhánh kỹ năng · 4 điểm kiến thức')).toBeInTheDocument()
    const reading = within(diagram).getByRole('list', { name: 'Điểm kiến thức Reading' })
    expect(within(reading).getByRole('heading', { name: 'Nắm ý chính', level: 4 })).toBeInTheDocument()
    expect(within(reading).getByText('Mức nắm 80%')).toBeInTheDocument()
    expect(within(reading).getByText('Xây trên: Nắm ý chính')).toBeInTheDocument()
    expect(within(diagram).getByRole('list', { name: 'Điểm kiến thức Khác' })).toHaveTextContent('Kiến thức bổ trợ')
    for (const point of points) expect(within(diagram).getAllByRole('heading', { name: point.name })).toHaveLength(1)
  })

  it('filters connected branches and lets the learner collapse a skill', async () => {
    const user = userEvent.setup()
    renderTree()
    await screen.findByRole('region', { name: 'Sơ đồ cây kiến thức' })
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    expect(screen.getByText('1 nhánh kỹ năng · 2 điểm kiến thức')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Nhận diện âm' })).not.toBeInTheDocument()
    const summary = screen.getByRole('heading', { name: /^Reading/, level: 3 }).closest('summary')!
    await user.click(summary)
    expect(summary.closest('details')).not.toHaveAttribute('open')
    await user.click(summary)
    expect(summary.closest('details')).toHaveAttribute('open')
    await user.click(screen.getByRole('button', { name: 'Tất cả' }))
    expect(screen.getByRole('heading', { name: 'Nhận diện âm' })).toBeInTheDocument()
  })

  it('keeps practice disabled when the learner has no hearts', async () => {
    vi.mocked(learningApi.getHearts).mockResolvedValue({ hearts: 0, maxHearts: 5, nextHeartAt: null, refillCost: 5 })
    renderTree()
    await screen.findByRole('region', { name: 'Sơ đồ cây kiến thức' })
    for (const button of screen.getAllByRole('button', { name: 'Luyện' })) expect(button).toBeDisabled()
    expect(learningApi.startFreePractice).not.toHaveBeenCalled()
  })

  it('opens practice from a leaf and keeps an unavailable point disabled', async () => {
    renderTree()
    await screen.findByRole('region', { name: 'Sơ đồ cây kiến thức' })
    const unavailable = screen.getByRole('heading', { name: 'Kiến thức bổ trợ' }).closest('li')!
    expect(within(unavailable).getByRole('button', { name: 'Luyện' })).toBeDisabled()
    const point = screen.getByRole('heading', { name: 'Nắm ý chính' }).closest('li')!
    fireEvent.click(within(point).getByRole('button', { name: 'Luyện' }))
    expect(await screen.findByText('Đã mở bộ: Nắm ý chính')).toBeInTheDocument()
    expect(learningApi.startFreePractice).toHaveBeenCalledExactlyOnceWith('main')
  })

  it('keeps an empty course out of the diagram', async () => {
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({ courseId: 'course-1', knowledgePoints: [] })
    renderTree()
    expect(await screen.findByText('Khóa này chưa có điểm kiến thức nào.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Sơ đồ cây kiến thức' })).not.toBeInTheDocument())
  })
})
