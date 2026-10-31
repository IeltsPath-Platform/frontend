import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getFlashcardImageSource, loadFlashcards, readFlashcardImage, saveFlashcard } from './flashcardStorage'

const legacyImage = 'data:image/png;base64,aGVsbG8='
const card = (image?: string) => ({
  id: crypto.randomUUID(), testId: 'test-1', word: 'word', meaning: 'meaning', example: '',
  image, createdAt: new Date().toISOString(),
})

describe('practice flashcard image storage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('VITE_SUPABASE_MEDIA_HOST', 'kndrsdqzbzsaiuuruqno.supabase.co')
  })

  it('keeps legacy base64 images readable and renders them unchanged', () => {
    saveFlashcard(card(legacyImage))

    expect(loadFlashcards()[0]?.image).toBe(legacyImage)
    expect(getFlashcardImageSource(legacyImage)).toBe(legacyImage)
  })

  it('stores image object keys and resolves them to the public flashcards URL', () => {
    const key = 'images/learner/2e0fb9c8.webp'
    saveFlashcard(card(key))

    expect(loadFlashcards()[0]?.image).toBe(key)
    expect(getFlashcardImageSource(key)).toBe(
      `https://kndrsdqzbzsaiuuruqno.supabase.co/storage/v1/object/public/flashcards/${key}`,
    )
  })

  it('updates a saved card by id instead of creating a duplicate', () => {
    const original = card('images/learner/old.png')
    saveFlashcard(original)
    saveFlashcard({ ...original, meaning: 'updated' })

    expect(loadFlashcards()).toHaveLength(1)
    expect(loadFlashcards()[0]?.meaning).toBe('updated')
  })

  it('does not invent a public URL when the media host is not configured', () => {
    vi.stubEnv('VITE_SUPABASE_MEDIA_HOST', '')

    expect(getFlashcardImageSource('images/learner/image.webp')).toBeUndefined()
  })

  it('rejects an image larger than the upload endpoint limit before reading it', async () => {
    const tooLarge = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })

    await expect(readFlashcardImage(tooLarge)).rejects.toThrow('2 MB')
  })
})
