export type TopicStatus = 'PASSED' | 'IN_PROGRESS' | 'LOCKED'
export type LessonStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED'
export type TestStatus = 'LOCKED' | 'AVAILABLE' | 'PASSED' | 'NONE'
export type PracticeStatus = 'LOCKED' | 'REQUIRED' | 'PASSED'
export type PracticeSetItemStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'PASSED' | 'ATTEMPTED'
export type ReviewStage = 'PRACTICE' | 'THEORY'
export type ExerciseState = 'NOT_ATTEMPTED' | 'FAILED' | 'PASSED'
export type ReviewStatus = 'PENDING' | 'DONE' | 'SKIPPED'

export interface CourseRef {
  id: string
  code: string
  title: string
  bandLevel: number
}

export interface CourseSummary extends CourseRef {
  topicCount: number
  passedTopicCount: number
  /** Placement guidance only; every course stays open. */
  recommended: boolean
  testStatus: TestStatus
}

export interface TopicSummary {
  id: string
  course: CourseRef | null
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
  /** From BE topic lessons; omitted/null in mock when unused. */
  practiceStatus?: PracticeStatus | null
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
  /** Present when BE reveals a hint (after a wrong answer while block unpassed). */
  hint?: string | null
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
  hint?: string | null
}

export interface PassageParagraph {
  label: string | null
  text: string
}

export interface Passage {
  title: string
  paragraphs: PassageParagraph[]
}

