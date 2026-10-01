export type TopicStatus = 'PASSED' | 'IN_PROGRESS' | 'LOCKED'
export type LessonStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED'
export type TestStatus = 'LOCKED' | 'AVAILABLE' | 'PASSED'
export type ExerciseState = 'NOT_ATTEMPTED' | 'FAILED' | 'PASSED'
export type ReviewStatus = 'PENDING' | 'DONE' | 'SKIPPED'

export interface TopicSummary {
  id: string
  code: string
  title: string
  description: string
  sequenceOrder: number
  status: TopicStatus
  completedLessons: number
  totalLessons: number
  lockedReason: string | null
}

export interface LessonSummary {
  id: string
  title: string
  sortOrder: number
  status: LessonStatus
  estimatedMinutes: number
  lockedReason: string | null
}

export interface FinalTestSummary {
  title: string
  testStatus: TestStatus
  questionCount: number
  lastPercent: number | null
}

export interface ReviewRef {
  reviewId: string
  knowledgePointCode: string
  knowledgePointTitle: string
}

export interface TopicLessonsResponse {
  topic: TopicSummary
  lessons: LessonSummary[]
  finalTest: FinalTestSummary
  pendingReviews: ReviewRef[]
}

export interface QuestionOption {
  value: string
  label: string
}

/** `options === null` means a free-text answer. */
export interface Question {
  id: string
  number: number
  prompt: string
  options: QuestionOption[] | null
}

export type AnswerMap = Record<string, string>

export interface AnswerInput {
  questionId: string
  answer: string
}

/** `correctAnswer` and `explanation` are only present when the block or set was passed. */
export interface QuestionResult {
  questionId: string
  correct: boolean
  correctAnswer?: string
  explanation?: string
}

export interface PassageParagraph {
  label: string | null
  text: string
}

export interface Passage {
  title: string
  paragraphs: PassageParagraph[]
}

/** Blocks arrive untyped from the API; renderers narrow them with the guards in `blockGuards.ts`. */
export interface RawBlock {
  id: string
  sortOrder: number
  type: string
  [field: string]: unknown
}

export interface TextBlockData extends RawBlock {
  type: 'TEXT'
  text: string
}

export interface PassageBlockData extends RawBlock, Passage {
  type: 'ASSET'
  assetType: 'PASSAGE'
  mediaUrl: null
}

export interface ExerciseBlockData extends RawBlock {
  type: 'EXERCISE'
  title: string
  instructions: string
  knowledgePointCode: string
  questions: Question[]
  state: ExerciseState
  savedAnswers: AnswerMap | null
  solutions: QuestionResult[] | null
}

export interface LessonDetail {
  id: string
  topicId: string
  topicTitle: string
  title: string
  sortOrder: number
  status: LessonStatus
  blocks: RawBlock[]
  nextLessonId: string | null
  pendingReviews: ReviewRef[]
}

export interface ExerciseSubmissionRequest {
  requestId: string
  answers: AnswerInput[]
}

export interface ExerciseSubmissionResult {
  blockId: string
  passed: boolean
  correctCount: number
  totalCount: number
  percent: number
  results: QuestionResult[]
  lessonCompleted: boolean
  nextLessonId: string | null
  pendingReviews: ReviewRef[]
}

export interface LessonCompletionResult {
  lessonCompleted: boolean
  nextLessonId: string | null
  pendingReviews: ReviewRef[]
}

export interface ReviewSet {
  setId: string
  packageCode: string
  attemptNumber: number
  maxAttempts: number
  passage: Passage
  questions: Question[]
}

export interface ReviewDetail {
  reviewId: string
  topicId: string
  status: ReviewStatus
  knowledgePoint: { code: string; title: string }
  sourceLessonTitle: string
  theory: RawBlock[]
  set: ReviewSet | null
  resumeLessonId: string | null
}

export interface ReviewSubmissionRequest {
  requestId: string
  setId: string
  answers: AnswerInput[]
}

export interface ReviewSubmissionResult {
  status: ReviewStatus
  passed: boolean
  correctCount: number
  totalCount: number
  percent: number
  results: QuestionResult[]
  resumeLessonId: string | null
  topicId: string
}

export interface TestAssignment {
  assignmentId: string
  topicId: string
  packageVersionId: string
  packageCode: string
}

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED'

export interface StartAttemptRequest {
  packageVersionId: string
  attemptType: 'TOPIC_TEST'
  mode: 'PRACTICE'
  channel: 'WEB'
  expiresAt: null
}

export interface AssessmentAttempt {
  id: string
  userId: string
  packageVersionId: string
  attemptType: string
  mode: string
  channel: string
  status: AttemptStatus
  startedAt: string
  submittedAt: string | null
  expiresAt: string | null
  rowVersion: number
  createdAt: string
  updatedAt: string
}

/** Mirrors `AttemptStructureResponse` of assessment-service: snapshots are JSON strings. */
export interface AttemptStructure {
  sections: AttemptSection[]
}

export interface AttemptSection {
  id: string
  contentSectionId: string
  sortOrder: number
  snapshot: string
  items: AttemptItem[]
}

export interface AttemptItem {
  id: string
  questionVersionId: string
  sortOrder: number
  questionSnapshot: string
  answerSnapshot: string | null
  knowledgeSnapshot: string | null
}

export interface SectionSnapshot {
  title: string
  instructions: string
  passage: Passage
}

export interface QuestionSnapshot {
  number: number
  prompt: string
  options: QuestionOption[] | null
}

/** `payload` is a JSON string such as `{"answer":"B"}`. */
export interface SaveItemResponseRequest {
  payload: string
  schemaVersion: number
  expectedRevision: number
}

export interface AttemptItemResponse {
  id: string
  attemptItemId: string
  payload: string
  schemaVersion: number
  revision: number
  savedAt: string
  submittedAt: string | null
}

export interface AttemptItemResult {
  itemId: string
  number: number
  prompt: string
  correct: boolean
  yourAnswer: string | null
  correctAnswer?: string
  explanation?: string
}

export interface AttemptResult {
  attemptId: string
  topicId: string
  packageCode: string
  score: number
  maxScore: number
  percent: number
  passed: boolean
  items: AttemptItemResult[]
  topicStatus: TopicStatus
  nextTopicId: string | null
}
