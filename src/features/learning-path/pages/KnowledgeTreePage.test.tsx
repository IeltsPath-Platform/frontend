import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

/** A screen too narrow for the chart: the points are listed step by step instead. */
function useNarrowScreen() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {},
  }))
}

/** The chart and its panel are found by what they are called, so a test reads like the learner's view. */
const chart = () => screen.findByRole('region', { name: /^Sơ đồ cây kiến thức/ })
const box = (within_: HTMLElement, name: RegExp) => within(within_).getByRole('button', { name })
const panel = () => screen.getByRole('complementary', { name: 'Chi tiết điểm kiến thức' })

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(learningApi.getLearnerTree).mockResolvedValue({ courseId: 'course-1', knowledgePoints: points })
  vi.mocked(learningApi.listCourses).mockResolvedValue([{ id: 'course-1', code: 'IELTS55', title: 'IELTS 5.5', bandLevel: 5.5, topicCount: 3, passedTopicCount: 0, completedLessons: 0, totalLessons: 6, lastStudiedAt: null, recommended: true, testStatus: 'NONE' }])
  vi.mocked(learningApi.getHearts).mockResolvedValue({ hearts: 3, maxHearts: 5, nextHeartAt: null, refillCost: 5 })
  vi.mocked(learningApi.startFreePractice).mockResolvedValue({ attemptId: 'attempt-1', packageId: 'package-1', packageVersionId: 'version-1', passage: null, audio: null, questions: [], essays: [] })
})

afterEach(() => { vi.unstubAllGlobals() })

