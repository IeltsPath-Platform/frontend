import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReactionPicker } from './ReactionPicker'
import { ReactionSummary } from './ReactionSummary'

describe('ReactionPicker Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders default Like button with accessible attributes', () => {
    render(
      <ReactionPicker
        postId="post-1"
        myReaction={null}
        onSelectReaction={vi.fn()}
      />
    )

    const button = screen.getByRole('button', { name: 'Thích' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-haspopup', 'true')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders active reaction when myReaction is set', () => {
    render(
      <ReactionPicker
        postId="post-1"
        myReaction="LOVE"
        onSelectReaction={vi.fn()}
      />
    )

    const button = screen.getByRole('button', { name: 'Yêu thích' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button.className).toContain('is-active-love')
  })

  it('opens popup on hover after intent delay (350ms)', () => {
    render(
      <ReactionPicker
        postId="post-1"
        myReaction={null}
        onSelectReaction={vi.fn()}
      />
    )

    const container = screen.getByRole('button', { name: 'Thích' }).parentElement!
    fireEvent.mouseEnter(container)

    // Chưa mở ngay lập tức do có hover intent
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    // Tiến hành chờ đủ 350ms
    act(() => {
      vi.advanceTimersByTime(350)
    })

    expect(screen.getByRole('menu', { name: 'Chọn cảm xúc' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thích' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('menuitem')).toHaveLength(4)
  })

  it('does not open popup if mouse leaves before delay', () => {
    render(
      <ReactionPicker
        postId="post-1"
        myReaction={null}
        onSelectReaction={vi.fn()}
      />
    )

    const container = screen.getByRole('button', { name: 'Thích' }).parentElement!
    fireEvent.mouseEnter(container)

    // Rê chuột ra ngoài sau 200ms (chưa đủ 350ms)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    fireEvent.mouseLeave(container)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes popup after close delay (200ms) on mouse leave', () => {
    render(
      <ReactionPicker
        postId="post-1"
        myReaction={null}
        onSelectReaction={vi.fn()}
      />
    )

    const container = screen.getByRole('button', { name: 'Thích' }).parentElement!
    fireEvent.mouseEnter(container)
    act(() => {
      vi.advanceTimersByTime(350)
    })
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Rê chuột ra
    fireEvent.mouseLeave(container)

    // Vẫn còn hiển thị trong 100ms
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Hết 200ms thì đóng
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens popup with ArrowDown key and navigates with arrow keys', () => {
    render(
      <ReactionPicker
        postId="post-1"
        myReaction={null}
        onSelectReaction={vi.fn()}
      />
    )

    const mainButton = screen.getByRole('button', { name: 'Thích' })
    fireEvent.keyDown(mainButton, { key: 'ArrowDown' })

    const menu = screen.getByRole('menu', { name: 'Chọn cảm xúc' })
    expect(menu).toBeInTheDocument()

    // Di chuyển mũi tên phải
    fireEvent.keyDown(menu, { key: 'ArrowRight' })
    // Di chuyển mũi tên trái
    fireEvent.keyDown(menu, { key: 'ArrowLeft' })
  })

  it('closes popup and returns focus on Escape key', () => {
    render(
      <ReactionPicker
        postId="post-1"
        myReaction={null}
        onSelectReaction={vi.fn()}
      />
    )

    const mainButton = screen.getByRole('button', { name: 'Thích' })
    fireEvent.keyDown(mainButton, { key: 'ArrowDown' })

    const menu = screen.getByRole('menu', { name: 'Chọn cảm xúc' })
    fireEvent.keyDown(menu, { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(mainButton).toHaveFocus()
  })

  it('selects reaction when clicking an item in popup', () => {
    const handleSelect = vi.fn()
    render(
      <ReactionPicker
        postId="post-1"
        myReaction={null}
        onSelectReaction={handleSelect}
      />
    )

    const container = screen.getByRole('button', { name: 'Thích' }).parentElement!
    fireEvent.mouseEnter(container)
    act(() => {
      vi.advanceTimersByTime(350)
    })

    const loveItem = screen.getByRole('menuitem', { name: 'Yêu thích' })
    fireEvent.click(loveItem)

    expect(handleSelect).toHaveBeenCalledWith('LOVE')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('toggles LIKE when quick clicking main button without prior reaction', () => {
    const handleSelect = vi.fn()
    render(
      <ReactionPicker
        postId="post-1"
        myReaction={null}
        onSelectReaction={handleSelect}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Thích' }))
    expect(handleSelect).toHaveBeenCalledWith('LIKE')
  })

  it('removes current reaction when quick clicking main button again', () => {
    const handleSelect = vi.fn()
    render(
      <ReactionPicker
        postId="post-1"
        myReaction="HELPFUL"
        onSelectReaction={handleSelect}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Hữu ích' }))
    expect(handleSelect).toHaveBeenCalledWith('HELPFUL')
  })

  it('opens popup on long press on touch screen', () => {
    render(
      <ReactionPicker
        postId="post-1"
        myReaction={null}
        onSelectReaction={vi.fn()}
      />
    )

    const button = screen.getByRole('button', { name: 'Thích' })
    fireEvent.touchStart(button)

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByRole('menu', { name: 'Chọn cảm xúc' })).toBeInTheDocument()

    fireEvent.touchEnd(button)
  })
})

describe('ReactionSummary Component', () => {
  it('renders nothing when total reaction count is 0', () => {
    const { container } = render(
      <ReactionSummary reactionCounts={{ LIKE: 0, LOVE: 0, HELPFUL: 0, ACCURATE: 0 }} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders summary with top reactions and total count when total > 0', () => {
    render(
      <ReactionSummary
        reactionCounts={{
          LIKE: 10,
          LOVE: 5,
          HELPFUL: 2,
          ACCURATE: 1,
        }}
      />
    )

    // Tổng = 18
    expect(screen.getByText('18')).toBeInTheDocument()

    // Tooltip breakdown
    expect(screen.getByText('Thích 10 · Yêu thích 5 · Hữu ích 2 · Chính xác 1')).toBeInTheDocument()

    // Screen reader accessible text
    expect(
      screen.getByText('Tổng cộng 18 cảm xúc: Thích 10 · Yêu thích 5 · Hữu ích 2 · Chính xác 1')
    ).toBeInTheDocument()
  })

  it('only shows active reactions in breakdown tooltip', () => {
    render(
      <ReactionSummary
        reactionCounts={{
          LIKE: 3,
          LOVE: 0,
          HELPFUL: 2,
          ACCURATE: 0,
        }}
      />
    )

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Thích 3 · Hữu ích 2')).toBeInTheDocument()
    expect(screen.queryByText(/Yêu thích/)).not.toBeInTheDocument()
  })
})

