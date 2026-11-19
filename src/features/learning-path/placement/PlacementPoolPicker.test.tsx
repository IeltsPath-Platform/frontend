import { fireEvent, render, screen } from '@/test/render'
import { describe, expect, it, vi } from 'vitest'
import type { PlacementOptions } from '~types/learningPath'
import { PlacementPoolPicker } from './PlacementPoolPicker'

const options: PlacementOptions = {
  pools: [{ pool: 'BAND_0_3', examCount: 2 }, { pool: 'BAND_3_5', examCount: 0 }, { pool: 'BAND_5_9', examCount: 1 }],
  limitPer24h: 3, retakesLeft: 2, nextRetakeAt: null, hasPlacement: true, currentBand: 4.5, openAssignment: null,
}

describe('PlacementPoolPicker', () => {
  it('shows all pools and disables a pool without a published exam', () => {
    render(<PlacementPoolPicker options={options} selectedPool={null} onSelect={vi.fn()} onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /0–3.*2 đề/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /3–5.*Chưa có đề/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /5–9.*1 đề/i })).toBeEnabled()
    expect(screen.getByText('Không chắc thì chọn 3–5.')).toBeInTheDocument()
  })

  it('only selects a pool and starts the attempt after confirmation', () => {
    const onSelect = vi.fn()
    const onStart = vi.fn()
    const view = render(<PlacementPoolPicker options={options} selectedPool={null} onSelect={onSelect} onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: /0–3.*2 đề/i }))
    expect(onSelect).toHaveBeenCalledWith('BAND_0_3')
    expect(onStart).not.toHaveBeenCalled()
    view.rerender(<PlacementPoolPicker options={options} selectedPool="BAND_0_3" onSelect={onSelect} onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu làm bài' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('warns when the chosen pool ceiling is below the current band', () => {
    render(<PlacementPoolPicker options={options} selectedPool="BAND_0_3" onSelect={vi.fn()} onStart={vi.fn()} />)
    expect(screen.getByText(/Kho này tối đa 3\.0, thấp hơn band hiện tại 4\.5; kết quả mới sẽ thay thế/i)).toBeInTheDocument()
  })

  it('keeps the pool choices keyboard operable', () => {
    const onSelect = vi.fn()
    render(<PlacementPoolPicker options={options} selectedPool={null} onSelect={onSelect} onStart={vi.fn()} />)
    const first = screen.getByRole('button', { name: /0–3.*2 đề/i })
    first.focus()
    fireEvent.keyDown(first, { key: 'Enter' })
    fireEvent.click(first)
    expect(onSelect).toHaveBeenCalledWith('BAND_0_3')
  })

  it('reuses the already open assignment even when no retake remains', () => {
    const onStart = vi.fn()
    const openOptions = {
      ...options,
      retakesLeft: 0,
      openAssignment: { assignmentId: 'assignment-1', pool: 'BAND_5_9' as const, packageId: 'package-1', packageVersionId: 'version-1', retakesLeft: 0, nextRetakeAt: null },
    }
    render(<PlacementPoolPicker options={openOptions} selectedPool="BAND_5_9" onSelect={vi.fn()} onStart={onStart} />)
    expect(screen.getByRole('button', { name: /5–9.*1 đề/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /0–3.*2 đề/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bắt đầu làm bài' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu làm bài' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('allows selecting any available pool while an assignment is open', () => {
    const openOptions = {
      ...options,
      openAssignment: { assignmentId: 'assignment-1', pool: 'BAND_5_9' as const, packageId: 'package-1', packageVersionId: 'version-1', retakesLeft: 1, nextRetakeAt: null },
    }
    const onSelect = vi.fn()
    const onStart = vi.fn()
    const view = render(<PlacementPoolPicker options={openOptions} selectedPool={null} onSelect={onSelect} onStart={onStart} />)
    const otherPool = document.querySelectorAll<HTMLButtonElement>('.pl-pool-card')[0]
    expect(otherPool).toBeEnabled()
    expect(document.querySelector<HTMLButtonElement>('.pl-pools__start')!).toBeDisabled()
    fireEvent.click(otherPool)
    expect(onSelect).toHaveBeenCalledWith('BAND_0_3')
    view.rerender(<PlacementPoolPicker options={openOptions} selectedPool="BAND_0_3" onSelect={onSelect} onStart={onStart} />)
    expect(document.querySelector<HTMLButtonElement>('.pl-pools__start')!).toBeEnabled()
  })
})
