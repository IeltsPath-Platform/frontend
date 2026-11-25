import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { InfiniteCount, InfiniteSentinel } from './InfiniteSentinel'
import { mockIntersectionObserver } from '@/test/intersection'

function sentinelProps(overrides: Partial<ComponentProps<typeof InfiniteSentinel>> = {}) {
  return {
    hasMore: true,
    loadingMore: false,
    moreError: null,
    itemCount: 3,
    noun: 'câu hỏi',
    onReachEnd: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  }
}

describe('InfiniteSentinel', () => {
  it('calls onReachEnd when its observed target intersects', async () => {
    const observer = mockIntersectionObserver()
    const onReachEnd = vi.fn()
    const { container } = render(<InfiniteSentinel {...sentinelProps({ onReachEnd })} />)
    const target = container.querySelector('.adm-infinite__sentinel')
    expect(target).not.toBeNull()
    await waitFor(() => expect(observer.isObserved(target!)).toBe(true))
    expect(observer.rootFor(target!)).toBeNull()

    observer.intersect(target!)
    expect(onReachEnd).toHaveBeenCalledOnce()
    observer.reset()
  })

  it('uses the nearest overflow-y scroll region for a list inside a modal', async () => {
    const observer = mockIntersectionObserver()
    const { container } = render(
      <div data-testid="modal-body" style={{ overflowY: 'auto' }}>
        <div data-testid="question-list" style={{ overflowY: 'scroll' }}>
          <InfiniteSentinel {...sentinelProps()} />
        </div>
      </div>,
    )
    const target = container.querySelector('.adm-infinite__sentinel')!
    await waitFor(() => expect(observer.rootFor(target)).toBe(screen.getByTestId('question-list')))
    observer.reset()
  })

  it('does not observe while loading, after an error, or when there are no more pages', () => {
    const observer = mockIntersectionObserver()
    const cases = [
      sentinelProps({ loadingMore: true }),
      sentinelProps({ moreError: 'Không thể tải thêm.' }),
      sentinelProps({ hasMore: false }),
    ]
    for (const props of cases) {
      const { unmount, container } = render(<InfiniteSentinel {...props} />)
      expect(observer.isObserved(container.querySelector('.adm-infinite__sentinel')!)).toBe(false)
      unmount()
    }
    observer.reset()
  })

  it('shows loading, retry, and completion states accessibly', () => {
    const observer = mockIntersectionObserver()
    const { rerender } = render(<InfiniteSentinel {...sentinelProps({ loadingMore: true })} />)
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải thêm')

    const retry = vi.fn()
    rerender(<InfiniteSentinel {...sentinelProps({ moreError: 'Không thể tải thêm.', onRetry: retry })} />)
    expect(screen.getByRole('status')).toHaveTextContent('Không thể tải thêm.')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(retry).toHaveBeenCalledOnce()

    rerender(<InfiniteSentinel {...sentinelProps({ hasMore: false, itemCount: 7 })} />)
    expect(screen.getByRole('status')).toHaveTextContent('Đã hiện tất cả 7 câu hỏi.')
    observer.reset()
  })

  it('falls back to a load button when IntersectionObserver is unavailable', () => {
    const original = globalThis.IntersectionObserver
    Reflect.deleteProperty(globalThis, 'IntersectionObserver')
    const onReachEnd = vi.fn()
    render(<InfiniteSentinel {...sentinelProps({ onReachEnd })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm' }))
    expect(onReachEnd).toHaveBeenCalledOnce()
    if (original) globalThis.IntersectionObserver = original
  })
})

describe('InfiniteCount', () => {
  it('shows a sticky count and hides it when there are no rows', () => {
    const { rerender } = render(<InfiniteCount items={2} total={18} noun="người dùng" />)
    expect(screen.getByRole('status')).toHaveTextContent('Đang hiện 2 / 18 người dùng')
    rerender(<InfiniteCount items={0} total={18} noun="người dùng" />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
