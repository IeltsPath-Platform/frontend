import type { ErrorHint, Passage, Question } from '~types/learningPath'

/** `accepted[0]` is the canonical answer; free-text answers compare case-insensitively. */
export interface MockQuestion extends Question {
  accepted: string[]
  explanation: string
  /** The mistake a wrong answer stands for, by answer value, when the mock can name it. */
  traps?: Record<string, ErrorHint>
}

export const MOCK_NG_AS_FALSE: ErrorHint = {
  code: 'TFNG_NG_AS_FALSE',
  name: 'Chọn False khi thông tin không được nêu',
  fixHint: 'Phân biệt "bài nói sai" (False) với "bài không nói tới" (Not Given) trước khi chọn.',
}

export const MOCK_FALSE_AS_NG: ErrorHint = {
  code: 'TFNG_FALSE_AS_NG',
  name: 'Chọn Not Given khi bài đã nói ngược lại',
  fixHint: 'Tìm câu trong bài nói ngược lại với câu hỏi trước khi kết luận là Not Given.',
}

export const MOCK_PARAPHRASE_TRAP: ErrorHint = {
  code: 'PARAPHRASE_TRAP',
  name: 'Bị đánh lừa bởi cách diễn đạt gần nghĩa',
  fixHint: 'Đọc lại đoạn văn gốc và kiểm tra ý có giữ nguyên nghĩa không, đừng chỉ dựa vào từ khóa.',
}

export const MOCK_WRONG_PARAGRAPH: ErrorHint = {
  code: 'WRONG_PARAGRAPH',
  name: 'Tìm nhầm đoạn văn',
  fixHint: 'Xác định đoạn chứa thông tin bằng ý chính của từng đoạn, không chỉ bằng một chi tiết.',
}

export const MOCK_DETAIL_AS_MAIN_IDEA: ErrorHint = {
  code: 'DETAIL_AS_MAIN_IDEA',
  name: 'Lấy chi tiết làm ý chính',
  fixHint: 'Ý chính bao trùm cả đoạn; một chi tiết chỉ minh họa cho ý đó.',
}

/** Every mistake the mock can name, by error code. */
export const MOCK_ERROR_HINTS: Record<string, ErrorHint> = Object.fromEntries(
  [MOCK_NG_AS_FALSE, MOCK_FALSE_AS_NG, MOCK_PARAPHRASE_TRAP, MOCK_WRONG_PARAGRAPH, MOCK_DETAIL_AS_MAIN_IDEA]
    .map((hint) => [hint.code, hint]),
)

export interface MockResourceLink {
  id: string
  title: string
  url: string
}

export interface MockLesson {
  id: string
  topicId: string
  title: string
  sortOrder: number
  estimatedMinutes: number
  summaryMarkdown: string
  slides: MockResourceLink[]
  documents: MockResourceLink[]
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

type ParagraphSource = [label: string | null, body: string]

export function toPassage(title: string, paragraphs: ParagraphSource[]): Passage {
  return { title, paragraphs: paragraphs.map(([label, body]) => ({ label, text: body })) }
}

export function choice(
  id: string,
  number: number,
  prompt: string,
  options: [string, string][],
  correct: string,
  explanation: string,
  traps?: Record<string, ErrorHint>,
): MockQuestion {
  return {
    id, number, prompt, options: options.map(([value, label]) => ({ value, label })), accepted: [correct], explanation,
    ...(traps ? { traps } : {}),
  }
}

export function tfng(id: string, number: number, prompt: string, correct: 'TRUE' | 'FALSE' | 'NOT GIVEN', explanation: string): MockQuestion {
  const traps: Record<string, ErrorHint> | undefined = correct === 'NOT GIVEN'
    ? { FALSE: MOCK_NG_AS_FALSE }
    : correct === 'FALSE' ? { 'NOT GIVEN': MOCK_FALSE_AS_NG } : undefined
  return { id, number, prompt, options: TFNG_OPTIONS, accepted: [correct], explanation, ...(traps ? { traps } : {}) }
}

export function gap(id: string, number: number, prompt: string, accepted: string[], explanation: string): MockQuestion {
  return { id, number, prompt, options: null, accepted, explanation }
}
