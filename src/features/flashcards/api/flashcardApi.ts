import { apiRequest, HttpError } from '@/lib/httpClient'

export type FlashcardSourceType = 'MANUAL' | 'VOCABULARY_SENSE' | 'HIGHLIGHT' | 'PRACTICE_QUESTION'
export type LibraryStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED'

export interface Page<T> { items: T[]; page: number; size: number; total: number }

export interface Flashcard {
  id: string
  sourceType: FlashcardSourceType
  vocabularySenseId: string | null
  sourceReferenceId: string | null
  highlightedText: string | null
  front: string
  back: string
  status: LibraryStatus
  createdAt: string
  updatedAt: string
  leitnerBox: number
  nextReviewAt: string | null
  lastReviewedAt: string | null
  reviewCount: number
  ipa: string | null
  exampleSentence: string | null
  /** Image fields are optional until library-service exposes flashcard images. */
  imageKey?: string | null
  imageUrl?: string | null
}

export interface FlashcardDeck {
  id: string
  name: string
  description: string | null
  status: LibraryStatus
  createdAt: string
  updatedAt: string
  coverImageKey?: string | null
  coverImageUrl?: string | null
  cardCount?: number
  dueCount?: number
}

export interface DeckItem {
  deckId: string
  flashcardId: string
  sortOrder: number | null
  addedAt: string
  front: string
  back: string
  sourceType: FlashcardSourceType
  status: LibraryStatus
  /** Optional until library-service adds them to deck items. */
  imageUrl?: string | null
  exampleSentence?: string | null
  ipa?: string | null
  leitnerBox?: number
}

/**
 * "Đã thuộc" means the latest review was correct: any correct answer moves a card out of box 1 and any miss
 * sends it back, so a card marked learned on the deck page stays learned after a reload.
 */
export const isMastered = (card: { leitnerBox?: number }) => (card.leitnerBox ?? 1) >= 2

export interface CardDraft { front: string; back: string; exampleSentence: string | null; imageKey: string | null }
export interface DeckDraft { name: string; description: string | null; coverImageKey: string | null }
export interface UploadedImage { key: string; url: string; contentType: string; size: number }

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024

const cards = '/api/learning-support/flashcards'
const decks = '/api/learning-support/decks'

export const flashcardApi = {
  listCards: (page = 0, size = 50) => apiRequest<Page<Flashcard>>(`${cards}?page=${page}&size=${size}`, { auth: true }),
  getCard: (id: string) => apiRequest<Flashcard>(`${cards}/${id}`, { auth: true }),
  createCard: (draft: CardDraft) => apiRequest<Flashcard>(cards, {
    method: 'POST', auth: true, body: { sourceType: 'MANUAL', ...draft },
  }),
  /** PUT replaces the card, so source fields of the existing card are sent back unchanged. */
  updateCard: (card: Flashcard, draft: CardDraft) => apiRequest<Flashcard>(`${cards}/${card.id}`, {
    method: 'PUT', auth: true, body: {
      sourceType: card.sourceType,
      vocabularySenseId: card.vocabularySenseId,
      sourceReferenceId: card.sourceReferenceId,
      highlightedText: card.highlightedText,
      status: 'ACTIVE',
      ...draft,
    },
  }),
  deleteCard: (id: string) => apiRequest<void>(`${cards}/${id}`, { method: 'DELETE', auth: true }),
  dueCards: (deckId?: string, limit = 20) => apiRequest<Page<Flashcard>>(
    `${cards}/due?limit=${limit}${deckId ? `&deckId=${deckId}` : ''}`, { auth: true }),
  review: (id: string, correct: boolean, requestId: string) => apiRequest<Flashcard>(`${cards}/${id}/reviews`, {
    method: 'POST', auth: true, body: { correct, requestId },
  }),
  uploadImage: (file: File, signal?: AbortSignal) => {
    const form = new FormData()
    form.append('file', file)
    return apiRequest<UploadedImage>(`${cards}/images`, { method: 'POST', auth: true, body: form, signal })
  },

  listDecks: (page = 0, size = 50) => apiRequest<Page<FlashcardDeck>>(`${decks}?page=${page}&size=${size}`, { auth: true }),
  getDeck: (id: string) => apiRequest<FlashcardDeck>(`${decks}/${id}`, { auth: true }),
  createDeck: (draft: DeckDraft) => apiRequest<FlashcardDeck>(decks, { method: 'POST', auth: true, body: draft }),
  updateDeck: (id: string, draft: DeckDraft) => apiRequest<FlashcardDeck>(`${decks}/${id}`, {
    method: 'PUT', auth: true, body: { ...draft, status: 'ACTIVE' },
  }),
  deleteDeck: (id: string) => apiRequest<void>(`${decks}/${id}`, { method: 'DELETE', auth: true }),
  deckItems: (id: string, page = 0, size = 100) => apiRequest<Page<DeckItem>>(`${decks}/${id}/items?page=${page}&size=${size}`, { auth: true }),
  addToDeck: (deckId: string, flashcardId: string, sortOrder?: number) => apiRequest<void>(`${decks}/${deckId}/items`, {
    method: 'POST', auth: true, body: { flashcardId, sortOrder },
  }),
  removeFromDeck: (deckId: string, flashcardId: string) => apiRequest<void>(`${decks}/${deckId}/items/${flashcardId}`, {
    method: 'DELETE', auth: true,
  }),
}

export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Chọn ảnh PNG, JPG hoặc WebP.'
  if (file.size <= 0) return 'Tệp ảnh đang trống.'
  if (file.size > IMAGE_MAX_BYTES) return 'Ảnh vượt quá 2 MB. Hãy chọn ảnh nhỏ hơn.'
  return null
}

export function flashcardErrorMessage(error: unknown, fallback = 'Không thực hiện được. Vui lòng thử lại.') {
  if (error instanceof HttpError) {
    if (error.status === 409) return 'Tên bộ thẻ đã tồn tại. Hãy chọn tên khác.'
    if (error.status === 404) return 'Không tìm thấy dữ liệu. Có thể nó đã bị xóa.'
    if (error.status === 413) return 'Ảnh vượt quá 2 MB. Hãy chọn ảnh nhỏ hơn.'
    if (error.status === 503) return 'Kho ảnh tạm thời không khả dụng. Vui lòng thử lại sau.'
    // library-service puts this code in `message`; the image must be re-uploaded by the same user.
    if (error.message === 'INVALID_IMAGE_KEY') return 'Ảnh không hợp lệ hoặc đã bị xóa. Hãy tải ảnh lại.'
    return error.message
  }
  return error instanceof Error ? error.message : fallback
}

/** Lines like "word - meaning" or "word: meaning" (tab also accepted) for quick topic-based import. */
export function parseBulkCards(text: string): { front: string; back: string }[] {
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?)\s*(?:\t|\s-\s|:|=)\s*(.+)$/)
      return match ? { front: match[1].trim(), back: match[2].trim() } : null
    })
    .filter((card): card is { front: string; back: string } => card !== null && card.front.length > 0 && card.back.length > 0)
}

/** The API caps pages at 100 items, so study modes and the editor read every page of a deck. */
export async function loadAllDeckItems(deckId: string): Promise<DeckItem[]> {
  const all: DeckItem[] = []
  for (let page = 0; ; page++) {
    const result = await flashcardApi.deckItems(deckId, page, 100)
    all.push(...result.items)
    if (result.items.length === 0 || all.length >= result.total) return all
  }
}

/** Runs async jobs with a small concurrency cap so a large deck does not flood the gateway. */
export async function runLimited<T, R>(items: readonly T[], limit: number, job: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await job(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
