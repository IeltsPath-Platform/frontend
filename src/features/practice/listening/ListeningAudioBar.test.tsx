import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ListeningAudioBar } from './ListeningAudioBar'

describe('ListeningAudioBar', () => {
  it('keeps every control in the dock layout the practice screen uses', () => {
    render(<ListeningAudioBar src="https://media.example/part-1.mp3" durationHint={226} layout="dock" />)

    expect(screen.getByRole('button', { name: 'Phát bài nghe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tua lại 5 giây' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tua tới 5 giây' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Tiến độ bài nghe' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Âm lượng' })).toBeInTheDocument()
    expect(screen.getByText('00:00 / 03:46')).toBeInTheDocument()
  })

  it('steps the speed round with one button in the dock layout', async () => {
    render(<ListeningAudioBar src="https://media.example/part-1.mp3" durationHint={226} layout="dock" />)

    const speed = screen.getByRole('button', { name: 'Tốc độ phát' })
    expect(speed).toHaveTextContent('1x')
    await userEvent.click(speed)

    expect(speed).toHaveTextContent('1.25x')
  })

  it('offers the speed as a list in the inline layout of the review screen', () => {
    render(<ListeningAudioBar src="https://media.example/part-1.mp3" durationHint={226} />)

    expect(screen.getByRole('combobox', { name: 'Tốc độ phát' })).toBeInTheDocument()
  })
})
