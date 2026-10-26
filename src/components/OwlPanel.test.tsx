import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/toast/ToastProvider'
import type { Suggestion } from '~types/learningPath'
import { ApiError } from '@/features/learning-path/api/apiError'
import { OwlPanel } from './OwlPanel'
import type { OwlSnapshot } from './owl-messages'
import type { OwlSuggestionsState } from './useOwlSuggestions'

const api = vi.hoisted(() => ({ startBasketReview: vi.fn() }))

vi.mock('@/features/learning-path/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/learning-path/api')>()),
  learningApi: api,
}))

const EMPTY: OwlSnapshot = { progress: null, hearts: null, quests: null, badges: null }

function suggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    type: 'PRACTICE_SET', id: 'set-1', title: 'Bộ luyện: Câu chủ đề', knowledgePointId: 'kp-1',
    knowledgePointCode: 'R55_TOPIC_SENTENCE', reason: 'CONSOLIDATE', band: 5.5, skill: 'READING',
    action: { kind: 'BASKET_REVIEW', knowledgePointId: 'kp-1' }, ...overrides,
  }
}

function renderPanel(suggestions: OwlSuggestionsState, handlers: { onClose?: () => void, onRetry?: () => void, onTab?: () => void } = {}) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route
            path="/home"
            element={(
              <OwlPanel
                onClose={handlers.onClose ?? vi.fn()}
                onRetrySuggestions={handlers.onRetry ?? vi.fn()}
                onTab={handlers.onTab ?? vi.fn()}
                snapshot={EMPTY}
                suggestions={suggestions}
                tab="suggestions"
              />
            )}
          />
          <Route path="/learn/reviews/:reviewId" element={<p>Trang bài ôn</p>} />
          <Route path="/learn/lessons/:lessonId" element={<p>Trang bài học</p>} />
          <Route path="/learn" element={<p>Trang khóa học</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

beforeEach(() => {
  api.startBasketReview.mockReset()
})

describe('OwlPanel suggestions tab', () => {
  it('offers the suggestions as a third tab', () => {
    const onTab = vi.fn()
    renderPanel({ status: 'ready', items: [] }, { onTab })
    expect(screen.getByRole('tab', { name: 'Gợi ý' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Nhiệm vụ' })).toHaveAttribute('aria-selected', 'false')
  })

  it('shows a waiting line while loading and a retry when the load failed', async () => {
    const onRetry = vi.fn()
    const { unmount } = renderPanel({ status: 'loading' })
    expect(screen.getByText('Đang tải gợi ý…')).toBeInTheDocument()
    unmount()

    renderPanel({ status: 'failed' }, { onRetry })
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('says so when there is nothing to suggest', () => {
    renderPanel({ status: 'ready', items: [] })
    expect(screen.getByText('Hôm nay chưa có gợi ý nào cho bạn.')).toBeInTheDocument()
  })

  it('lists each suggestion with its reason, kind and band, and says it is optional', () => {
    renderPanel({
      status: 'ready',
      items: [
        suggestion(),
        suggestion({ id: 'l-1', type: 'LESSON', title: 'Ý chính của cả bài', reason: 'NEXT_IN_TREE', band: null, action: { kind: 'LESSON', lessonId: 'lesson-9' } }),
      ],
    })
    expect(screen.getByText('Cần củng cố')).toBeInTheDocument()
    expect(screen.getByText('Bước kế tiếp')).toBeInTheDocument()
    expect(screen.getByText('Bộ luyện tập · Reading · Band 5.5')).toBeInTheDocument()
    expect(screen.getByText('Bài học · Reading')).toBeInTheDocument()
    expect(screen.getByText(/Bỏ qua cũng không ảnh hưởng/)).toBeInTheDocument()
  })

  it('starts the review of a weak point, then closes the panel on the review page', async () => {
    api.startBasketReview.mockResolvedValue({ reviewId: 'rv-1' })
    const onClose = vi.fn()
    renderPanel({ status: 'ready', items: [suggestion()] }, { onClose })

    await userEvent.click(screen.getByRole('button', { name: 'Luyện ngay' }))

    expect(api.startBasketReview).toHaveBeenCalledWith('kp-1')
    expect(await screen.findByText('Trang bài ôn')).toBeInTheDocument()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('keeps the panel open when the review cannot start', async () => {
    api.startBasketReview.mockRejectedValue(new ApiError(409, 'NO_UNREVEALED_SET', 'raw'))
    const onClose = vi.fn()
    renderPanel({ status: 'ready', items: [suggestion()] }, { onClose })

    await userEvent.click(screen.getByRole('button', { name: 'Luyện ngay' }))

    expect(await screen.findByText('Điểm này chưa có bộ đề mới để ôn. Hãy quay lại sau.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Luyện ngay' })).toBeEnabled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('opens a lesson as a link and closes the panel', async () => {
    const onClose = vi.fn()
    renderPanel({
      status: 'ready',
      items: [suggestion({ type: 'LESSON', action: { kind: 'LESSON', lessonId: 'lesson-9' } })],
    }, { onClose })

    await userEvent.click(screen.getByRole('link', { name: 'Vào học' }))

    expect(await screen.findByText('Trang bài học')).toBeInTheDocument()
    expect(onClose).toHaveBeenCalled()
  })

  it('sends a practice test to the course list', async () => {
    renderPanel({
      status: 'ready',
      items: [suggestion({ type: 'PRACTICE_TEST', action: { kind: 'COURSE_LIST' } })],
    })
    await userEvent.click(screen.getByRole('link', { name: 'Xem trong khóa học' }))
    expect(await screen.findByText('Trang khóa học')).toBeInTheDocument()
  })
})
