import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewBasket, TreePoint } from '~types/learningPath'
import { subscribeHeartsDepleted } from '@/components/owl-events'
import { learningApi } from '../api'
import { KnowledgeTreePage } from './KnowledgeTreePage'

vi.mock('../api', async () => ({
  ...await import('../api/apiError'),
  learningApi: { getLearnerTree: vi.fn(), listCourses: vi.fn(), getHearts: vi.fn(), startFreePractice: vi.fn(), getReviewBasket: vi.fn() },
}))

const EMPTY_BASKET: ReviewBasket = { required: [], consolidate: [], due: [], weak: [] }

/** A basket holding one blocking review of the given point, raised by the given lesson. */
function blockingReviewOf(knowledgePointId: string, lessonId: string | null = null): ReviewBasket {
  return { ...EMPTY_BASKET, required: [{ reviewId: 'review-1', knowledgePointId, code: 'CODE', name: 'Tên', lessonId, skill: null }] }
}

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
// A review is a button of the chart too (its name starts "Bài ôn"); the boxes of the points are the ones that do not.
const box = (within_: HTMLElement, name: RegExp) => {
  const found = within(within_).getAllByRole('button', { name }).filter((button) => !(button.getAttribute('aria-label') ?? '').startsWith('Bài ôn'))
  if (found.length !== 1) throw new Error(`Expected one box named ${name}, found ${found.length}`)
  return found[0]!
}
const reviewNode = (within_: HTMLElement, name: string) => within(within_).getByRole('button', { name })
const panel = () => screen.getByRole('complementary', { name: 'Chi tiết điểm kiến thức' })
const reviewPanel = () => screen.getByRole('complementary', { name: 'Chi tiết bài ôn' })

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(learningApi.getLearnerTree).mockResolvedValue({ courseId: 'course-1', knowledgePoints: points })
  vi.mocked(learningApi.listCourses).mockResolvedValue([{ id: 'course-1', code: 'IELTS55', title: 'IELTS 5.5', bandLevel: 5.5, topicCount: 3, passedTopicCount: 0, completedLessons: 0, totalLessons: 6, lastStudiedAt: null, recommended: true, testStatus: 'NONE' }])
  vi.mocked(learningApi.getHearts).mockResolvedValue({ hearts: 3, maxHearts: 5, nextHeartAt: null, refillCost: 5 })
  vi.mocked(learningApi.startFreePractice).mockResolvedValue({ attemptId: 'attempt-1', packageId: 'package-1', packageVersionId: 'version-1', passage: null, audio: null, questions: [], essays: [] })
  vi.mocked(learningApi.getReviewBasket).mockResolvedValue(EMPTY_BASKET)
})

afterEach(() => { vi.unstubAllGlobals() })

