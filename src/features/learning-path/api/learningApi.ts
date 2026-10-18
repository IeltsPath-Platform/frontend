import type {
  AssessmentAttempt,
  AttemptItemResponse,
  AttemptResult,
  AttemptStructure,
  Badge,
  CourseSummary,
  DailyQuests,
  HeartsStatus,
  League,
  LeagueHistoryEntry,
  LearnerProgress,
  LearnerSubmissionRequest,
  LearningGoal,
  LearnerTree,
  LearningGoalRequest,
  ExerciseSubmissionRequest,
  LessonCompletionResult,
  LessonDetail,
  LessonExerciseResult,
  LessonPracticeSets,
  PlacementResult,
  PlacementTest,
  PracticeAttemptView,
  PracticeSubmissionRequest,
  PracticeSubmissionResult,
  ReviewDetail,
  ReviewRef,
  ReviewSubmissionRequest,
  ReviewSubmissionResult,
  SaveItemResponseRequest,
  StartAttemptRequest,
  StreakStatus,
  TestAssignment,
  TheoryCheckRequest,
  TheoryCheckResult,
  TopicLessonsResponse,
  TopicSummary,
  WritingSubmissionResult,
} from '~types/learningPath'
import type { LessonResourcesResponse } from '~types/lesson'

/** Every method rejects with `ApiError` on failure. */
export interface LearningApi {
  getPlacementTest(): Promise<PlacementTest>
  /** Replaces the learner's active study goal with the placement survey answers. */
  saveLearningGoal(request: LearningGoalRequest): Promise<void>
  /** `null` when the learner has no active goal. */
  getActiveLearningGoal(): Promise<LearningGoal | null>
  /** The learner's newest placement attempt in any status; `null` when they never started one. */
  getCurrentPlacementAttempt(): Promise<AssessmentAttempt | null>
  /** Saved responses of an owned attempt, with the revision each next save must send. */
  listAttemptResponses(attemptId: string): Promise<AttemptItemResponse[]>
  /** Records the first time the learner opens a section, so its time can be shown once finished. Repeating it is harmless. */
  startAttemptSection(attemptId: string, sectionId: string): Promise<void>
  /** Finishes one section of an attempt; its items take no more responses. Repeating it is harmless. */
  completeAttemptSection(attemptId: string, sectionId: string): Promise<void>
  /** Not found until the placement attempt has been graded. */
  getPlacementResult(attemptId: string): Promise<PlacementResult>
  submitLearnerSubmission(request: LearnerSubmissionRequest): Promise<{ id: string }>
  listCourses(): Promise<CourseSummary[]>
  listTopics(): Promise<TopicSummary[]>
  getPendingReviews(): Promise<ReviewRef[]>
  getTopicLessons(topicId: string): Promise<TopicLessonsResponse>
  getLesson(lessonId: string): Promise<LessonDetail>
  /** The lesson's Markdown summary, slides and documents, behind the same gate as the lesson. */
  getLessonResources(lessonId: string): Promise<LessonResourcesResponse>
  getLessonPracticeSets(lessonId: string): Promise<LessonPracticeSets>
  startPracticeAttempt(lessonId: string, packageId: string): Promise<PracticeAttemptView>
  getPracticeAttempt(attemptId: string): Promise<PracticeAttemptView | PracticeSubmissionResult>
  submitPracticeAttempt(attemptId: string, request: PracticeSubmissionRequest): Promise<PracticeSubmissionResult>
  /** The learner's knowledge tree for one course. Rejects with `COURSE_NOT_OPEN` or `COURSE_NOT_JOINED`. */
  getLearnerTree(courseId: string): Promise<LearnerTree>
  /**
   * Starts free practice on one point. Costs hearts like Practice. Rejects with `HEARTS_DEPLETED`, `REVIEW_REQUIRED`,
   * `FREE_PRACTICE_EXHAUSTED` or `FREE_PRACTICE_UNAVAILABLE`. Answers go through `submitPracticeAttempt`.
   */
  startFreePractice(knowledgePointId: string): Promise<PracticeAttemptView>
  /** The learner's hearts. A set that costs hearts is refused with `HEARTS_DEPLETED` once they reach zero. */
  getHearts(): Promise<HeartsStatus>
  /**
   * Fills the hearts for `HeartsStatus.refillCost` points. The same `requestId` is charged once. Rejects with
   * `HEARTS_FULL`, `INSUFFICIENT_POINTS` or `ACCESS_UNAVAILABLE` (nothing charged).
   */
  refillHearts(requestId: string): Promise<HeartsStatus>
  getProgress(): Promise<LearnerProgress>
  getStreak(): Promise<StreakStatus>
  /**
   * Buys a streak freeze with points; the same `requestId` is charged once. Rejects with `FREEZE_ALREADY_OWNED`,
   * `NO_STREAK_TO_PROTECT`, `FREEZE_LIMIT`, `INSUFFICIENT_POINTS` or `ACCESS_UNAVAILABLE` (nothing charged).
   */
  buyStreakFreeze(requestId: string): Promise<StreakStatus>
  getQuests(): Promise<DailyQuests>
  getBadges(): Promise<Badge[]>
  getLeague(): Promise<League>
  /** Closed weeks, newest first. `weeks` is 1 to 26. */
  getLeagueHistory(weeks: number): Promise<LeagueHistoryEntry[]>
  getWritingSubmission(submissionId: string): Promise<WritingSubmissionResult>
  completeLesson(lessonId: string): Promise<LessonCompletionResult>
  /** Answers every question of one exercise block of the lesson; the server grades it and tells if the lesson is done. */
  submitLessonExercise(lessonId: string, blockId: string, request: ExerciseSubmissionRequest): Promise<LessonExerciseResult>
  getReview(reviewId: string): Promise<ReviewDetail>
  submitReview(reviewId: string, request: ReviewSubmissionRequest): Promise<ReviewSubmissionResult>
  submitTheoryCheck(reviewId: string, request: TheoryCheckRequest): Promise<TheoryCheckResult>
  createTestAssignment(topicId: string): Promise<TestAssignment>
  /** Course final test when `GET /courses` reports `testStatus = AVAILABLE`. */
  createCourseTestAssignment(courseId: string): Promise<TestAssignment>
  createAttempt(request: StartAttemptRequest): Promise<AssessmentAttempt>
  getAttemptStructure(attemptId: string): Promise<AttemptStructure>
  saveItemResponse(attemptId: string, itemId: string, request: SaveItemResponseRequest): Promise<AttemptItemResponse>
  submitAttempt(attemptId: string): Promise<AssessmentAttempt>
  getAttemptResult(attemptId: string): Promise<AttemptResult>
}

export interface MockLearningControls {
  reset(): void
  /** While on, every call fails with 500. A toggle rather than one-shot, since StrictMode doubles effect requests. */
  setServerFailing(failing: boolean): void
}