export interface MediaAudio {
  mediaUrl: string
  durationSeconds: number | null
  transcript?: string | null
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

export interface AudioBlockData extends RawBlock {
  type: 'ASSET'
  assetType: 'AUDIO'
  mediaUrl: string
  durationSeconds: number | null
  transcript: string | null
}

export interface ExerciseBlockData extends RawBlock {
  type: 'EXERCISE'
  blockKind?: 'EXERCISE'
  title: string
  instructions: string
  knowledgePointCode: string
  questions: Question[]
  state: ExerciseState
  savedAnswers: AnswerMap | null
  solutions: QuestionResult[] | null
}

export interface EssayImage {
  mediaUrl: string
  altText: string
}

export interface EssayLatestSubmission {
  id: string
  status: string
  overallBand: number | null
  passed: boolean | null
}

export interface EssayBlockData extends RawBlock {
  type: 'EXERCISE'
  blockKind: 'ESSAY'
  title: string
  questionVersionId: string
  stem: string
  task: string
  minWords: number
  passBand: number
  images: EssayImage[]
  latestSubmission: EssayLatestSubmission | null
  sampleAnswer: string | null
}

export interface WritingCriterion {
  code: string
  band: number
  strengths: string[]
  improvements: string[]
}

export interface WritingCorrection {
  excerpt: string
  suggestion: string
  category: string
}

export interface WritingSubmissionResult {
  submissionId: string
  status: string
  task?: string
  wordCount?: number
  overallBand?: number | null
  passed?: boolean | null
  criteria?: WritingCriterion[]
  corrections?: WritingCorrection[]
  summary?: string
  pointsCharged?: number
  sampleAnswer?: string | null
  code?: string
  failureCode?: string
}

export interface EssaySubmissionRequest {
  requestId: string
  essayText: string
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
  audio: MediaAudio | null
  questions: Question[]
}

export interface ReviewDetail {
  reviewId: string
  topicId: string
  status: ReviewStatus
  stage: ReviewStage
  knowledgePoint: { code: string; title: string }
  sourceLessonTitle: string
  theory: RawBlock[]
  set: ReviewSet | null
  quickCheck: Question[]
  failedSets: number
  maxFailedSets: number
  theoryReason: string | null
  resumeLessonId: string | null
}

export interface ReviewSubmissionRequest {
  requestId: string
  setId: string
  answers: AnswerInput[]
}

export interface ReviewSubmissionResult {
  status: ReviewStatus
  stage: ReviewStage
  passed: boolean
  correctCount: number
  totalCount: number
  percent: number
  failedSets: number
  results: QuestionResult[]
  resumeLessonId: string | null
  topicId: string
}

export interface TheoryCheckRequest {
  requestId: string
  answers: AnswerInput[]
}

export interface TheoryCheckResult {
  reviewId: string
  correct: number
  total: number
  stage: ReviewStage
  results: QuestionResult[]
}

export interface PracticeSetItem {
  packageId: string
  code: string
  title: string
  questionCount: number
  accessLevel: string
  status: PracticeSetItemStatus
  bestPercent: number | null
  lastAttemptId: string | null
  revealed: boolean
}

export interface LessonPracticeSets {
  lessonId: string
  skill: string
  lessonCompleted: boolean
  practiceStatus: PracticeStatus
  practicePassReason: string | null
  items: PracticeSetItem[]
}

export interface PracticeAttemptView {
  attemptId: string
  packageId: string
  packageVersionId: string
  passage: Passage | null
  audio: MediaAudio | null
  questions: Question[]
}

export interface PracticeSubmissionRequest {
  requestId: string
  answers: AnswerInput[]
}

export interface PracticeReviewCreated {
  reviewId: string
  knowledgePointId: string
  stage: ReviewStage
}

export interface PracticeSubmissionResult {
  attemptId: string
  correct: number
  total: number
  percent: number
  passed: boolean
  countedAsEvidence: boolean
  results: QuestionResult[]
  reviewsCreated: PracticeReviewCreated[]
}

export interface TestAssignment {
  assignmentId: string
  topicId: string
  packageVersionId: string
  packageCode: string
}

/** The published placement test a learner without a placement band sits first. */
export interface PlacementTest {
  packageId: string
  packageVersionId: string
}

/** The learner's study goal from the placement survey (POST /api/users/me/learning-goals). */
export interface LearningGoalRequest {
  targetBand: number
  /** ISO date (yyyy-mm-dd) in the future, or null when the learner has not picked one. */
  examDate: string | null
  availableMinutesPerDay: number
}

/** The learner's active study goal (GET /api/users/me/learning-goals/active). */
export interface LearningGoal extends LearningGoalRequest {
  id: string
  status: string
}

export type PlacementSkill = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING'

/** A graded placement: the overall band, the skill bands averaged into it and the report detail per section. */
export interface PlacementResult {
  attemptId: string
  overallBand: number | null
  completedAt: string | null
  skills: { skill: PlacementSkill; band: number }[]
  /** In test order; empty from a backend that predates the report. */
  sections: PlacementReportSection[]
}

export interface PlacementReportSection {
  skill: PlacementSkill
  title: string | null
  /** Listening and Reading only. */
  questions: PlacementReportQuestion[]
  /** Writing only. */
  essays: PlacementReportEssay[]
}

export interface PlacementReportQuestion {
  number: number
  prompt: string
  /** Null when left blank. */
  learnerAnswer: string | null
  correctAnswer: string | null
  correct: boolean
  explanation: string | null
}

export interface PlacementReportEssay {
  task: 'TASK_1' | 'TASK_2' | string | null
  /** Null while still being graded. */
  band: number | null
  /** False when the learner handed the section in without an essay. */
  submitted: boolean
  /** The LLM examiner's comments; null when the essay was graded without them. */
  feedback: {
    summary: string | null
    criteria: { code: string; band: number | null; comment: string | null }[]
    focus: string[]
  } | null
}

/** A Writing essay or Speaking recording attached to an attempt item (POST /api/assessments/submissions). */
export interface LearnerSubmissionRequest {
  attemptItemId: string
  /** JSON text of the prompt the learner answered. */
  promptSnapshot: string
  skill: 'WRITING' | 'SPEAKING'
  textPayload?: string
  audioReference?: string
  submissionKey: string
}

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'CANCELLED'

export interface StartAttemptRequest {
  packageVersionId: string
  attemptType: 'TOPIC_TEST' | 'PLACEMENT_TEST'
  mode: 'STANDARD' | 'PRACTICE'
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
  /** Set the first time the learner opens the section. */
  startedAt: string | null
  /** Set once the learner finished the section; it then takes no more responses. */
  completedAt: string | null
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
  skill?: string
  passage: Passage | null
  audio: MediaAudio | null
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
