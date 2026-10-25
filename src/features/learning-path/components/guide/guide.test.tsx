import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/toast/ToastProvider'
import type { ReviewBasket, Suggestion } from '~types/learningPath'
import { ApiError } from '../../api/apiError'
import { ReviewBasketPage } from '../../pages/ReviewBasketPage'
import { SuggestionStrip } from './SuggestionStrip'

const api = vi.hoisted(() => ({
  getSuggestions: vi.fn(),
  getReviewBasket: vi.fn(),
  startBasketReview: vi.fn(),
}))

vi.mock('../../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api')>()),
  learningApi: api,
}))

function suggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    type: 'PRACTICE_SET', id: 'set-1', title: 'Bộ luyện: Câu chủ đề', knowledgePointId: 'kp-1',
    knowledgePointCode: 'R55_TOPIC_SENTENCE', reason: 'CONSOLIDATE', band: 5.5, skill: 'READING',
    action: { kind: 'BASKET_REVIEW', knowledgePointId: 'kp-1' }, ...overrides,
  }
}

function renderWithRoutes(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/learn']}>
        <Routes>
          <Route path="/learn" element={ui} />
          <Route path="/learn/reviews/:reviewId" element={<p>Trang bài ôn</p>} />
          <Route path="/learn/lessons/:lessonId" element={<p>Trang bài học</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

beforeEach(() => {
  api.getSuggestions.mockReset()
  api.getReviewBasket.mockReset()
  api.startBasketReview.mockReset()
})

describe('SuggestionStrip', () => {
  it('lists the suggestions in order, with the first one as the lead', async () => {
    api.getSuggestions.mockResolvedValue([
      suggestion(),
      suggestion({ id: 'l-1', type: 'LESSON', title: 'Ý chính của cả bài', reason: 'NEXT_IN_TREE', action: { kind: 'LESSON', lessonId: 'lesson-9' } }),
    ])
    renderWithRoutes(<SuggestionStrip />)

    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveClass('is-lead')
    expect(items[1]).not.toHaveClass('is-lead')
    expect(within(items[0]).getByText('Cần củng cố')).toBeInTheDocument()
    expect(within(items[0]).getByText('Band 5.5')).toBeInTheDocument()
    expect(within(items[1]).getByText('Bước kế tiếp')).toBeInTheDocument()
    expect(screen.getByText(/Bỏ qua cũng không ảnh hưởng/)).toBeInTheDocument()
  })

  it('opens a suggested lesson as a link', async () => {
    api.getSuggestions.mockResolvedValue([
      suggestion({ type: 'LESSON', title: 'Ý chính', action: { kind: 'LESSON', lessonId: 'lesson-9' } }),
    ])
    renderWithRoutes(<SuggestionStrip />)

    expect(await screen.findByRole('link', { name: /Vào học/ })).toHaveAttribute('href', '/learn/lessons/lesson-9')
  })

  it('starts the review and opens it when a practice suggestion is chosen', async () => {
    api.getSuggestions.mockResolvedValue([suggestion()])
    api.startBasketReview.mockResolvedValue({ reviewId: 'review-5' })
    renderWithRoutes(<SuggestionStrip />)

    await userEvent.click(await screen.findByRole('button', { name: /Luyện ngay/ }))

    expect(api.startBasketReview).toHaveBeenCalledWith('kp-1')
    expect(await screen.findByText('Trang bài ôn')).toBeInTheDocument()
  })

  it('tells a refusal as a toast and stays on the page', async () => {
    api.getSuggestions.mockResolvedValue([suggestion()])
    api.startBasketReview.mockRejectedValue(new ApiError(409, 'NO_UNREVEALED_SET', 'raw'))
    renderWithRoutes(<SuggestionStrip />)

    await userEvent.click(await screen.findByRole('button', { name: /Luyện ngay/ }))

    expect(await screen.findByText('Điểm này chưa có bộ đề mới để ôn. Hãy quay lại sau.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Luyện ngay/ })).toBeEnabled()
  })

  it('renders nothing when there is nothing to suggest, and nothing when the request fails', async () => {
    api.getSuggestions.mockResolvedValue([])
    const first = renderWithRoutes(<SuggestionStrip />)
    await waitFor(() => expect(api.getSuggestions).toHaveBeenCalled())
    await waitFor(() => expect(first.container.querySelector('.lp-guide')).toBeNull())
    first.unmount()

    api.getSuggestions.mockRejectedValue(new ApiError(500, 'SERVER_ERROR', 'down'))
    const second = renderWithRoutes(<SuggestionStrip />)
    await waitFor(() => expect(second.container.querySelector('.lp-guide')).toBeNull())
  })
})

describe('ReviewBasketPage', () => {
  const basket: ReviewBasket = {
    required: [{ reviewId: 'rev-1', knowledgePointId: 'kp-9', code: 'R60_TFNG', name: 'False và Not Given', lessonId: 'l1', skill: 'READING' }],
    consolidate: [
      { knowledgePointId: 'kp-1', code: 'R55_MAIN_IDEA', name: 'Ý chính', skill: 'READING', tier: 'CONSOLIDATE', mastery: 0.72, dueAt: null, reason: 'CONSOLIDATE', hasUnrevealedSet: true, reviewId: null },
      { knowledgePointId: 'kp-2', code: 'R55_DETAIL', name: 'Chi tiết', skill: 'READING', tier: 'PRIORITY', mastery: 0.3, dueAt: null, reason: 'CONSOLIDATE', hasUnrevealedSet: false, reviewId: null },
    ],
    due: [
      { knowledgePointId: 'kp-3', code: 'R55_TS', name: 'Câu chủ đề', skill: 'READING', tier: 'MAINTAIN', mastery: 0.9, dueAt: new Date(Date.now() - 2 * 86_400_000).toISOString(), reason: 'DUE', hasUnrevealedSet: true, reviewId: 'rev-7' },
    ],
    weak: [],
  }

  it('shows the required review first, then the weak and the due points, with their counts', async () => {
    api.getReviewBasket.mockResolvedValue(basket)
    renderWithRoutes(<ReviewBasketPage />)

    expect(await screen.findByRole('heading', { name: /^Bắt buộc/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Làm bài ôn/ })).toHaveAttribute('href', '/learn/reviews/rev-1')
    expect(screen.getByRole('heading', { name: /^Nên củng cố/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^Đến hạn ôn/ })).toBeInTheDocument()
    expect(screen.getByText('Trễ 2 ngày')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Mức thành thạo 72%/ })).toBeInTheDocument()
  })

  it('lists a weak point that already has an optional review under "Cần ưu tiên"', async () => {
    api.getReviewBasket.mockResolvedValue({
      ...basket,
      weak: [{ knowledgePointId: 'kp-w', code: 'DEMO_WRITING_CRITERION_LR', name: 'Vốn từ vựng (LR)', skill: 'WRITING', tier: 'PRIORITY', mastery: 0, dueAt: null, reason: 'WRITING_CRITERION', hasUnrevealedSet: true, reviewId: 'rev-w' }],
    })
    renderWithRoutes(<ReviewBasketPage />)

    expect(await screen.findByRole('heading', { name: /^Cần ưu tiên/ })).toBeInTheDocument()
    const row = screen.getByText('Vốn từ vựng (LR)').closest('li') as HTMLElement
    expect(within(row).getByRole('link', { name: /Tiếp tục ôn/ })).toHaveAttribute('href', '/learn/reviews/rev-w')
  })

  it('names the error pattern of a point whose review came from a repeated mistake', async () => {
    api.getReviewBasket.mockResolvedValue({
      ...basket,
      weak: [{
        knowledgePointId: 'kp-e', code: 'TFNG_NOT_GIVEN', name: 'Nhận ra Not Given', skill: 'READING',
        tier: 'PRIORITY', mastery: 0.45, dueAt: null, reason: 'ERROR_PATTERN', hasUnrevealedSet: true, reviewId: 'rev-e',
        errorTrap: { code: 'TFNG_NG_AS_FALSE', name: 'Chọn False khi thông tin không được nêu', fixHint: 'Tìm câu nói ngược lại trước.' },
      }],
    })
    renderWithRoutes(<ReviewBasketPage />)

    expect(await screen.findByRole('heading', { name: /^Cần ưu tiên/ })).toBeInTheDocument()
    const row = screen.getByText('Nhận ra Not Given').closest('li') as HTMLElement
    expect(row).toHaveTextContent('Lỗi hay gặp: Chọn False khi thông tin không được nêu')
    expect(within(row).getByRole('link', { name: /Tiếp tục ôn/ })).toHaveAttribute('href', '/learn/reviews/rev-e')
  })

  it('shows no error line on a point without an error pattern', async () => {
    api.getReviewBasket.mockResolvedValue(basket)
    renderWithRoutes(<ReviewBasketPage />)

    await screen.findByRole('heading', { name: /^Nên củng cố/ })
    expect(screen.queryByText(/Lỗi hay gặp/)).not.toBeInTheDocument()
  })

  it('has no "Cần ưu tiên" section when nothing is weak', async () => {
    api.getReviewBasket.mockResolvedValue(basket)
    renderWithRoutes(<ReviewBasketPage />)

    await screen.findByRole('heading', { name: /^Bắt buộc/ })
    expect(screen.queryByRole('heading', { name: /^Cần ưu tiên/ })).not.toBeInTheDocument()
  })

  it('resumes a review already started, and blocks a point that has no new set', async () => {
    api.getReviewBasket.mockResolvedValue(basket)
    renderWithRoutes(<ReviewBasketPage />)

    expect(await screen.findByRole('link', { name: /Tiếp tục ôn/ })).toHaveAttribute('href', '/learn/reviews/rev-7')
    const noSet = screen.getByText('Chi tiết').closest('li') as HTMLElement
    expect(within(noSet).getByRole('button', { name: 'Bắt đầu ôn' })).toBeDisabled()
    expect(within(noSet).getByText('Chưa có bộ đề mới')).toBeInTheDocument()
  })

  it('starts an optional review and opens it', async () => {
    api.getReviewBasket.mockResolvedValue(basket)
    api.startBasketReview.mockResolvedValue({ reviewId: 'rev-new' })
    renderWithRoutes(<ReviewBasketPage />)

    const row = (await screen.findByText('Ý chính')).closest('li') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Bắt đầu ôn' }))

    expect(api.startBasketReview).toHaveBeenCalledWith('kp-1')
    expect(await screen.findByText('Trang bài ôn')).toBeInTheDocument()
  })

  it('says the basket is empty when nothing is owed', async () => {
    api.getReviewBasket.mockResolvedValue({ required: [], consolidate: [], due: [], weak: [] })
    renderWithRoutes(<ReviewBasketPage />)

    expect(await screen.findByText('Giỏ ôn đang trống')).toBeInTheDocument()
  })
})
