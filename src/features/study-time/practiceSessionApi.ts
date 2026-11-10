import { apiRequest } from '@/lib/httpClient'

export type PracticeSessionKind = 'WRITING' | 'SPEAKING' | 'VOCABULARY'
export interface PracticeSession { id: string; kind: PracticeSessionKind; expiresAt: string }

export function openPracticeSession(requestId: string, kind: PracticeSessionKind, signal?: AbortSignal) {
  return apiRequest<PracticeSession>('/api/learning/practice-sessions', {
    method: 'POST', auth: true, body: { requestId, kind }, signal,
  })
}
