import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OverviewBlockStatus } from './OverviewBlockStatus'

describe('overview resource status', () => {
  it('explains a failure and lets the learner retry without exposing a raw server error', () => {
    const retry = vi.fn()
    render(<OverviewBlockStatus loading={false} error="Not Found" onRetry={retry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Chưa thể tải dữ liệu')
    expect(screen.queryByText('Not Found')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
