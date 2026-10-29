import { apiRequest } from '@/lib/httpClient'
import type { UnderstandingLevel } from '../lib/understanding'

export type NotebookSort = 'RECENT' | 'DUE' | 'ALPHABET' | 'WEAKEST'

export interface VocabularyCatalogSense {
  id: string
  vietnameseMeaning: string | null
  englishDefinition: string | null
  exampleSentence: string | null
  partOfSpeech?: string | null
  cefrLevel?: string | null
  topicId?: string | null
  topicName?: string | null
  register?: string | null
  grammarNote?: string | null
  usageNote?: string | null
  exampleTranslation?: string | null
}

export interface VocabularyCatalogItem {
  id: string
  lemma: string
  ipa: string | null
  ipaUk?: string | null
  ipaUs?: string | null
  pronunciationAudioReference: string | null
  audioUkReference?: string | null
  audioUsReference?: string | null
  frequencyRank?: number | null
  academicWordList?: boolean | null
  wordFamily?: string | null
  senses: VocabularyCatalogSense[]
}

export interface VocabularyCatalogPage {
  items: VocabularyCatalogItem[]
  page: number
  size: number
  total: number
}

export interface VocabularyItemDetailSense extends VocabularyCatalogSense {
  partOfSpeech?: string | null
}

export interface VocabularyItemDetail {
  id: string
  lemma: string
  ipa?: string | null
  phoneticUk?: string | null
  phoneticUs?: string | null
  pronunciationAudioReference?: string | null
  audioUk?: string | null
  audioUs?: string | null
  frequencyRank?: number | null
  cefrLevel?: string | null
  academicWordList?: boolean | null
  wordFamily?: string | null
  topic?: string | null
  imageUrl?: string | null
  senses: VocabularyItemDetailSense[]
  definitions?: Array<{ id?: string; definition: string; translation?: string; example?: string }>
  collocations?: Array<{ id?: string; phrase: string; meaning?: string; example?: string; relatedItemId?: string | null }>
  thesaurus?: Array<{ id?: string; word: string; relation: 'SYNONYM' | 'ANTONYM'; relatedItemId?: string | null }>
  commonMistakes?: Array<{ id?: string; mistake: string; correction: string; explanation?: string }>
  examples?: Array<{ id?: string; sentence: string; translation?: string; audio?: string }>
  counts?: {
    definitions?: number
    collocations?: number
    thesaurus?: number
    commonMistakes?: number
    examples?: number
  }
}

export interface VocabularyTopic {
  id: string
  slug: string
  name: string
  nameVi: string
  coverKey: string | null
  coverUrl: string | null
  sortOrder: number
  wordCount: number
}

export interface VocabularySetSummary {
  id: string
  title: string
  description: string | null
  kind: 'BAND' | 'TOPIC'
  cefrLevel: string | null
  bandRange: string | null
  coverKey: string | null
  coverUrl: string | null
  wordCount: number
  sortOrder: number
  status: 'ACTIVE' | 'INACTIVE'
}

export interface VocabularySetDetail extends VocabularySetSummary {
  topicSummaries?: Array<{ topicId: string; name: string; count: number }>
}

export interface VocabularySetsPage {
  items: VocabularySetSummary[]
  page: number
  size: number
  total: number
}

export type MindmapNodeType = 'TOPIC' | 'WORD' | 'COLLOCATION' | 'SYNONYM'

/** Shape of library-service `VocabularyMindmapResult.Node`; `itemId` is set on word nodes only. */
export interface MindmapNode {
  id: string
  type: MindmapNodeType
  label: string
  itemId: string | null
}

/** Shape of library-service `VocabularyMindmapResult.Edge`: topic → word, word → collocation/synonym. */
export interface MindmapEdge {
  from: string
  to: string
  kind: 'TOPIC_WORD' | 'COLLOCATION' | 'SYNONYM'
}

export interface MindmapResponse {
  nodes: MindmapNode[]
  edges: MindmapEdge[]
}

export interface WeeklyGoalDay {
  date: string
  weekday: string
  achieved: boolean
}

export interface WeeklyGoalResponse {
  target: number
  progress: number
  remaining: number
  days: WeeklyGoalDay[]
}