describe('KnowledgeTreePage chart', () => {
  it('draws one skill at a time as a chart hanging from the course, starting on the first skill', async () => {
    renderTree()
    const diagram = await chart()
    // The course is the root the tree grows from, named with the skill drawn.
    expect(screen.getByText('IELTS 5.5', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Listening', { selector: 'small' })).toBeInTheDocument()
    expect(box(diagram, /Nhận diện âm/)).toBeInTheDocument()
    expect(within(diagram).queryByRole('button', { name: /Nắm ý chính/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Listening' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('lays the order of learning out left to right: a column for each step, numbered on each box', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    const diagram = await chart()
    expect(within(diagram).getByText('Nền tảng')).toBeInTheDocument()
    expect(within(diagram).getByText('Bước 2')).toBeInTheDocument()
    expect(box(diagram, /Nắm ý chính/)).toHaveTextContent('Học thứ 1')
    expect(box(diagram, /Đọc chi tiết/)).toHaveTextContent('Học thứ 2')
  })

  it('starts on the point that needs work and shows what it builds on and what builds on it', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    const diagram = await chart()
    expect(box(diagram, /Đọc chi tiết/)).toHaveAttribute('aria-pressed', 'true')
    expect(within(panel()).getByRole('heading', { name: 'Đọc chi tiết', level: 3 })).toBeInTheDocument()
    const before = within(panel()).getByRole('region', { name: 'Xây trên (học trước)' })
    expect(within(before).getByRole('button', { name: 'Nắm ý chính' })).toBeInTheDocument()

    // Following the link moves the selection to the point it names, where the other way is now shown.
    await user.click(within(before).getByRole('button', { name: 'Nắm ý chính' }))
    expect(box(diagram, /Nắm ý chính/)).toHaveAttribute('aria-pressed', 'true')
    expect(within(panel()).getByRole('heading', { name: 'Nắm ý chính', level: 3 })).toBeInTheDocument()
    const after = within(panel()).getByRole('region', { name: 'Mở ra (học sau)' })
    expect(within(after).getByRole('button', { name: 'Đọc chi tiết' })).toBeInTheDocument()
    expect(within(panel()).getByText('Điểm nền tảng, không cần học gì trước.')).toBeInTheDocument()
  })

  it('selects a point from the chart and shows its mastery', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    await user.click(box(await chart(), /Nắm ý chính/))
    expect(within(panel()).getByRole('meter', { name: 'Mức nắm 80%' })).toBeInTheDocument()
    expect(within(panel()).getByText('Vững')).toBeInTheDocument()
  })

  it('lists the error traps a point has, with their mastery, under that point only', async () => {
    const user = userEvent.setup()
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: [{
        ...base,
        errorTraps: [
          { knowledgePointId: 'trap-1', code: 'TFNG_NG_AS_FALSE', name: 'Chọn False khi thông tin không được nêu', tier: 'PRIORITY', mastery: .45, evidenceCount: 5 },
          { knowledgePointId: 'trap-2', code: 'TFNG_FALSE_AS_NG', name: 'Chọn Not Given khi bài đã nói ngược lại', tier: 'MAINTAIN', mastery: .9, evidenceCount: 4 },
        ],
      }, points[1]!],
    })
    renderTree()
    await chart()
    await user.click(box(await chart(), /Nắm ý chính/))
    const traps = within(panel()).getByRole('list', { name: 'Lỗi hay gặp' })
    expect(within(traps).getAllByRole('listitem')).toHaveLength(2)
    expect(traps).toHaveTextContent('Chọn False khi thông tin không được nêu')
    expect(traps).toHaveTextContent('45%')
    expect(traps).toHaveTextContent('5 lượt làm')
    await user.click(box(await chart(), /Đọc chi tiết/))
    expect(within(panel()).queryByRole('list', { name: 'Lỗi hay gặp' })).not.toBeInTheDocument()
  })

  it('shows every skill on request, one chart each, and counts the points of each mastery group', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Tất cả' }))
    await screen.findAllByRole('region', { name: /^Sơ đồ cây kiến thức/ })
    const regions = screen.getAllByRole('region', { name: /^Sơ đồ cây kiến thức/ })
    expect(regions.map((region) => region.getAttribute('aria-label'))).toEqual([
      'Sơ đồ cây kiến thức Listening', 'Sơ đồ cây kiến thức Reading', 'Sơ đồ cây kiến thức Khác',
    ])
    for (const point of points) {
      expect(regions.flatMap((region) => within(region).queryAllByRole('button', { name: new RegExp(point.name) }))).toHaveLength(1)
    }
    const legend = screen.getByRole('list', { name: 'Mức nắm của các điểm' })
    // main and other are Vững, detail needs priority, listen has no tier yet.
    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent))
      .toEqual(['Vững 2', 'Đang củng cố 0', 'Cần ưu tiên 1', 'Chưa học 1'])
  })

  it('keeps practice disabled when the learner has no hearts', async () => {
    vi.mocked(learningApi.getHearts).mockResolvedValue({ hearts: 0, maxHearts: 5, nextHeartAt: null, refillCost: 5 })
    renderTree()
    await chart()
    expect(within(panel()).getByRole('button', { name: 'Luyện' })).toBeDisabled()
    expect(within(panel()).getByText('Hết tim, hồi tim để luyện.')).toBeInTheDocument()
    expect(learningApi.startFreePractice).not.toHaveBeenCalled()
  })

  it('opens practice from the panel and keeps an unavailable point disabled', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Khác' }))
    expect(within(panel()).getByRole('heading', { name: 'Kiến thức bổ trợ' })).toBeInTheDocument()
    expect(within(panel()).getByRole('button', { name: 'Luyện' })).toBeDisabled()
    expect(within(panel()).getByText('Đã hết bộ luyện tự do, các bộ còn lại dành cho bài ôn.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reading' }))
    await user.click(box(await chart(), /Nắm ý chính/))
    fireEvent.click(within(panel()).getByRole('button', { name: 'Luyện' }))
    expect(await screen.findByText('Đã mở bộ: Nắm ý chính')).toBeInTheDocument()
    expect(learningApi.startFreePractice).toHaveBeenCalledExactlyOnceWith('main')
  })

  it('marks a paywalled point separately and opens the unlock dialog instead of practice', async () => {
    const locked = { ...base, knowledgePointId: 'locked', code: 'R55_LOCKED', name: 'Bài đọc tính phí', locked: true, practiceAvailable: false }
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({ courseId: 'course-1', knowledgePoints: [locked] })
    renderTree()
    const diagram = await chart()
    expect(box(diagram, /Bài đọc tính phí/)).toHaveAttribute('data-locked', 'true')
    expect(within(panel()).queryByRole('button', { name: 'Luyện' })).not.toBeInTheDocument()
    fireEvent.click(within(panel()).getByRole('button', { name: 'Mở khóa' }))
    expect(await screen.findByRole('dialog', { name: 'Mở khóa Reading' })).toBeInTheDocument()
  })

  it('keeps an empty course out of the diagram', async () => {
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({ courseId: 'course-1', knowledgePoints: [] })
    renderTree()
    expect(await screen.findByText('Khóa này chưa có điểm kiến thức nào.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Sơ đồ cây kiến thức' })).not.toBeInTheDocument())
  })
})

