import { apiRequest } from '@/lib/httpClient'
import type { VocabularyState } from '@/features/overview/api/overviewApi'

export interface VocabularySense { id: string; vietnameseMeaning: string | null; englishDefinition: string | null; exampleSentence: string | null }
export interface VocabularyEntry { id: string; lemma: string; senses: VocabularySense[] }
export interface ReviewItem { vocabularySenseId: string; stateVersion: number; lemma: string; meaning: string; exampleSentence: string | null; answered: boolean }
export interface ReviewSession { id: string; expiresAt: string; recallSource: string; items: ReviewItem[] }
export interface ReviewAnswer { requestId: string; vocabularySenseId: string; expectedVersion: number; outcome: 'REMEMBERED' | 'FORGOT' }
export interface ReviewProgress { vocabularySenseId: string; state: VocabularyState; stateVersion: number; nextReviewAt: string | null; active: boolean }
const root = '/api/learning-support/flashcards'
export const vocabularyReviewApi = {
  search: (query: string, signal?: AbortSignal) => apiRequest<VocabularyEntry[]>(`/api/content/vocabulary/search?query=${encodeURIComponent(query)}`, { auth: true, signal }),
  add: (vocabularySenseId: string) => apiRequest<ReviewProgress>(`${root}/vocabulary-study-items`, { method: 'POST', auth: true, body: { vocabularySenseId, active: true } }),
  start: (requestId: string) => apiRequest<ReviewSession>(`${root}/vocabulary-review-sessions`, { method: 'POST', auth: true, body: { requestId, limit: 20 } }),
  answer: (sessionId: string, body: ReviewAnswer) => apiRequest<ReviewProgress>(`${root}/vocabulary-review-sessions/${sessionId}/answers`, { method: 'POST', auth: true, body }),
}
