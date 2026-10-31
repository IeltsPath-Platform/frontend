import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flashcardApi } from '@/features/flashcards/api/flashcardApi'
import { FlashcardDialog } from './FlashcardDialog'
import { FlashcardLibrary } from './FlashcardLibrary'

const { readFlashcardImage } = vi.hoisted(() => ({ readFlashcardImage: vi.fn() }))
vi.mock('../lib/flashcardStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/flashcardStorage')>()
  return { ...actual, readFlashcardImage }
})
vi.mock('@/features/flashcards/api/flashcardApi', () => ({
  flashcardApi: { uploadImage: vi.fn() },
}))

describe('FlashcardDialog image upload', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('uploads an image on save and stores the returned key instead of base64', async () => {
    readFlashcardImage.mockResolvedValue('data:image/png;base64,aGVsbG8=')
    vi.mocked(flashcardApi.uploadImage).mockResolvedValue({
      key: 'images/learner/image.png', url: 'https://media.test/image.png', contentType: 'image/png', size: 5,
    })
    render(<FlashcardDialog text="word" testId="test-1" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(document.getElementById('flash-meaning')!, { target: { value: 'meaning' } })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(['hello'], 'word.png', { type: 'image/png' })] } })
    await waitFor(() => expect(readFlashcardImage).toHaveBeenCalledOnce())
    fireEvent.click(document.querySelector('button[type="submit"]')!)

    await waitFor(() => expect(flashcardApi.uploadImage).toHaveBeenCalledOnce())
    const stored = localStorage.getItem('ielts-space.flashcards.v1') ?? ''
    expect(stored).toContain('images/learner/image.png')
    expect(stored).not.toContain('data:image/png;base64')
  })

  it('preserves saved cards and entered text when image validation fails', async () => {
    const existing = { id: 'saved', testId: 'test-1', word: 'existing', meaning: 'kept', example: '', createdAt: new Date().toISOString() }
    localStorage.setItem('ielts-space.flashcards.v1', JSON.stringify([existing]))
    readFlashcardImage.mockRejectedValue(new Error('Chọn ảnh PNG, JPG hoặc WebP.'))
    render(<FlashcardDialog text="new word" testId="test-1" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(document.getElementById('flash-meaning')!, { target: { value: 'new meaning' } })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(['bad'], 'wrong.gif', { type: 'image/gif' })] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Chọn ảnh PNG, JPG hoặc WebP.')
    expect(document.getElementById('flash-word')).toHaveValue('new word')
    expect(document.getElementById('flash-meaning')).toHaveValue('new meaning')
    expect(JSON.parse(localStorage.getItem('ielts-space.flashcards.v1') ?? '[]')).toEqual([existing])
    expect(flashcardApi.uploadImage).not.toHaveBeenCalled()
  })

  it('continues to render existing localStorage cards with base64 images', () => {
    const legacyImage = 'data:image/png;base64,aGVsbG8='
    localStorage.setItem('ielts-space.flashcards.v1', JSON.stringify([{
      id: 'saved', testId: 'test-1', word: 'existing', meaning: 'kept', example: '',
      image: legacyImage, createdAt: new Date().toISOString(),
    }]))

    const onEdit = vi.fn()
    render(<FlashcardLibrary onClose={vi.fn()} onEdit={onEdit} />)

    expect(document.querySelector('img')).toHaveAttribute('src', legacyImage)
    fireEvent.click(screen.getByRole('button', { name: /existing/ }))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'saved', image: legacyImage }))
  })

  it('converts a legacy card image to a stored key when that card is edited and saved', async () => {
    const legacy = {
      id: 'legacy', testId: 'test-1', word: 'existing', meaning: 'kept', example: '',
      image: 'data:image/png;base64,aGVsbG8=', createdAt: new Date().toISOString(),
    }
    localStorage.setItem('ielts-space.flashcards.v1', JSON.stringify([legacy]))
    vi.mocked(flashcardApi.uploadImage).mockResolvedValue({
      key: 'images/learner/legacy.png', url: 'https://media.test/legacy.png', contentType: 'image/png', size: 5,
    })
    render(<FlashcardDialog text="" testId="test-1" card={legacy} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(document.querySelector('button[type="submit"]')!)

    await waitFor(() => expect(flashcardApi.uploadImage).toHaveBeenCalledOnce())
    const saved = JSON.parse(localStorage.getItem('ielts-space.flashcards.v1') ?? '[]')
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ id: 'legacy', image: 'images/learner/legacy.png' })
    expect(JSON.stringify(saved)).not.toContain('data:image/png;base64')
  })
})
