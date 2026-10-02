import type {
  AssessmentAttempt,
  AttemptItemResponse,
  AttemptResult,
  AttemptStructure,
  EssaySubmissionRequest,
  ExerciseSubmissionRequest,
  ExerciseSubmissionResult,
  LessonCompletionResult,
  LessonDetail,
  ReviewDetail,
  ReviewRef,
  ReviewSubmissionRequest,
  ReviewSubmissionResult,
  SaveItemResponseRequest,
  StartAttemptRequest,
  TestAssignment,
  TopicLessonsResponse,
  TopicSummary,
  WritingSubmissionResult,
} from '~types/learningPath'

/** Every method rejects with `ApiError` on failure. */
export interface LearningApi {
  listTopics(): Promise<TopicSummary[]>
  getPendingReviews(): Promise<ReviewRef[]>
  getTopicLessons(topicId: string): Promise<TopicLessonsResponse>
  getLesson(lessonId: string): Promise<LessonDetail>
  submitExercise(lessonId: string, blockId: string, request: ExerciseSubmissionRequest): Promise<ExerciseSubmissionResult>
  submitEssay(lessonId: string, blockId: string, request: EssaySubmissionRequest): Promise<WritingSubmissionResult>
  getWritingSubmission(submissionId: string): Promise<WritingSubmissionResult>
  completeLesson(lessonId: string): Promise<LessonCompletionResult>
  getReview(reviewId: string): Promise<ReviewDetail>
  submitReview(reviewId: string, request: ReviewSubmissionRequest): Promise<ReviewSubmissionResult>
  createTestAssignment(topicId: string): Promise<TestAssignment>
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
