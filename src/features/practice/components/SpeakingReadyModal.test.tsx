import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SpeakingReadyModal } from './SpeakingReadyModal'

function renderModal(props: Partial<Parameters<typeof SpeakingReadyModal>[0]> = {}) {
  const onClose = vi.fn()
  const onConfirm = vi.fn()
  render(<SpeakingReadyModal title="Hometown" partNo={1} questionCount={4} timeLimitSeconds={300} onClose={onClose} onConfirm={onConfirm} {...props} />)
  return { onClose, onConfirm }
}

describe('SpeakingReadyModal', () => {
  it('asks whether the learner is ready and says what the part is', () => {
    renderModal()

    expect(screen.getByText('Bạn đã sẵn sàng chưa?')).toBeInTheDocument()
    expect(screen.getByText(/Giám khảo hỏi những câu chung/)).toBeInTheDocument()
    expect(screen.getByText('4 câu hỏi')).toBeInTheDocument()
    expect(screen.getByText('Thời lượng khoảng 5 phút')).toBeInTheDocument()
  })

  it('describes a full test when no part is given', () => {
    renderModal({ partNo: null })

    expect(screen.getByText(/Bài thi đủ ba phần/)).toBeInTheDocument()
  })

  it('opens the part only after the learner confirms', async () => {
    const { onConfirm } = renderModal()
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'SẴN SÀNG, BẮT ĐẦU' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('lets the learner put it off', async () => {
    const { onClose, onConfirm } = renderModal()

    await userEvent.click(screen.getByRole('button', { name: /Để sau/ }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
