import type {
  AssessmentAttempt,
  AttemptItemResponse,
  AttemptResult,
  AttemptStructure,
  CourseSummary,
  EssaySubmissionRequest,
  ExerciseSubmissionRequest,
  ExerciseSubmissionResult,
  LearnerSubmissionRequest,
  LearningGoal,
  LearningGoalRequest,
  LessonCompletionResult,
  LessonDetail,
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
  TestAssignment,
  TheoryCheckRequest,
  TheoryCheckResult,
  TopicLessonsResponse,
  TopicSummary,
  WritingSubmissionResult,
} from '~types/learningPath'

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
  getLessonPracticeSets(lessonId: string): Promise<LessonPracticeSets>
  startPracticeAttempt(lessonId: string, packageId: string): Promise<PracticeAttemptView>
  getPracticeAttempt(attemptId: string): Promise<PracticeAttemptView | PracticeSubmissionResult>
  submitPracticeAttempt(attemptId: string, request: PracticeSubmissionRequest): Promise<PracticeSubmissionResult>
  submitExercise(lessonId: string, blockId: string, request: ExerciseSubmissionRequest): Promise<ExerciseSubmissionResult>
  submitEssay(lessonId: string, blockId: string, request: EssaySubmissionRequest): Promise<WritingSubmissionResult>
  getWritingSubmission(submissionId: string): Promise<WritingSubmissionResult>
  completeLesson(lessonId: string): Promise<LessonCompletionResult>
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