describe('KnowledgeTreePage chart', () => {
  it('draws one skill at a time as a chart hanging from the course, starting on the first skill', async () => {
    renderTree()
    const diagram = await chart()
    // The chart is named for the skill it draws; the page already says which course it is.
    expect(within(diagram).queryByText('IELTS 5.5')).not.toBeInTheDocument()
    expect(screen.getByText('Listening', { selector: 'strong' })).toBeInTheDocument()
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

  it('draws a line from each point to the point that builds on it', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    const diagram = await chart()
    expect(diagram.querySelectorAll('.react-flow__edge')).toHaveLength(1)
    expect(diagram.querySelector('.react-flow__edge path[d]')).toHaveAttribute('d', expect.stringMatching(/^M/))
  })

  it('tags a point that a paying course teaches in its free lessons with a small Free badge, on its box and in its panel', async () => {
    const user = userEvent.setup()
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: points.map((point) => ({ ...point, freePreview: point.name === 'Nắm ý chính' })),
    })
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    const diagram = await chart()
    expect(box(diagram, /Nắm ý chính/)).toHaveTextContent('Free')
    expect(box(diagram, /Đọc chi tiết/)).not.toHaveTextContent('Free')
    expect(within(panel()).queryByText('Free')).not.toBeInTheDocument()
    fireEvent.click(box(diagram, /Nắm ý chính/))
    expect(within(panel()).getByText('Free')).toBeInTheDocument()
  })

  it('opens on the point a blocking review holds the learner back on, without the review in its panel', async () => {
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: points.map((point) => point.knowledgePointId === 'detail'
        ? { ...point, lessons: [{ lessonId: 'lesson-3', title: 'Scanning', position: 3, topicId: 't2', topicName: 'Đọc hiểu', topicPosition: 2 }] }
        : point),
    })
    vi.mocked(learningApi.getReviewBasket).mockResolvedValue(blockingReviewOf('detail', 'lesson-3'))
    renderTree()

    // The chart turns to the skill of the review on its own, Reading rather than the first skill, and picks the point.
    await waitFor(() => expect(screen.getByRole('button', { name: /^Reading.*có bài ôn đang chặn$/ })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: 'Listening' })).toHaveAttribute('aria-pressed', 'false')
    const diagram = await chart()
    expect(box(diagram, /Đọc chi tiết/)).toHaveAttribute('aria-pressed', 'true')
    // The box keeps a red edge, and the review stands after it as a node of its own (see the tests below).
    expect(box(diagram, /Đọc chi tiết/)).toHaveAttribute('data-review', 'true')
    expect(box(diagram, /Đọc chi tiết/)).toHaveTextContent('Có bài ôn đang chặn tiến độ')
    expect(box(diagram, /Nắm ý chính/)).not.toHaveAttribute('data-review')

    // The point's panel is about the point: the review has its own node and its own panel.
    expect(within(panel()).getByRole('heading', { name: 'Đọc chi tiết', level: 3 })).toBeInTheDocument()
    expect(within(panel()).queryByRole('region', { name: 'Bài ôn đang chặn tiến độ' })).not.toBeInTheDocument()
    expect(within(panel()).queryByRole('link', { name: /Làm bài ôn/ })).not.toBeInTheDocument()
    fireEvent.click(box(diagram, /Nắm ý chính/))
    const after = within(panel()).getByRole('region', { name: 'Mở ra (học sau)' })
    expect(within(after).getByRole('button', { name: /Đọc chi tiết/ })).toHaveTextContent('Cần ôn')
  })

  it('draws the blocking review as a node of its own between its point and what builds on it, with the way into it', async () => {
    vi.mocked(learningApi.getReviewBasket).mockResolvedValue(blockingReviewOf('main'))
    renderTree()
    await waitFor(() => expect(screen.getByRole('button', { name: /^Reading.*có bài ôn đang chặn$/ })).toHaveAttribute('aria-pressed', 'true'))
    const diagram = await chart()

    const node = reviewNode(diagram, 'Bài ôn đang chặn tiến độ: Nắm ý chính')
    expect(node).toHaveTextContent('Bài ôn · chặn tiến độ')
    expect(node).toHaveTextContent('Ôn: Nắm ý chính')
    expect(within(diagram).getByRole('link', { name: 'Làm bài ôn: Nắm ý chính' })).toHaveAttribute('href', '/learn/reviews/review-1')
    // The learner finishes the review before going on: the line from the point ends at the review, and the line to what builds on
    // the point starts from it. No line joins the point straight to what builds on it.
    const lines = Array.from(diagram.querySelectorAll('.react-flow__edge')).map((edge) => edge.getAttribute('data-id'))
    expect(lines.sort()).toEqual(['main>review-review-1', 'review-review-1>detail'])
    // It is not a step of the skill: the boxes of the skill are still the two points.
    expect(within(diagram).getAllByRole('button', { name: /^(?!Bài ôn).*(Nắm ý chính|Đọc chi tiết)/ })).toHaveLength(2)
  })

  it('picks the review like a point and shows its own panel, with the point it follows and what it holds back', async () => {
    const user = userEvent.setup()
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: points.map((point) => point.knowledgePointId === 'main'
        ? { ...point, lessons: [{ lessonId: 'lesson-1', title: 'Skim a text', position: 1, topicId: 't1', topicName: 'Đọc hiểu', topicPosition: 1 }] }
        : point),
    })
    vi.mocked(learningApi.getReviewBasket).mockResolvedValue(blockingReviewOf('main', 'lesson-1'))
    renderTree()
    await waitFor(() => expect(screen.getByRole('button', { name: /^Reading.*có bài ôn đang chặn$/ })).toHaveAttribute('aria-pressed', 'true'))
    const diagram = await chart()

    fireEvent.click(reviewNode(diagram, 'Bài ôn đang chặn tiến độ: Nắm ý chính'))

    const review = reviewPanel()
    expect(reviewNode(diagram, 'Bài ôn đang chặn tiến độ: Nắm ý chính')).toHaveAttribute('aria-pressed', 'true')
    expect(box(diagram, /Đọc chi tiết/)).toHaveAttribute('aria-pressed', 'false')
    expect(within(review).getByRole('heading', { name: 'Ôn: Nắm ý chính', level: 3 })).toBeInTheDocument()
    expect(review).toHaveTextContent('Đang chặn tiến độ')
    expect(review).toHaveTextContent('Sinh ra từ bài “Skim a text” (Chặng 01, bài 1).')
    expect(within(review).getByRole('link', { name: /Làm bài ôn/ })).toHaveAttribute('href', '/learn/reviews/review-1')
    // The point the review follows, and what it holds back, are buttons that move the selection.
    const before = within(review).getByRole('region', { name: 'Xây trên (học trước)' })
    const after = within(review).getByRole('region', { name: 'Mở ra (học sau)' })
    expect(within(before).getByRole('button', { name: /Nắm ý chính/ })).toBeInTheDocument()
    await user.click(within(after).getByRole('button', { name: /Đọc chi tiết/ }))
    expect(within(panel()).getByRole('heading', { name: 'Đọc chi tiết', level: 3 })).toBeInTheDocument()
  })

  it('keeps a finished review on the map, in green, with how it went and a way to look at it again', async () => {
    const user = userEvent.setup()
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: points.map((point) => point.knowledgePointId === 'main'
        ? {
          ...point,
          blockingReview: {
            reviewId: 'review-7', status: 'DONE', lessonId: null, createdAt: '2026-11-10T08:00:00Z', doneAt: '2026-11-11T09:30:00Z',
            setsAnswered: 2, lastCorrect: 8, lastTotal: 10,
          },
        }
        : point),
    })
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    const diagram = await chart()

    // Nothing holds the learner back, yet the review is still there between its point and what builds on it.
    expect(screen.getByRole('button', { name: 'Reading' })).toHaveTextContent(/^Reading$/)
    const node = reviewNode(diagram, 'Bài ôn đã hoàn thành: Nắm ý chính')
    expect(node).toHaveTextContent('Bài ôn · đã hoàn thành')
    expect(within(diagram).getByRole('link', { name: 'Xem lại: Nắm ý chính' })).toHaveAttribute('href', '/learn/reviews/review-7')
    expect(box(diagram, /Nắm ý chính/)).not.toHaveAttribute('data-review')
    const lines = Array.from(diagram.querySelectorAll('.react-flow__edge')).map((edge) => edge.getAttribute('data-id'))
    expect(lines.sort()).toEqual(['main>review-review-7', 'review-review-7>detail'])

    fireEvent.click(node)
    const review = reviewPanel()
    expect(review).toHaveTextContent('Đã hoàn thành')
    expect(review).toHaveTextContent('Bạn đã hoàn thành bài ôn ngày')
    expect(review).toHaveTextContent('Đã làm 2 lượt. Lượt gần nhất: 8/10 câu đúng.')
    expect(within(review).getByRole('link', { name: /Xem lại bài ôn/ })).toHaveAttribute('href', '/learn/reviews/review-7')
  })

  it('shows a skipped review as quiet and says why it was skipped', async () => {
    const user = userEvent.setup()
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: points.map((point) => point.knowledgePointId === 'main'
        ? {
          ...point,
          blockingReview: {
            reviewId: 'review-8', status: 'SKIPPED', lessonId: null, createdAt: null, doneAt: null, setsAnswered: 0, lastCorrect: null, lastTotal: null,
          },
        }
        : point),
    })
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    const diagram = await chart()
    fireEvent.click(reviewNode(diagram, 'Bài ôn đã bỏ qua: Nắm ý chính'))
    expect(reviewPanel()).toHaveTextContent('không còn bộ đề ôn nào bạn chưa làm')
  })

  it('draws a review the system only suggested as a branch off its point: it blocks nothing, so nothing is rerouted or flagged', async () => {
    const user = userEvent.setup()
    vi.mocked(learningApi.getReviewBasket).mockResolvedValue({
      ...EMPTY_BASKET,
      weak: [{
        knowledgePointId: 'main', code: 'R55_MAIN', name: 'Nắm ý chính', skill: 'READING', tier: 'PRIORITY', mastery: 0.2, dueAt: null,
        reason: 'PRACTICE', hasUnrevealedSet: true, reviewId: 'review-s1',
      }],
    })
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    const diagram = await chart()

    const node = reviewNode(diagram, 'Bài ôn gợi ý, không bắt buộc: Nắm ý chính')
    expect(node).toHaveTextContent('Bài ôn · gợi ý')
    expect(within(diagram).getByRole('link', { name: 'Làm bài ôn: Nắm ý chính' })).toHaveAttribute('href', '/learn/reviews/review-s1')
    // The point keeps its own line to what builds on it, and gains a line to the suggestion.
    const lines = Array.from(diagram.querySelectorAll('.react-flow__edge')).map((edge) => edge.getAttribute('data-id'))
    expect(lines.sort()).toEqual(['main>detail', 'main>review-review-s1'])
    // Nothing holds the learner back: no red edge on the box, and no dot on the skill.
    expect(box(diagram, /Nắm ý chính/)).not.toHaveAttribute('data-review')
    expect(screen.getByRole('button', { name: 'Reading' })).toHaveTextContent(/^Reading$/)

    fireEvent.click(node)
    const review = reviewPanel()
    expect(review).toHaveTextContent('Gợi ý, không bắt buộc')
    expect(review).toHaveTextContent('không chặn bài học')
    expect(within(review).getByRole('link', { name: /Làm bài ôn/ })).toHaveAttribute('href', '/learn/reviews/review-s1')
  })

  it('draws no review node when no review holds the learner back', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    const diagram = await chart()
    expect(within(diagram).queryByRole('button', { name: /^Bài ôn/ })).not.toBeInTheDocument()
  })

  it('marks a point of another skill that a diagnosis sent the learner back to, where the chart draws it', async () => {
    const user = userEvent.setup()
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: [
        { ...base, knowledgePointId: 'compare', code: 'G55_COMPARISON', name: 'So sánh', skill: 'ALL', mastery: null, tier: null, evidenceCount: 0 },
        { ...base, knowledgePointId: 'chart', code: 'W50_SIMPLE_CHART', name: 'Mô tả biểu đồ đơn giản', skill: 'WRITING', mastery: null, tier: null, evidenceCount: 0, prerequisiteIds: ['compare'] },
      ],
    })
    vi.mocked(learningApi.getReviewBasket).mockResolvedValue(blockingReviewOf('compare'))
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Writing' }))
    const diagram = await chart()
    const outside = within(diagram).getByRole('group', { name: 'Điểm nền: So sánh, có bài ôn đang chặn tiến độ' })
    expect(outside).toHaveAttribute('data-review', 'true')
    // Its review is drawn right after it, in the next column.
    expect(reviewNode(diagram, 'Bài ôn đang chặn tiến độ: So sánh')).toBeInTheDocument()
    const before = within(panel()).getByRole('region', { name: 'Xây trên (học trước)' })
    expect(within(before).getByRole('button', { name: /So sánh/ })).toHaveTextContent('Cần ôn')
  })

  it('keeps the points every skill builds on as a filter of their own, apart from the one that shows every skill', async () => {
    const user = userEvent.setup()
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: [
        { ...base, knowledgePointId: 'compare', code: 'G55_COMPARISON', name: 'So sánh', skill: 'ALL', mastery: null, tier: null, evidenceCount: 0 },
        { ...base, knowledgePointId: 'chart', code: 'W50_SIMPLE_CHART', name: 'Mô tả biểu đồ đơn giản', skill: 'WRITING', mastery: null, tier: null, evidenceCount: 0, prerequisiteIds: ['compare'] },
      ],
    })
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Nền tảng' }))
    expect(screen.getByRole('button', { name: 'Nền tảng' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tất cả' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('region', { name: /^Sơ đồ cây kiến thức/ })).toHaveLength(1)
    const foundation = await chart()
    expect(box(foundation, /So sánh/)).toBeInTheDocument()
    expect(within(foundation).queryByRole('button', { name: /Mô tả biểu đồ đơn giản/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tất cả' }))
    expect(screen.getByRole('button', { name: 'Nền tảng' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('region', { name: /^Sơ đồ cây kiến thức/ })).toHaveLength(2)
  })

  it('still draws the tree when the review basket cannot be loaded, only without reviews', async () => {
    vi.mocked(learningApi.getReviewBasket).mockRejectedValue(new Error('down'))
    renderTree()
    const diagram = await chart()
    expect(box(diagram, /Nhận diện âm/)).not.toHaveAttribute('data-review')
    expect(within(diagram).queryByRole('group', { name: /Bài ôn đang chặn tiến độ/ })).not.toBeInTheDocument()
    expect(within(panel()).queryByRole('region', { name: 'Bài ôn đang chặn tiến độ' })).not.toBeInTheDocument()
  })

  it('selects a point from the keyboard and lights the lines of the point in focus', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    const target = box(await chart(), /Nắm ý chính/)
    expect(target).toHaveAttribute('aria-pressed', 'false')
    target.focus()
    await user.keyboard('{Enter}')
    expect(target).toHaveAttribute('aria-pressed', 'true')
    expect(within(panel()).getByRole('heading', { name: 'Nắm ý chính', level: 3 })).toBeInTheDocument()
    expect(box(await chart(), /Đọc chi tiết/)).toHaveAttribute('data-related', 'true')
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

  it('draws what a skill builds on from another skill as a faded point before the first step, not as a step', async () => {
    const user = userEvent.setup()
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: [
        { ...base, knowledgePointId: 'compare', code: 'G55_COMPARISON', name: 'So sánh', skill: 'ALL', mastery: null, tier: null, evidenceCount: 0 },
        { ...base, knowledgePointId: 'chart', code: 'W50_SIMPLE_CHART', name: 'Mô tả biểu đồ đơn giản', skill: 'WRITING', mastery: null, tier: null, evidenceCount: 0, prerequisiteIds: ['compare'] },
      ],
    })
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Writing' }))
    const diagram = await chart()

    const outside = within(diagram).getByRole('group', { name: 'Điểm nền: So sánh' })
    // Points every skill builds on are named "Nền tảng", not "ALL", so they are not taken for the filter that shows every skill.
    expect(outside).toHaveTextContent('Nền tảng')
    expect(outside).not.toHaveTextContent('ALL')
    expect(within(diagram).queryByRole('button', { name: /So sánh/ })).not.toBeInTheDocument()
    expect(within(diagram).getByText('Điểm nền')).toBeInTheDocument()
    // The point of the skill is still the first step: the point of another skill is context, not a step.
    expect(within(diagram).getByText('Nền tảng')).toBeInTheDocument()
    expect(box(diagram, /Mô tả biểu đồ đơn giản/)).toHaveTextContent('Học thứ 1')
  })

  it('shows the order of learning among those points too: what they build on comes before them', async () => {
    const user = userEvent.setup()
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: [
        { ...base, knowledgePointId: 'basic', code: 'G55_BASIC', name: 'Mẫu câu cơ bản', skill: 'ALL', mastery: null, tier: null, evidenceCount: 0 },
        { ...base, knowledgePointId: 'linking', code: 'G55_LINKING', name: 'Linking words', skill: 'ALL', mastery: null, tier: null, evidenceCount: 0, prerequisiteIds: ['basic'] },
        { ...base, knowledgePointId: 'compound', code: 'W50_COMPOUND', name: 'Câu ghép', skill: 'WRITING', mastery: null, tier: null, evidenceCount: 0, prerequisiteIds: ['linking'] },
      ],
    })
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Writing' }))
    const diagram = await chart()

    const basic = within(diagram).getByRole('group', { name: 'Điểm nền: Mẫu câu cơ bản' })
    const linking = within(diagram).getByRole('group', { name: 'Điểm nền: Linking words' })
    expect(basic).toHaveTextContent('Nền, học thứ 1')
    expect(linking).toHaveTextContent('Nền, học thứ 2')
    expect(within(diagram).getAllByText('Điểm nền')).toHaveLength(2)
    expect(box(diagram, /Câu ghép/)).toHaveTextContent('Học thứ 1')
  })

  it('draws the points of a lower course the course builds on, named with their course and chặng, and cannot pick them', async () => {
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: [
        { ...base, knowledgePointId: 'compound', code: 'W50_COMPOUND', name: 'Câu ghép', skill: 'WRITING', mastery: null, tier: null, evidenceCount: 0, prerequisiteIds: ['pattern'] },
      ],
      referencePoints: [
        {
          knowledgePointId: 'pattern', code: 'G40_PATTERN', name: 'Mẫu câu cơ bản', skill: 'ALL', cefrLevel: 'A2', prerequisiteIds: ['subject'],
          course: { courseId: 'course-0', name: 'Foundation 4.0', bandLevel: 4 }, topic: { topicId: 'topic-2', name: 'Câu đơn', position: 2 },
        },
        {
          knowledgePointId: 'subject', code: 'G40_SUBJECT', name: 'Chủ ngữ và động từ', skill: 'ALL', cefrLevel: 'A1', prerequisiteIds: [],
          course: { courseId: 'course-0', name: 'Foundation 4.0', bandLevel: 4 }, topic: { topicId: 'topic-1', name: 'Từ loại', position: 1 },
        },
      ],
    })
    renderTree()
    const diagram = await chart()

    const pattern = within(diagram).getByRole('group', { name: 'Điểm nền: Mẫu câu cơ bản' })
    const subject = within(diagram).getByRole('group', { name: 'Điểm nền: Chủ ngữ và động từ' })
    expect(pattern).toHaveTextContent('Foundation 4.0 · Chặng 02')
    expect(subject).toHaveTextContent('Foundation 4.0 · Chặng 01')
    // What they build on comes first: the order of learning reaches back into the lower course.
    expect(subject).toHaveTextContent('Nền, học thứ 1')
    expect(pattern).toHaveTextContent('Nền, học thứ 2')
    expect(within(diagram).queryByRole('button', { name: /Mẫu câu cơ bản|Chủ ngữ/ })).not.toBeInTheDocument()
    expect(box(diagram, /Câu ghép/)).toHaveTextContent('Học thứ 1')

    // The panel names what the point builds on, with its course, as text that cannot be picked.
    const before = within(panel()).getByRole('region', { name: 'Xây trên (học trước)' })
    expect(within(before).getByText('Mẫu câu cơ bản')).toBeInTheDocument()
    expect(within(before).getByText('Foundation 4.0 · Chặng 02')).toBeInTheDocument()
    expect(within(before).queryByRole('button')).not.toBeInTheDocument()
    // They are references, not points of the course: the count and the summary are of the course alone.
    expect(screen.getByText('1 điểm kiến thức', { selector: 'h2' })).toBeInTheDocument()
  })

  it('works with a server that sends no reference points', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    expect(within(await chart()).queryByText('Điểm nền')).not.toBeInTheDocument()
  })

  it('adds no such column when a skill builds only on itself', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    const diagram = await chart()

    expect(within(diagram).queryByText('Điểm nền')).not.toBeInTheDocument()
    expect(within(diagram).queryByRole('group', { name: /Điểm nền của kỹ năng khác/ })).not.toBeInTheDocument()
  })

  it('selects a point from the chart and shows its mastery', async () => {
    const user = userEvent.setup()
    renderTree()
    await chart()
    await user.click(screen.getByRole('button', { name: 'Reading' }))
    fireEvent.click(box(await chart(), /Nắm ý chính/))
    expect(within(panel()).getByRole('meter', { name: 'Mức nắm 80%' })).toBeInTheDocument()
    expect(within(panel()).getByText('Vững')).toBeInTheDocument()
  })

  it('lists the error traps a point has, with their mastery, under that point only', async () => {
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
    fireEvent.click(box(await chart(), /Nắm ý chính/))
    const traps = within(panel()).getByRole('list', { name: 'Lỗi hay gặp' })
    expect(within(traps).getAllByRole('listitem')).toHaveLength(2)
    expect(traps).toHaveTextContent('Chọn False khi thông tin không được nêu')
    expect(traps).toHaveTextContent('45%')
    expect(traps).toHaveTextContent('5 lượt làm')
    fireEvent.click(box(await chart(), /Đọc chi tiết/))
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

  it('opens the hearts popup instead of starting practice when the learner has no hearts', async () => {
    const user = userEvent.setup()
    const popup = vi.fn()
    const unsubscribe = subscribeHeartsDepleted(popup)
    vi.mocked(learningApi.getHearts).mockResolvedValue({ hearts: 0, maxHearts: 5, nextHeartAt: null, refillCost: 5 })
    renderTree()
    await chart()
    expect(within(panel()).getByText('Hết tim, bấm Luyện để mua tim.')).toBeInTheDocument()
    expect(screen.queryByRole('alert', { name: 'Tim của bạn' })).not.toBeInTheDocument()
    await user.click(within(panel()).getByRole('button', { name: 'Luyện' }))
    expect(popup).toHaveBeenCalledTimes(1)
    expect(learningApi.startFreePractice).not.toHaveBeenCalled()
    unsubscribe()
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
    fireEvent.click(box(await chart(), /Nắm ý chính/))
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

  it('tags a free point on its row too', async () => {
    vi.mocked(learningApi.getLearnerTree).mockResolvedValue({
      courseId: 'course-1',
      knowledgePoints: points.map((point) => ({ ...point, freePreview: point.name === 'Nắm ý chính' })),
    })
    renderTree()
    await chart()
    const free = screen.getByRole('heading', { name: 'Nắm ý chính' }).closest('li') as HTMLElement
    const paid = screen.getByRole('heading', { name: 'Đọc chi tiết' }).closest('li') as HTMLElement
    expect(within(free).getByText('Free')).toBeInTheDocument()
    expect(within(paid).queryByText('Free')).not.toBeInTheDocument()
  })

  it('shows a blocking review on its row with the way into it, without opening the row', async () => {
    vi.mocked(learningApi.getReviewBasket).mockResolvedValue(blockingReviewOf('detail'))
    renderTree()
    await chart()
    const row = screen.getByRole('heading', { name: 'Đọc chi tiết' }).closest('li') as HTMLElement
    const link = await within(row).findByRole('link', { name: /Làm bài ôn/ })
    expect(link).toHaveAttribute('href', '/learn/reviews/review-1')
    expect(within(row).getByText('Cần ôn')).toBeInTheDocument()
    const other = screen.getByRole('heading', { name: 'Nắm ý chính' }).closest('li') as HTMLElement
    expect(within(other).queryByText('Cần ôn')).not.toBeInTheDocument()
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
