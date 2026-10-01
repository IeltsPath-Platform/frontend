import type { Passage, PassageBlockData, Question, RawBlock, TextBlockData } from '~types/learningPath'

/** `accepted[0]` is the canonical answer; free-text answers compare case-insensitively. */
export interface MockQuestion extends Question {
  accepted: string[]
  explanation: string
}

export interface MockExerciseBlock extends RawBlock {
  type: 'EXERCISE'
  title: string
  instructions: string
  knowledgePointCode: string
  questions: MockQuestion[]
}

export type MockLessonBlock = TextBlockData | PassageBlockData | MockExerciseBlock | RawBlock

export interface MockLesson {
  id: string
  topicId: string
  title: string
  sortOrder: number
  estimatedMinutes: number
  blocks: MockLessonBlock[]
}

export interface MockTopic {
  id: string
  code: string
  title: string
  description: string
  sequenceOrder: number
  lessonIds: string[]
  testTitle: string
  testQuestionCount: number
  testPackageCodes: string[]
}

export interface MockKnowledgePoint {
  code: string
  title: string
  theoryLessonId: string
}

export interface MockReviewSet {
  packageCode: string
  passage: Passage
  questions: MockQuestion[]
}

export interface MockTestSection {
  id: string
  title: string
  instructions: string
  passage: Passage
  questions: MockQuestion[]
}

export interface MockTestPackage {
  code: string
  packageVersionId: string
  topicId: string
  sections: MockTestSection[]
}

export const TFNG_OPTIONS = [
  { value: 'TRUE', label: 'TRUE' },
  { value: 'FALSE', label: 'FALSE' },
  { value: 'NOT GIVEN', label: 'NOT GIVEN' },
]

export function text(id: string, sortOrder: number, body: string): TextBlockData {
  return { id, sortOrder, type: 'TEXT', text: body }
}

type ParagraphSource = [label: string | null, body: string]

export function toPassage(title: string, paragraphs: ParagraphSource[]): Passage {
  return { title, paragraphs: paragraphs.map(([label, body]) => ({ label, text: body })) }
}

export function passage(id: string, sortOrder: number, title: string, paragraphs: ParagraphSource[]): PassageBlockData {
  return { id, sortOrder, type: 'ASSET', assetType: 'PASSAGE', mediaUrl: null, ...toPassage(title, paragraphs) }
}

export function choice(
  id: string,
  number: number,
  prompt: string,
  options: [string, string][],
  correct: string,
  explanation: string,
): MockQuestion {
  return { id, number, prompt, options: options.map(([value, label]) => ({ value, label })), accepted: [correct], explanation }
}

export function tfng(id: string, number: number, prompt: string, correct: 'TRUE' | 'FALSE' | 'NOT GIVEN', explanation: string): MockQuestion {
  return { id, number, prompt, options: TFNG_OPTIONS, accepted: [correct], explanation }
}

export function gap(id: string, number: number, prompt: string, accepted: string[], explanation: string): MockQuestion {
  return { id, number, prompt, options: null, accepted, explanation }
}
