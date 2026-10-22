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
  /** Lessons of the course's topics the learner completed, and how many there are. */
  completedLessons: number
  totalLessons: number
  /** ISO time the learner last opened a lesson or submitted a practice set of the course; null if never. */
  lastStudiedAt: string | null
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
  /** From GET /topics when present (READING / LISTENING / …). */
  skill?: string | null
  accessLevel?: 'FREE' | 'PREMIUM' | null
}

export interface LessonSummary {
  id: string
  title: string
  sortOrder: number
  status: LessonStatus
  /** Null when the author has not set a duration; the UI then shows none. */
  estimatedMinutes: number | null
  lockedReason: string | null
  /** The oldest pending review that blocks this lesson; the lesson opens once it is done. */
  blockingReviewId?: string | null
  /** From BE topic lessons; omitted/null in mock when unused. */
  practiceStatus?: PracticeStatus | null
  practicePassReason?: string | null
}

export interface FinalTestSummary {
  title: string
  testStatus: TestStatus
  questionCount: number
  lastPercent: number | null
}

export interface ReviewRef {
  reviewId: string
  lessonId?: string
  /** False for optional reviews; legacy gate responses omit this field. */
  blocking?: boolean
  /** The Practice set whose attempt created the review; absent for reviews from assessments. */
  sourcePackageId?: string | null
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
  /** Content group identifier used to reconstruct question-format headings in practice tests. */
  groupId?: string | null
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

/** Shapes shared by the exercise, passage and audio components. */
export interface RawBlock {
  id: string
  sortOrder: number
  type: string
  [field: string]: unknown
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

export interface VocabularyBlockData extends RawBlock {
  type: 'VOCABULARY'
  vocabularySenseIds: string[]
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
  essayText?: string | null
  task?: string
  wordCount?: number
  overallBand?: number | null
  passed?: boolean | null
  criteria?: WritingCriterion[]
  corrections?: WritingCorrection[]
  studyPoints?: Partial<EssayStudyPoint>[]
  summary?: string
  pointsCharged?: number
  sampleAnswer?: string | null
  code?: string
  failureCode?: string
}

/** A lesson and its status. Its summary, slides and documents are read separately (see `types/lesson.ts`). */
/** The lesson content: passages, audio, vocabulary and auto-graded exercises. */
export type LessonBlock = PassageBlockData | AudioBlockData | VocabularyBlockData | ExerciseBlockData

export interface LessonDetail {
  id: string
  topicId: string
  topicTitle: string
  title: string
  sortOrder: number
  status: LessonStatus
  nextLessonId: string | null
  pendingReviews: ReviewRef[]
  /** Content blocks in lesson order. Vocabulary is supplemental and carries no completion state. */
  blocks?: LessonBlock[]
}

/** The answer to one exercise block: the verdict, what to show per question, and whether it finished the lesson. */
export interface LessonExerciseResult {
  blockPassed: boolean
  lessonCompleted: boolean
  results: QuestionResult[]
  gamification: GamificationSummary | null
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
  maxAttempts: number | null
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
  /** Markdown: the summary of the lesson that teaches the knowledge point. */
  theory: string[]
  set: ReviewSet | null
  failedSets: number
  maxFailedSets: number | null
  theoryReason: string | null
  resumeLessonId: string | null
}

export interface ExerciseSubmissionRequest {
  requestId: string
  answers: AnswerInput[]
}

export interface ReviewSubmissionRequest {
  requestId: string
  setId: string
  answers: AnswerInput[]
}

/**
 * What one submission did to the learner's XP and hearts. `heartsLost`, `heartsRemaining` and `nextHeartAt` are `null`
 * for a submission that costs no hearts, such as a review set.
 */
export interface GamificationSummary {
  xpEarned: number
  /** True when an answer went past the daily XP cap, so part of the XP did not count. */
  xpCapped: boolean
  totalXp: number
  level: number
  leveledUp: boolean
  heartsLost: number | null
  heartsRemaining: number | null
  nextHeartAt: string | null
}

/** The learner's hearts (`GET /api/learning/me/hearts`). `nextHeartAt` is `null` while the hearts are full. */
export interface HeartsStatus {
  hearts: number
  maxHearts: number
  nextHeartAt: string | null
  /** Points a full refill costs. */
  refillCost: number
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
  gamification: GamificationSummary | null
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
  /** Skills of the set's questions; a set of only Writing is graded by band, not by a percentage of right answers. */
  skills?: string[]
}

export interface LessonPracticeSets {
  lessonId: string
  skill: string
  lessonCompleted: boolean
  practiceStatus: PracticeStatus
  practicePassReason: string | null
  items: PracticeSetItem[]
}

/** An essay of a Practice set. `latest` is the newest submission: its band and verdict show only once it is GRADED. */
export interface PracticeEssay {
  id: string
  number: number
  prompt: string
  task: 'TASK_1' | 'TASK_2' | null
  minWords: number | null
  passBand: number | null
  /** Learner-facing guidance and chart assets for this prompt, when Content provides them. */
  guide?: string | null
  images?: Array<{ mediaUrl: string; altText: string | null }>
  /** The model answer the learner may switch on while writing; paragraphs split by a blank line, `**phrase**` marks vocabulary. */
  sampleAnswer?: string | null
  latest: { id: string; status: string; overallBand: number | null; passed: boolean | null } | null
}

export interface PracticeAttemptView {
  attemptId: string
  packageId: string
  packageVersionId: string
  passage: Passage | null
  audio: MediaAudio | null
  questions: Question[]
  /** Essays graded one by one by `submitPracticeEssay`; the set is handed in once each of them is graded. */
  essays: PracticeEssay[]
}

/** One criterion of a graded essay: TA (Task 1) or TR (Task 2), CC, LR and GRA, each with a band. */
export type EssayJudgment = 'PASS' | 'FAIL' | 'NOT_ASSESSED'

export interface EssayKnowledgeJudgment {
  knowledgePointId: string
  code: string | null
  name: string | null
  judgment: EssayJudgment
  excerpt: string | null
  reason: string | null
}

export interface EssayCriterion {
  code: string
  band: number
  strengths: string[]
  improvements: string[]
  knowledgePointJudgments?: EssayKnowledgeJudgment[]
}

export interface EssayCorrection {
  excerpt: string
  suggestion: string
  category: string | null
}

export interface EssayStudyPoint {
  kind: 'CRITERION' | 'KNOWLEDGE_POINT' | 'AI'
  criterionCode: string | null
  band: number | null
  knowledgePointId: string | null
  code: string | null
  name: string | null
  title: string | null
  reason: string | null
  excerpt?: string | null
  practiceKnowledgePointId?: string | null
}

/**
 * The result of sending one essay. Only a GRADED result carries the grade; other statuses are a failure the learner
 * can retry, with `failureCode` saying why.
 */
export interface EssayGrade {
  submissionId: string
  status: string
  wordCount: number | null
  overallBand: number | null
  passed: boolean | null
  criteria: EssayCriterion[]
  corrections: EssayCorrection[]
  studyPoints: EssayStudyPoint[]
  summary: string | null
  pointsCharged: number | null
  sampleAnswer: string | null
}

export interface PracticeEssayRequest {
  requestId: string
  essayText: string
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
  gamification: GamificationSummary | null
}

/** `GET /api/learning/practice-attempts/{id}/review`: a submitted attempt as it was asked, with its saved result. */
export interface PracticeAttemptReview {
  attempt: PracticeAttemptView
  result: PracticeSubmissionResult
}

/** `GET /api/learning/me/progress`: XP counted toward the level, and today's use of the daily XP cap. */
export interface LearnerProgress {
  totalXp: number
  level: number
  nextLevelAt: number
  xpToNextLevel: number
  xpToday: number
  dailyCap: number
}

/** `GET /api/learning/me/streak`. After a break `currentDays` is 0 and `lostStreakDays` is the length that was lost. */
export interface StreakStatus {
  currentDays: number
  longestDays: number
  freezeAvailable: boolean
  /** Points the next freeze costs: 10 times the consecutive frozen days counting this one. */
  nextFreezeCost: number
  activeToday: boolean
  lostStreakDays: number
}

export type QuestType = 'PRACTICE' | 'PRACTICE_PLUS' | 'WEAKNESS' | 'STREAK'

export interface QuestTarget {
  knowledgePointId: string
  code: string
  name: string
}

export interface Quest {
  type: QuestType
  required: number
  progress: number
  completed: boolean
  xpReward: number
  pointsReward: number
  /** The knowledge point of a `WEAKNESS` quest; `null` for the others. */
  target: QuestTarget | null
}

/** `GET /api/learning/me/quests`: three quests for the learner's local day. Rewards are paid when a quest completes. */
export interface DailyQuests {
  date: string
  completed: number
  quests: Quest[]
}

export interface Badge {
  code: string
  name: string
  description: string
  rewardPoints: number
  awarded: boolean
  awardedAt: string | null
  /** Present for badges that count something; `null` for the others. */
  progress: { current: number; target: number } | null
}

export type LeagueTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'SAPPHIRE' | 'DIAMOND' | 'RUBY' | 'AMETHYST'
export type LeagueZone = 'PROMOTION' | 'SAFE' | 'DEMOTION'
export type LeagueOutcome = 'PROMOTED' | 'STAYED' | 'DEMOTED'

export interface LeagueRow {
  rank: number
  /** `null` when User Service could not give the name. */
  displayName: string | null
  weeklyXp: number
  you: boolean
  zone: LeagueZone
}

/** `GET /api/learning/me/league`. `table` is empty and `joined` false until the learner earns XP this week. */
export interface League {
  tier: LeagueTier
  weekStart: string
  closesAt: string
  joined: boolean
  table: LeagueRow[]
  groupSize: number
  promoteTop: number
  demoteFrom: number
}

export interface LeagueHistoryEntry {
  weekStart: string
  tier: LeagueTier
  weeklyXp: number
  finalRank: number
  outcome: LeagueOutcome
}

/** Where a point stands for the learner. `INSUFFICIENT` is "not enough data to judge yet". */
export type MasteryTier = 'PRIORITY' | 'CONSOLIDATE' | 'MAINTAIN' | 'INSUFFICIENT'

export type SuggestionType = 'PRACTICE_SET' | 'PRACTICE_TEST' | 'LESSON'

/** Why a suggestion is offered: the point is weak, a review is due, or it builds on points the learner holds firmly. */
export type SuggestionReason = 'CONSOLIDATE' | 'DUE' | 'NEXT_IN_TREE'

/**
 * What choosing a suggestion does. The API names the route that starts it; the adapter turns that into one of these
 * so no page parses routes: open a lesson, start an optional review of the point, or leave it to the course list.
 */
export type SuggestionAction =
  | { kind: 'LESSON'; lessonId: string }
  | { kind: 'BASKET_REVIEW'; knowledgePointId: string }
  | { kind: 'COURSE_LIST' }

/** One of at most five optional suggestions (`GET /api/learning/suggestions`); they never block the learning path. */
export interface Suggestion {
  type: SuggestionType
  id: string
  title: string
  knowledgePointId: string
  knowledgePointCode: string | null
  reason: SuggestionReason
  /** The course band the content belongs to; `null` when the content has none. */
  band: number | null
  skill: string | null
  action: SuggestionAction
}

/** A review the learner must finish; it locks lessons until it is done. */
export interface BasketRequiredItem {
  reviewId: string
  knowledgePointId: string
  code: string
  name: string
  lessonId: string | null
  skill: string | null
}

/** A weak or due point the learner may review when they choose (`GET /api/learning/review-basket`). */
export interface BasketOptionalItem {
  knowledgePointId: string
  code: string
  name: string
  skill: string | null
  tier: MasteryTier
  /** 0–1. */
  mastery: number
  dueAt: string | null
  reason: 'CONSOLIDATE' | 'DUE'
  /** False when Content has no set the learner has not seen, so the review cannot start. */
  hasUnrevealedSet: boolean
  /** Set when the learner already started an optional review of the point. */
  reviewId: string | null
}

export interface ReviewBasket {
  required: BasketRequiredItem[]
  consolidate: BasketOptionalItem[]
  due: BasketOptionalItem[]
}

/** One knowledge point of the learner's tree (`GET /api/learning/tree`). */
export interface TreePoint {
  knowledgePointId: string
  code: string
  name: string
  skill: string | null
  kind: string | null
  cefrLevel: string | null
  canDo: string | null
  /** 0–1; `null` for a point the learner has not touched. */
  mastery: number | null
  tier: MasteryTier | null
  evidenceCount: number
  nextReviewAt: string | null
  prerequisiteIds: string[]
  /** An upper bound: the start route can still answer `FREE_PRACTICE_EXHAUSTED`. */
  practiceAvailable: boolean
}

export interface LearnerTree {
  courseId: string
  knowledgePoints: TreePoint[]
}

export interface TestAssignment {
  assignmentId: string
  /** Topic final test; omit for course final test. */
  topicId?: string
  /** Course final test; omit for topic final test. */
  courseId?: string
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
  attemptType: 'TOPIC_TEST' | 'COURSE_TEST' | 'PLACEMENT_TEST'
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
  partNo?: number | null
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
  partNo?: number | null
  groups?: Array<{ groupId: string; sortOrder: number; formatCode: string; instructions: string | null }>
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
