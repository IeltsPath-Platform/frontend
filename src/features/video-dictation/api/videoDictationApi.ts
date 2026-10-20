import { apiRequest } from '@/lib/httpClient'

export const VIDEO_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type VideoLevel = (typeof VIDEO_LEVELS)[number]

/** One library card: a published video and how many of its sentences the learner has passed. */
export interface DictationVideoListItem {
  id: string
  youtubeVideoId: string
  title: string
  thumbnailUrl: string | null
  durationSeconds: number | null
  level: VideoLevel | null
  totalSegments: number
  passedSegments: number
  /** ISO time of the learner's latest answer on this video; null when they never typed one. */
  lastPracticedAt: string | null
}

export interface DictationSegment {
  id: string
  sequenceNo: number
  startMs: number
  endMs: number
  transcript: string
  translationVi: string | null
  /**
   * The pronunciation (IPA, with the slashes) of each word of `transcript`, in the order of `sentenceWords`; null for a
   * word that has none.
   */
  ipaWords: (string | null)[]
}

export interface DictationVideoDetail {
  id: string
  youtubeVideoId: string
  youtubeUrl: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  durationSeconds: number | null
  level: VideoLevel | null
  segments: DictationSegment[]
}

export interface DictationAttempt {
  id: string
  videoId: string
  segmentId: string
  attemptNo: number
  typedText: string
  correct: boolean
  accuracyPercent: number
  createdAt: string
}

export interface RecordDictationAttempt {
  segmentId: string
  typedText: string
  correct: boolean
  accuracyPercent: number
}

export interface DictationSegmentProgress {
  segmentId: string
  sequenceNo: number
  attempts: number
  bestAccuracyPercent: number | null
  passed: boolean
}

export interface DictationProgress {
  videoId: string
  totalSegments: number
  passedSegments: number
  nextSegmentId: string | null
  nextSequenceNo: number | null
  segments: DictationSegmentProgress[]
}

const root = '/api/learning-support/video-dictation'

export const videoDictationApi = {
  /** Published videos; the learner's passed / total sentence counts come with each one. */
  list: (signal?: AbortSignal) => apiRequest<DictationVideoListItem[]>(`${root}/videos`, { auth: true, signal }),
  detail: (videoId: string, signal?: AbortSignal) =>
    apiRequest<DictationVideoDetail>(`${root}/videos/${encodeURIComponent(videoId)}`, { auth: true, signal }),
  progress: (videoId: string, signal?: AbortSignal) =>
    apiRequest<DictationProgress>(`${root}/videos/${encodeURIComponent(videoId)}/progress`, { auth: true, signal }),
  recordAttempt: (body: RecordDictationAttempt) =>
    apiRequest<DictationAttempt>(`${root}/attempts`, { method: 'POST', auth: true, body }),
}