export interface VocabularyMapBand {
  band: string
  cefr: string
  total: number
  learned: number
  learning: number
  needsReview: number
  notLearned: number
}

export interface VocabularyMapResponse {
  bands: VocabularyMapBand[]
  currentBand: string | null
  suggestedBand: string | null
}

export interface TopicProgressItem {
  topicId: string
  name: string
  total: number
  learned: number
  percent: number
  status: 'COMPLETED' | 'LEARNING' | 'NOT_STARTED'
  nextWords?: Array<{ id: string; lemma: string }>
}

export interface TopicsProgressResponse {
  topics: TopicProgressItem[]
  current: TopicProgressItem | null
}

export interface SetProgressResponse {
  setId: string
  total: number
  learned: number
  learning: number
  needsReview: number
  notLearned: number
  percent: number
}

export interface RecentResultResponse {
  sessionId: string
  topic: string | null
  correct: number
  total: number
  percent: number
  finishedAt: string
}

export interface AchievementItem {
  code: string
  achieved: boolean
  progress: number
  target: number
}

export interface AchievementsResponse {
  items: AchievementItem[]
}

export interface LearningReportResponse {
  estimatedBand?: number
  placementCompleted?: boolean
  overallMastery?: number
}

/** Raw `/api/learning/report` body: `estimatedBand` is an object, flattened to a number by `getLearningReport`. */
interface LearningReportApiResponse extends Omit<LearningReportResponse, 'estimatedBand'> {
  estimatedBand?: { value: number | null; estimated: boolean } | null
}

export interface NotebookEntryResponse {
  flashcardId: string
  vocabularySenseId: string
  vocabularyItemId: string
  lemma: string
  ipa: string | null
  pronunciationAudioReference: string | null
  partOfSpeech: string | null
  vietnameseMeaning: string | null
  englishDefinition: string | null
  exampleSentence: string | null
  imageUrl: string | null
  level: UnderstandingLevel
  leitnerBox: number
  reviewCount: number
  lastReviewedAt: string | null
  nextReviewAt: string | null
  createdAt: string
  note: string | null
  cefrLevel?: string | null
  topicName?: string | null
}

export interface NotebookEntriesPage {
  items: NotebookEntryResponse[]
  page: number
  size: number
  total: number
}

export interface NotebookSummaryResponse {
  total: number
  byLevel: Record<UnderstandingLevel, number>
  dueNow: number
  addedLast7Days: number
  reviewedToday: number
  nextDueAt: string | null
  learnedCount?: number
  catalogTotal?: number
  learningCount?: number
  masteredCount?: number
}

export interface DueFlashcardsResponse {
  items: Array<{
    id: string
    userId: string
    sourceType: string
    vocabularySenseId: string | null
    front: string
    back: string
    leitnerBox: number
    nextReviewAt: string | null
    exampleSentence: string | null
    imageUrl: string | null
    ipa: string | null
    pronunciationAudioReference: string | null
  }>
  page: number
  size: number
  total: number
}

export interface AdminItemPayload {
  ipaUk?: string | null
  ipaUs?: string | null
  audioUkReference?: string | null
  audioUsReference?: string | null
  frequencyRank?: number | null
  academicWordList?: boolean | null
  wordFamily?: string | null
}

export interface AdminSensePayload {
  cefrLevel?: string | null
  topicId?: string | null
  register?: string | null
  grammarNote?: string | null
  usageNote?: string | null
  exampleTranslation?: string | null
}

export interface AdminTopicPayload {
  slug: string
  name: string
  nameVi: string
  coverKey?: string | null
  sortOrder?: number
  status: 'ACTIVE' | 'INACTIVE'
}

export interface AdminSetPayload {
  title: string
  description?: string | null
  kind: 'BAND' | 'TOPIC'
  cefrLevel?: string | null
  topicId?: string | null
  coverKey?: string | null
  sortOrder?: number
  status: 'ACTIVE' | 'INACTIVE'
}

const ROOT_NOTEBOOK = '/api/learning-support/flashcards/notebook'
const ROOT_FLASHCARDS = '/api/learning-support/flashcards'
const ROOT_CONTENT_VOCABULARY = '/api/content/vocabulary'
const ROOT_ADMIN_VOCABULARY = '/api/content/admin/vocabulary'

