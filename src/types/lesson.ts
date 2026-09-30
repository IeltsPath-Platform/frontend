export type LessonWorkspaceView = 'materials' | 'quiz' | 'vocabulary'

export interface LessonMaterialSection {
  id: string
  title: string
  description: string
  items: readonly string[]
}

export interface LessonQuizQuestion {
  id: string
  prompt: string
  audioLabel: string
  choices: readonly string[]
  correctChoiceIndex: number
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

export interface LessonWorkspaceData {
  lessonId: string
  sessionNumber: number
  level: string
  title: string
  topic: string
  materials: readonly LessonMaterialSection[]
  quizQuestions: readonly LessonQuizQuestion[]
  vocabulary: readonly VocabularyEntry[]
}