describe('KnowledgeTreePage on a narrow screen', () => {
  beforeEach(useNarrowScreen)

  it('lists every skill, laid out as steps so a point sits below what it builds on', async () => {
    renderTree()
    await chart()
    expect(screen.getByText('3 nhánh kỹ năng · 4 điểm kiến thức')).toBeInTheDocument()
    const reading = screen.getByRole('list', { name: 'Điểm kiến thức Reading' })
    const first = within(reading).getByText('Bước 1 · Nền tảng').closest('li') as HTMLElement
    const second = within(reading).getByText('Bước 2').closest('li') as HTMLElement
    expect(within(first).getByRole('heading', { name: 'Nắm ý chính', level: 4 })).toBeInTheDocument()
    expect(within(second).getByRole('heading', { name: 'Đọc chi tiết', level: 4 })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Điểm kiến thức Khác' })).getByRole('heading', { name: 'Kiến thức bổ trợ' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Điểm kiến thức Listening' })).queryByText(/^Bước/)).not.toBeInTheDocument()
  })

  it('names what a point builds on on the row itself, and keeps the rest closed until the row is opened', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    const detail = screen.getByRole('heading', { name: 'Đọc chi tiết' }).closest('li') as HTMLElement
    expect(within(detail).getByText('Xây trên: Nắm ý chính')).toBeVisible()
    expect(within(detail).getByRole('meter', { name: 'Mức nắm 30%' })).toBeInTheDocument()
    const toggle = within(detail).getByRole('button', { name: 'Đọc chi tiết' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(detail).getByText('Điểm này còn yếu, nên luyện sớm.')).not.toBeVisible()
    await user.click(toggle)
    expect(within(detail).getByText('Điểm này còn yếu, nên luyện sớm.')).toBeVisible()
  })

  it('opens practice from a row and keeps an unavailable point disabled', async () => {
    renderTree()
    await chart()
    const unavailable = screen.getByRole('heading', { name: 'Kiến thức bổ trợ' }).closest('li')!
    expect(within(unavailable).getByRole('button', { name: 'Luyện' })).toBeDisabled()
    const point = screen.getByRole('heading', { name: 'Nắm ý chính' }).closest('li')!
    fireEvent.click(within(point).getByRole('button', { name: 'Luyện' }))
    expect(await screen.findByText('Đã mở bộ: Nắm ý chính')).toBeInTheDocument()
    expect(learningApi.startFreePractice).toHaveBeenCalledExactlyOnceWith('main')
  })

  it('filters to one skill and lets the learner collapse it', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    expect(screen.getByText('1 nhánh kỹ năng · 2 điểm kiến thức')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Nhận diện âm' })).not.toBeInTheDocument()
    const summary = screen.getByRole('heading', { name: /^Reading/, level: 3 }).closest('summary')!
    await user.click(summary)
    expect(summary.closest('details')).not.toHaveAttribute('open')
  })

  it('lists the error traps of a point once its row is opened', async () => {
    const user = userEvent.setup()
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: [{ ...base, errorTraps: [{ knowledgePointId: 'trap-1', code: 'T', name: 'Chọn False khi thông tin không được nêu', tier: 'PRIORITY', mastery: .45, evidenceCount: 5 }] }],
    })
    renderTree()
    await chart()
    const main = screen.getByRole('heading', { name: 'Nắm ý chính' }).closest('li') as HTMLElement
    expect(within(main).getByText('1 lỗi hay gặp')).toBeInTheDocument()
    expect(within(main).queryByRole('list', { name: 'Lỗi hay gặp' })).not.toBeInTheDocument()
    await user.click(within(main).getByRole('button', { name: 'Nắm ý chính' }))
    expect(within(main).getByRole('list', { name: 'Lỗi hay gặp' })).toHaveTextContent('45% · 5 lượt làm')
  })
})

