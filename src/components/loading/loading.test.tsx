import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusArt } from '../StatusArt'
import { AiWaitPanel } from './AiWaitPanel'
import { essayWaitNote } from './aiWaitNotes'
import { Loading, Spinner } from './Loading'

describe('Loading', () => {
  it('reads its label aloud and draws grey blocks instead of the text', () => {
    render(<Loading label="Đang tải bài học…" variant="article" />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveTextContent('Đang tải bài học…')
    expect(status.querySelector('.ld__bar')).not.toBeNull()
  })

  it.each(['block', 'article', 'chart', 'list'] as const)('draws the %s shape', (variant) => {
    const { container } = render(<Loading variant={variant} />)
    expect(container.querySelectorAll('.ld__bar').length).toBeGreaterThan(0)
  })

  it('has a spinner that says nothing by itself', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('.ld-spin')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('AiWaitPanel', () => {
  afterEach(() => { vi.useRealTimers() })

  it('slides a bar instead of filling one when no stages are reported, and counts the time', () => {
    vi.useFakeTimers()
    const { container } = render(<AiWaitPanel hint="Đừng đóng trang." note={essayWaitNote} title="Đang chấm bài viết" />)
    expect(screen.getByRole('heading', { name: 'Đang chấm bài viết' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Các bước chấm bài' })).not.toBeInTheDocument()
    expect(container.querySelector('.sw__meter--sliding')).not.toBeNull()
    expect(screen.getByText('Đã chờ 0:00')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(35_000) })
    expect(screen.getByText('Đã chờ 0:35')).toBeInTheDocument()
    expect(screen.getByText(/Lâu hơn thường lệ/)).toBeInTheDocument()
  })

  it('shows the stages when the grader reports them', () => {
    render(<AiWaitPanel hint="x" stage={1} steps={[{ label: 'Một' }, { label: 'Hai' }, { label: 'Ba' }]} title="Đang chấm" />)
    const steps = screen.getAllByRole('listitem')
    expect(steps).toHaveLength(3)
    expect(steps[1]).toHaveAttribute('aria-current', 'step')
  })
})

describe('StatusArt', () => {
  it('says what is missing in text and keeps the picture as decoration', () => {
    const { container } = render(<StatusArt kind="empty" message="Chưa có bài nào." title="Chưa có nội dung" />)
    expect(screen.getByRole('heading', { name: 'Chưa có nội dung' })).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('alerts only for a failure, and makes the page heading an h1 for a whole page', () => {
    render(<StatusArt kind="error" message="Mất kết nối." page title="Chưa tải được nội dung" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Mất kết nối.')
    expect(screen.getByRole('heading', { level: 1, name: 'Chưa tải được nội dung' })).toBeInTheDocument()
  })
})
