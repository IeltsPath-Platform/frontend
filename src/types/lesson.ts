/** The resources, vocabulary, exercises and embedded Practice of a lesson page. */
export type LessonTab = 'slides' | 'summary' | 'documents' | 'vocabulary' | 'exercises' | 'practice'

export interface LessonSlideItem {
  id: string
  title: string
  url: string
  sortOrder: number
}

export interface LessonDocumentItem {
  id: string
  title: string
  url: string
  sortOrder: number
}

/** Response of GET /api/learning/lessons/{id}/resources. `summaryMarkdown` is null when the lesson has none. */
export interface LessonResourcesResponse {
  lessonId: string
  summaryMarkdown: string | null
  slides: LessonSlideItem[]
  documents: LessonDocumentItem[]
}

export interface VocabularyEntry {
  id: string
  word: string
  partOfSpeech: string
  level: string
  phoneticUk: string
  phoneticUs: string
  meaning: string
  translation: string
  tags: readonly string[]
  example: string
}