export const notebookApi = {
  /** Public catalog browsing (no auth required) */
  getCatalogVocabulary: (
    params: {
      q?: string
      lang?: 'EN' | 'VI'
      cefr?: string
      topicId?: string
      page?: number
      size?: number
    } = {},
    signal?: AbortSignal
  ) => {
    const searchParams = new URLSearchParams()
    if (params.q) searchParams.set('q', params.q.trim())
    if (params.lang) searchParams.set('lang', params.lang)
    if (params.cefr) searchParams.set('cefr', params.cefr)
    if (params.topicId) searchParams.set('topicId', params.topicId)
    if (params.page !== undefined) searchParams.set('page', String(params.page))
    if (params.size !== undefined) searchParams.set('size', String(params.size))

    const qs = searchParams.toString()
    return apiRequest<VocabularyCatalogPage>(
      `${ROOT_CONTENT_VOCABULARY}${qs ? `?${qs}` : ''}`,
      { auth: false, signal }
    )
  },

  /** Public detail of a vocabulary item by UUID */
  getVocabularyItem: (id: string, signal?: AbortSignal) =>
    apiRequest<VocabularyItemDetail>(`${ROOT_CONTENT_VOCABULARY}/${id}`, {
      auth: false,
      signal,
    }),

  /** Public prefix suggestions */
  getSuggestions: (q: string, signal?: AbortSignal) =>
    apiRequest<Array<{ id: string; lemma: string }>>(
      `${ROOT_CONTENT_VOCABULARY}/suggestions?q=${encodeURIComponent(q.trim())}`,
      { auth: false, signal }
    ),

  /** Public topic list */
  getTopics: (signal?: AbortSignal) =>
    apiRequest<VocabularyTopic[]>(`${ROOT_CONTENT_VOCABULARY}/topics`, {
      auth: false,
      signal,
    }),

  /** Public vocabulary sets list */
  getSets: (
    params: { kind?: 'BAND' | 'TOPIC'; page?: number; size?: number } = {},
    signal?: AbortSignal
  ) => {
    const searchParams = new URLSearchParams()
    if (params.kind) searchParams.set('kind', params.kind)
    if (params.page !== undefined) searchParams.set('page', String(params.page))
    if (params.size !== undefined) searchParams.set('size', String(params.size))

    const qs = searchParams.toString()
    return apiRequest<VocabularySetsPage>(
      `${ROOT_CONTENT_VOCABULARY}/sets${qs ? `?${qs}` : ''}`,
      { auth: false, signal }
    )
  },

  /** Public set detail by UUID */
  getSetDetail: (id: string, signal?: AbortSignal) =>
    apiRequest<VocabularySetDetail>(`${ROOT_CONTENT_VOCABULARY}/sets/${id}`, {
      auth: false,
      signal,
    }),

  /** Public set words list */
  getSetWords: (
    id: string,
    params: { topicId?: string; page?: number; size?: number } = {},
    signal?: AbortSignal
  ) => {
    const searchParams = new URLSearchParams()
    if (params.topicId) searchParams.set('topicId', params.topicId)
    if (params.page !== undefined) searchParams.set('page', String(params.page))
    if (params.size !== undefined) searchParams.set('size', String(params.size))

    const qs = searchParams.toString()
    return apiRequest<VocabularyCatalogPage>(
      `${ROOT_CONTENT_VOCABULARY}/sets/${id}/words${qs ? `?${qs}` : ''}`,
      { auth: false, signal }
    )
  },

  /** Public mindmap tree */
  getMindmap: (
    params: { topicId?: string; itemId?: string },
    signal?: AbortSignal
  ) => {
    const searchParams = new URLSearchParams()
    if (params.topicId) searchParams.set('topicId', params.topicId)
    if (params.itemId) searchParams.set('itemId', params.itemId)

    const qs = searchParams.toString()
    return apiRequest<MindmapResponse>(
      `${ROOT_CONTENT_VOCABULARY}/mindmap${qs ? `?${qs}` : ''}`,
      { auth: false, signal }
    )
  },

  /** Authenticated search used in lesson editor and quick add */
  searchVocabulary: (query: string, signal?: AbortSignal) =>
    apiRequest<Array<{ id: string; lemma: string; senses: VocabularyCatalogSense[] }>>(
      `/api/content/vocabulary/search?query=${encodeURIComponent(query.trim())}`,
      { auth: true, signal }
    ),

  /** Save a vocabulary sense into learner's notebook */
  saveNotebookEntry: (vocabularySenseId: string) =>
    apiRequest<NotebookEntryResponse>(`${ROOT_NOTEBOOK}/entries`, {
      method: 'POST',
      auth: true,
      body: { vocabularySenseId },
    }),

  /** Get list of saved sense IDs among given list of sense IDs */
  getSavedNotebookSenses: (senseIds: string[], signal?: AbortSignal) => {
    if (!senseIds || senseIds.length === 0) return Promise.resolve<string[]>([])
    const joined = senseIds.slice(0, 100).join(',')
    return apiRequest<string[]>(`${ROOT_NOTEBOOK}/saved?senseIds=${encodeURIComponent(joined)}`, {
      auth: true,
      signal,
    })
  },

  /** Paged notebook entries */
  getNotebookEntries: (
    params: {
      q?: string
      level?: UnderstandingLevel[]
      due?: boolean
      sort?: NotebookSort
      topicId?: string
      setId?: string
      page?: number
      size?: number
    } = {},
    signal?: AbortSignal
  ) => {
    const searchParams = new URLSearchParams()
    if (params.q) searchParams.set('q', params.q.trim())
    if (params.level && params.level.length > 0) {
      for (const lvl of params.level) searchParams.append('level', lvl)
    }
    if (params.due !== undefined) searchParams.set('due', String(params.due))
    if (params.sort) searchParams.set('sort', params.sort)
    if (params.topicId) searchParams.set('topicId', params.topicId)
    if (params.setId) searchParams.set('setId', params.setId)
    if (params.page !== undefined) searchParams.set('page', String(params.page))
    if (params.size !== undefined) searchParams.set('size', String(params.size))

    const qs = searchParams.toString()
    return apiRequest<NotebookEntriesPage>(`${ROOT_NOTEBOOK}/entries${qs ? `?${qs}` : ''}`, {
      auth: true,
      signal,
    })
  },

  /** Notebook statistical summary */
  getNotebookSummary: (timezone = 'Asia/Ho_Chi_Minh', signal?: AbortSignal) =>
    apiRequest<NotebookSummaryResponse>(
      `${ROOT_NOTEBOOK}/summary?timezone=${encodeURIComponent(timezone)}`,
      { auth: true, signal }
    ),

  /** Weekly goal */
  getWeeklyGoal: (timezone = 'Asia/Ho_Chi_Minh', signal?: AbortSignal) =>
    apiRequest<WeeklyGoalResponse>(
      `${ROOT_NOTEBOOK}/weekly-goal?timezone=${encodeURIComponent(timezone)}`,
      { auth: true, signal }
    ),

  /** Update weekly goal */
  updateWeeklyGoal: (targetWords: number, timezone = 'Asia/Ho_Chi_Minh') =>
    apiRequest<WeeklyGoalResponse>(
      `${ROOT_NOTEBOOK}/weekly-goal?timezone=${encodeURIComponent(timezone)}`,
      {
        method: 'PUT',
        auth: true,
        body: { targetWords },
      }
    ),

  /** Vocabulary 6-band map */
  getVocabularyMap: (currentCefr?: string, signal?: AbortSignal) => {
    const qs = currentCefr ? `?currentCefr=${encodeURIComponent(currentCefr)}` : ''
    return apiRequest<VocabularyMapResponse>(`${ROOT_NOTEBOOK}/vocabulary-map${qs}`, {
      auth: true,
      signal,
    })
  },

  /** Topics progress */
  getTopicsProgress: (setId?: string, signal?: AbortSignal) => {
    const qs = setId ? `?setId=${encodeURIComponent(setId)}` : ''
    return apiRequest<TopicsProgressResponse>(`${ROOT_NOTEBOOK}/topics-progress${qs}`, {
      auth: true,
      signal,
    })
  },

  /** Set progress */
  getSetProgress: (setId: string, signal?: AbortSignal) =>
    apiRequest<SetProgressResponse>(`${ROOT_NOTEBOOK}/sets/${setId}/progress`, {
      auth: true,
      signal,
    }),

  /** Recent review session result */
  getRecentResult: async (signal?: AbortSignal): Promise<RecentResultResponse | null> => {
    try {
      return await apiRequest<RecentResultResponse>(`${ROOT_NOTEBOOK}/recent-result`, {
        auth: true,
        signal,
      })
    } catch {
      return null
    }
  },

  /** Achievements */
  getAchievements: (timezone = 'Asia/Ho_Chi_Minh', signal?: AbortSignal) =>
    apiRequest<AchievementsResponse>(
      `${ROOT_NOTEBOOK}/achievements?timezone=${encodeURIComponent(timezone)}`,
      { auth: true, signal }
    ),

  /** Learner report from learning-service */
  getLearningReport: (signal?: AbortSignal): Promise<LearningReportResponse> =>
    apiRequest<LearningReportApiResponse>('/api/learning/report', {
      auth: true,
      signal,
    }).then((report) => {
      const value = report.estimatedBand?.value
      return {
        ...report,
        estimatedBand: value == null ? undefined : Number(value),
      }
    }),

  /** Set manual understanding level */
  setNotebookEntryLevel: (flashcardId: string, level: UnderstandingLevel, requestId?: string) =>
    apiRequest<void>(`${ROOT_NOTEBOOK}/entries/${flashcardId}/level`, {
      method: 'PUT',
      auth: true,
      body: { level, requestId: requestId ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now())) },
    }),

  /** Delete a notebook entry (soft delete) */
  deleteNotebookEntry: (flashcardId: string) =>
    apiRequest<void>(`${ROOT_FLASHCARDS}/${flashcardId}`, {
      method: 'DELETE',
      auth: true,
    }),

  /** Review a flashcard */
  reviewFlashcard: (
    flashcardId: string,
    correct: boolean,
    requestId?: string,
    sessionId?: string
  ) =>
    apiRequest<unknown>(`${ROOT_FLASHCARDS}/${flashcardId}/reviews`, {
      method: 'POST',
      auth: true,
      body: {
        correct,
        requestId: requestId ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now())),
        ...(sessionId ? { sessionId } : {}),
      },
    }),

  /** Get due flashcards for study */
  getDueFlashcards: (
    params: { deckId?: string; page?: number; limit?: number } = {},
    signal?: AbortSignal
  ) => {
    const searchParams = new URLSearchParams()
    if (params.deckId) searchParams.set('deckId', params.deckId)
    if (params.page !== undefined) searchParams.set('page', String(params.page))
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit))

    const qs = searchParams.toString()
    return apiRequest<DueFlashcardsResponse>(`${ROOT_FLASHCARDS}/due${qs ? `?${qs}` : ''}`, {
      auth: true,
      signal,
    })
  },

  /**
   * Saves the learner's one note for a sense and returns its id (null once cleared). Without a known id the existing
   * note is looked up first, so autosave updates that note instead of creating a new one on every pause; an empty
   * text deletes it, since the API rejects a blank body.
   */
  saveSenseNote: async (senseId: string, body: string, knownNoteId?: string | null): Promise<string | null> => {
    const text = body.slice(0, 300)
    const noteId = knownNoteId ?? (await apiRequest<{ items: Array<{ id: string }> }>(
      `/api/learning-support/notes?sourceType=VOCABULARY_SENSE&sourceReferenceId=${encodeURIComponent(senseId)}&size=1`,
      { auth: true },
    )).items[0]?.id ?? null
    if (!text.trim()) {
      if (noteId) await apiRequest<void>(`/api/learning-support/notes/${noteId}`, { method: 'DELETE', auth: true })
      return null
    }
    if (noteId) {
      await apiRequest<{ id: string }>(`/api/learning-support/notes/${noteId}`, {
        method: 'PUT',
        auth: true,
        body: { title: 'Vocabulary Note', body: text, status: 'ACTIVE' },
      })
      return noteId
    }
    const created = await apiRequest<{ id: string }>('/api/learning-support/notes', {
      method: 'POST',
      auth: true,
      body: { title: 'Vocabulary Note', body: text, sourceType: 'VOCABULARY_SENSE', sourceReferenceId: senseId },
    })
    return created.id
  },

  // --------------------------------------------------------------------------
  // Author / Admin APIs
  // --------------------------------------------------------------------------
  updateAdminItem: (id: string, body: AdminItemPayload) =>
    apiRequest<unknown>(`${ROOT_ADMIN_VOCABULARY}/items/${id}`, {
      method: 'PUT',
      auth: true,
      body,
    }),

  updateAdminSense: (id: string, body: AdminSensePayload) =>
    apiRequest<unknown>(`${ROOT_ADMIN_VOCABULARY}/senses/${id}`, {
      method: 'PUT',
      auth: true,
      body,
    }),

  updateAdminSenseCollocations: (
    senseId: string,
    collocations: Array<{ phrase: string; meaningVi?: string; example?: string }>
  ) =>
    apiRequest<unknown>(`${ROOT_ADMIN_VOCABULARY}/senses/${senseId}/collocations`, {
      method: 'PUT',
      auth: true,
      body: collocations,
    }),

  updateAdminSenseRelations: (
    senseId: string,
    relations: Array<{ relatedLemma: string; relatedItemId?: string | null; kind: 'SYNONYM' | 'ANTONYM' | 'RELATED' }>
  ) =>
    apiRequest<unknown>(`${ROOT_ADMIN_VOCABULARY}/senses/${senseId}/relations`, {
      method: 'PUT',
      auth: true,
      body: relations,
    }),

  updateAdminSenseCommonMistakes: (
    senseId: string,
    mistakes: Array<{ wrongUsage: string; correctUsage: string; explanation?: string }>
  ) =>
    apiRequest<unknown>(`${ROOT_ADMIN_VOCABULARY}/senses/${senseId}/common-mistakes`, {
      method: 'PUT',
      auth: true,
      body: mistakes,
    }),

  updateAdminSenseExamples: (
    senseId: string,
    examples: Array<{ sentence: string; translationVi?: string }>
  ) =>
    apiRequest<unknown>(`${ROOT_ADMIN_VOCABULARY}/senses/${senseId}/examples`, {
      method: 'PUT',
      auth: true,
      body: examples,
    }),

  getAdminTopics: (signal?: AbortSignal) =>
    apiRequest<VocabularyTopic[]>(`${ROOT_ADMIN_VOCABULARY}/topics`, {
      auth: true,
      signal,
    }),

  createAdminTopic: (body: AdminTopicPayload) =>
    apiRequest<VocabularyTopic>(`${ROOT_ADMIN_VOCABULARY}/topics`, {
      method: 'POST',
      auth: true,
      body,
    }),

  updateAdminTopic: (id: string, body: AdminTopicPayload) =>
    apiRequest<VocabularyTopic>(`${ROOT_ADMIN_VOCABULARY}/topics/${id}`, {
      method: 'PUT',
      auth: true,
      body,
    }),

  deleteAdminTopic: (id: string) =>
    apiRequest<void>(`${ROOT_ADMIN_VOCABULARY}/topics/${id}`, {
      method: 'DELETE',
      auth: true,
    }),

  getAdminSets: (signal?: AbortSignal) =>
    apiRequest<VocabularySetSummary[]>(`${ROOT_ADMIN_VOCABULARY}/sets`, {
      auth: true,
      signal,
    }),

  createAdminSet: (body: AdminSetPayload) =>
    apiRequest<VocabularySetSummary>(`${ROOT_ADMIN_VOCABULARY}/sets`, {
      method: 'POST',
      auth: true,
      body,
    }),

  updateAdminSet: (id: string, body: AdminSetPayload) =>
    apiRequest<VocabularySetSummary>(`${ROOT_ADMIN_VOCABULARY}/sets/${id}`, {
      method: 'PUT',
      auth: true,
      body,
    }),

  deleteAdminSet: (id: string) =>
    apiRequest<void>(`${ROOT_ADMIN_VOCABULARY}/sets/${id}`, {
      method: 'DELETE',
      auth: true,
    }),

  updateAdminSetItems: (setId: string, senseIds: string[]) =>
    apiRequest<void>(`${ROOT_ADMIN_VOCABULARY}/sets/${setId}/items`, {
      method: 'PUT',
      auth: true,
      body: senseIds,
    }),
}
