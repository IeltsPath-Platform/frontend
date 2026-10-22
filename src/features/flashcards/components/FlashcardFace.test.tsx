import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FlashcardFace } from './FlashcardFace'

describe('FlashcardFace', () => {
  const card = {
    front: 'biodiversity',
    back: 'sự đa dạng sinh học',
    ipa: 'ˌbaɪ.oʊ.daɪˈvɝː.sə.t̬i',
    exampleSentence: 'Pollution poses a great threat to biodiversity.',
  }

  it('renders both front and back simultaneously with proper accessibility labels', () => {
    const onFlip = vi.fn()
    const { container } = render(<FlashcardFace card={card} flipped={false} onFlip={onFlip} />)

    const root = screen.getByRole('button', { name: /Mặt trước: biodiversity/ })
    expect(root).toBeInTheDocument()

    // Both front and back elements exist in the DOM simultaneously for 3D flip
    const frontFace = container.querySelector('.flashcard-face-front')
    const backFace = container.querySelector('.flashcard-face-back')
    expect(frontFace).toBeInTheDocument()
    expect(backFace).toBeInTheDocument()

    // Check content: both front and back show the term
    expect(screen.getAllByText('biodiversity')).toHaveLength(2)
    expect(screen.getByText('sự đa dạng sinh học')).toBeInTheDocument()
    expect(screen.getByText('Pollution poses a great threat to biodiversity.')).toBeInTheDocument()
  })

  it('calls onFlip when clicked or when pressing Space or Enter', async () => {
    const onFlip = vi.fn()
    render(<FlashcardFace card={card} flipped={false} onFlip={onFlip} />)

    const button = screen.getByRole('button', { name: /Mặt trước: biodiversity/ })

    await userEvent.click(button)
    expect(onFlip).toHaveBeenCalledTimes(1)

    button.focus()
    await userEvent.keyboard('[Space]')
    expect(onFlip).toHaveBeenCalledTimes(2)

    await userEvent.keyboard('[Enter]')
    expect(onFlip).toHaveBeenCalledTimes(3)
  })

  it('updates aria-label and flipped state when flipped is true', () => {
    render(<FlashcardFace card={card} flipped={true} onFlip={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Mặt sau: sự đa dạng sinh học/ })).toBeInTheDocument()
  })
})