describe('KnowledgeTreePage where a point is taught', () => {
  // scanning is taught in chặng 3 of Reading, yet matching (chặng 1) is said to build on it: the order the data contradicts.
  const scanning: TreePoint = {
    ...base, knowledgePointId: 'scan', code: 'TR_R_SCANNING', name: 'Tìm thông tin cụ thể', tier: null, mastery: null,
    topic: { topicId: 't3', name: 'Cây cối: Reading', position: 3 },
    lessons: [{ lessonId: 'l9', title: 'Cây trong thành phố', position: 1, topicId: 't3', topicName: 'Cây cối: Reading', topicPosition: 3 }],
  }
  const matching: TreePoint = {
    ...base, knowledgePointId: 'match', code: 'PR_MATCHING', name: 'Tìm đoạn chứa thông tin', tier: 'PRIORITY', mastery: .2,
    prerequisiteIds: ['scan'], topic: { topicId: 't1', name: 'Matching Information', position: 1 },
    lessons: [{ lessonId: 'l1', title: 'Quét đoạn tìm chi tiết', position: 1, topicId: 't1', topicName: 'Matching Information', topicPosition: 1 }],
  }

  beforeEach(() => {
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({ courseId: 'course-1', knowledgePoints: [scanning, matching] })
  })

  it('names the chặng on each box instead of the code', async () => {
    renderTree()
    const diagram = await chart()
    expect(box(diagram, /Tìm đoạn chứa thông tin/)).toHaveTextContent('Chặng 01')
    expect(box(diagram, /Tìm thông tin cụ thể/)).toHaveTextContent('Chặng 03')
  })

  it('links the lessons that teach the selected point, with their chặng', async () => {
    renderTree()
    await chart()
    const where = within(panel()).getByRole('region', { name: 'Học ở đâu' })
    const link = within(where).getByRole('link', { name: /Quét đoạn tìm chi tiết/ })
    expect(link).toHaveAttribute('href', '/learn/lessons/l1')
    expect(link).toHaveTextContent('Chặng 01 · Matching Information · Bài 1')
  })

  it('tags what a point builds on with its chặng, and marks it when that chặng comes later', async () => {
    renderTree()
    await chart()
    const before = within(panel()).getByRole('region', { name: 'Xây trên (học trước)' })
    const tag = within(before).getByText('Chặng 03')
    expect(tag).toHaveAttribute('data-out-of-order', 'true')
    expect(tag).toHaveAttribute('title', 'Điểm này được dạy ở chặng sau điểm đang chọn.')
  })

  it('does not mark a prerequisite taught in the same or an earlier chặng', async () => {
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: [{ ...scanning, topic: { topicId: 't1', name: 'Matching Information', position: 1 } }, matching],
    })
    renderTree()
    await chart()
    const before = within(panel()).getByRole('region', { name: 'Xây trên (học trước)' })
    expect(within(before).getByText('Chặng 01')).not.toHaveAttribute('data-out-of-order')
  })
})
