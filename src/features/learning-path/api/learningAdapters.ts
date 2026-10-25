import type {
  AnswerInput,
  AssessmentAttempt,
  AttemptItemResponse,
  AttemptResult,
  AttemptStructure,
  LessonBlock,
  LessonCompletionResult,
  LessonDetail,
  LessonExerciseResult,
  LessonStatus,
  Question,
  QuestionResult,
  ReviewDetail,
  ReviewRef,
  ReviewStatus,
  ReviewSubmissionResult,
  SaveItemResponseRequest,
  StartAttemptRequest,
  TestAssignment,
  TestStatus,
  TopicLessonsResponse,
  CourseSummary,
  EssayStudyPoint,
  TopicStatus,
  TopicSummary,
} from '~types/learningPath'
import { mapErrorHint, type ErrorHintDto } from './errorHint'

/** Wire DTOs — backend/docs/contracts/lesson-learning-v1.md */

export type TopicSummaryDto = {
  topicId: string
  code: string
  name: string
  sequenceOrder: number
  status: TopicStatus
  completedLessonCount: number
  totalLessonCount: number
  accessLevel?: 'FREE' | 'PREMIUM'
  skill?: string | null
  course?: { courseId: string; code: string; name: string; bandLevel: number } | null
}

export type CourseSummaryDto = {
  courseId: string
  code: string
  name: string
  bandLevel: number
  topicCount: number
  passedTopicCount: number
  completedLessonCount?: number
  totalLessonCount?: number
  lastStudiedAt?: string | null
  recommended: boolean
  testStatus: TestStatus
}

export type LessonSummaryDto = {
  lessonId: string
  code: string
  title: string
  sortOrder: number
  status: LessonStatus
  practiceStatus?: 'LOCKED' | 'REQUIRED' | 'PASSED' | null
  practicePassReason?: string | null
  estimatedMinutes?: number | null
  blockingReviewId?: string | null
}

export type TopicLessonsDto = {
  topicId: string
  lessons: LessonSummaryDto[]
  testStatus: TestStatus
}

export type QuestionOptionDto = {
  optionKey: string
  content: string
  sortOrder: number
}

export type QuestionDto = {
  questionVersionId: string
  sortOrder: number
  stem: string
  options: QuestionOptionDto[] | null
  hint?: string | null
}

export type LessonBlockDto = {
  blockId: string
  blockType: string
  blockKind?: string
  sortOrder: number
  asset?: {
    assetType: string
    textContent?: string | null
    mediaUrl?: string | null
    durationSeconds?: number | null
    transcript?: string | null
  } | null
  vocabularySenseIds?: string[] | null
  passed?: boolean
  questions?: QuestionDto[] | null
  solutions?: Array<{ questionVersionId: string; correctAnswer: string; explanation?: string }> | null
}

export type LessonDetailDto = {
  lessonId: string
  topicId: string
  code: string
  title: string
  summary?: string | null
  sortOrder: number
  status: LessonStatus
  blocks?: LessonBlockDto[]
}

export type LessonExerciseResultDto = {
  blockPassed: boolean
  lessonCompleted: boolean
  results: Array<{
    questionVersionId: string
    correct: boolean
    correctAnswer?: string
    explanation?: string
    hint?: string | null
    error?: ErrorHintDto | null
  }>
  gamification?: GamificationDto | null
}

export type LessonCompletionDto = {
  lessonId: string
  status: 'COMPLETED'
}

export type ReviewRefDto = {
  reviewId: string
  lessonId: string
  knowledgePointId: string
  sourcePackageId?: string | null
  blocking?: boolean
}

export type ReviewSetDto = {
  reviewSetId: string
  packageId: string
  packageVersionId: string
  passage?: string | { title?: string; paragraphs?: Array<{ label?: string | null; text: string }> }
  audio?: { mediaUrl: string; durationSeconds?: number | null } | null
  questions: QuestionDto[]
}

export type ReviewDetailDto = {
  reviewId: string
  reviewStatus: ReviewStatus
  lessonId: string
  theory: string[]
  set: ReviewSetDto | null
  stage?: 'PRACTICE' | 'THEORY'
  theoryReason?: string | null
  theoryScope?: string | null
  failedSets?: number
  maxFailedSets?: number | null
  knowledgePointId?: string
  skill?: string
  blocking?: boolean
  errorTrap?: ErrorHintDto | null
}

/** `gamification` of a submission response; the hearts fields are null or absent for a submission that costs no hearts. */
export type GamificationDto = {
  xpEarned: number
  xpCapped?: boolean
  totalXp: number
  level: number
  leveledUp?: boolean
  heartsLost?: number | null
  heartsRemaining?: number | null
  nextHeartAt?: string | null
}

export function mapGamification(dto: GamificationDto | null | undefined): import('~types/learningPath').GamificationSummary | null {
  if (!dto) return null
  return {
    xpEarned: dto.xpEarned,
    xpCapped: dto.xpCapped === true,
    totalXp: dto.totalXp,
    level: dto.level,
    leveledUp: dto.leveledUp === true,
    heartsLost: dto.heartsLost ?? null,
    heartsRemaining: dto.heartsRemaining ?? null,
    nextHeartAt: dto.nextHeartAt ?? null,
  }
}

export type ReviewSubmissionResultDto = {
  reviewStatus: ReviewStatus
  stage?: 'PRACTICE' | 'THEORY'
  failedSets?: number
  gamification?: GamificationDto | null
  results: Array<{
    questionVersionId: string
    correct: boolean
    correctAnswer?: string
    explanation?: string
    error?: ErrorHintDto | null
  }>
}

export type TheoryCheckResultDto = {
  reviewId: string
  correct: number
  total: number
  stage: 'PRACTICE' | 'THEORY'
  results: Array<{
    questionVersionId: string
    correct: boolean
    correctAnswer?: string
    explanation?: string
    hint?: string | null
    error?: ErrorHintDto | null
  }>
}

export type PracticeSetItemDto = {
  packageId: string
  code: string
  title: string
  questionCount: number
  accessLevel: string
  status: string
  bestPercent: number | null
  lastAttemptId: string | null
  revealed: boolean
  skills?: string[]
}

export type LessonPracticeSetsDto = {
  lessonId: string
  skill: string
  lessonCompleted: boolean
  practiceStatus: 'LOCKED' | 'REQUIRED' | 'PASSED'
  practicePassReason: string | null
  items: PracticeSetItemDto[]
}

export type PracticeAttemptViewDto = {
  attemptId: string
  packageId: string
  packageVersionId: string
  passage?: string | { title?: string; paragraphs?: Array<{ label?: string | null; text: string }> } | null
  audio?: { mediaUrl: string; durationSeconds?: number | null; transcript?: string | null } | null
  questions: QuestionDto[]
  /** Essays live in the sections, next to the passage they belong to; there is no top-level list. */
  sections?: Array<{ essays?: PracticeEssayDto[] }>
}

export type PracticeEssayDto = {
  questionVersionId: string
  sortOrder: number
  stem: string
  task?: string | null
  minWords?: number | null
  passBand?: number | null
  guide?: string | null
  images?: Array<{ mediaUrl: string; altText?: string | null }> | null
  sampleAnswer?: string | null
  latestSubmission?: { id: string; status: string; overallBand?: number | null; passed?: boolean | null } | null
}

export type EssayGradeDto = {
  submissionId: string
  status: string
  wordCount?: number | null
  overallBand?: number | null
  passed?: boolean | null
  criteria?: Array<{
    code: string
    band: number
    strengths?: string[]
    improvements?: string[]
    knowledgePointJudgments?: Array<{
      knowledgePointId?: string
      code?: string | null
      name?: string | null
      judgment?: string
      excerpt?: string | null
      reason?: string | null
    }>
  }>
  corrections?: Array<{ excerpt: string; suggestion: string; category?: string | null }>
  studyPoints?: Array<{
    kind?: string
    criterionCode?: string | null
    band?: number | null
    knowledgePointId?: string | null
    code?: string | null
    name?: string | null
    title?: string | null
    reason?: string | null
    excerpt?: string | null
    practiceKnowledgePointId?: string | null
  }>
  summary?: string | null
  pointsCharged?: number | null
  sampleAnswer?: string | null
}

export type PracticeSubmissionResultDto = {
  attemptId: string
  correct: number
  total: number
  percent: number
  passed: boolean
  countedAsEvidence: boolean
  results: Array<{
    questionVersionId: string
    correct: boolean
    correctAnswer?: string
    explanation?: string
    hint?: string | null
    error?: ErrorHintDto | null
  }>
  reviewsCreated?: Array<{ reviewId: string; knowledgePointId: string; stage?: string }>
  gamification?: GamificationDto | null
}

export type TestAssignmentDto = {
  assignmentId: string
  packageId: string
  packageVersionId: string
}

export type LearnerAttemptResultDto = {
  id: string
  attemptId: string
  status?: string
  score: number
  maxScore: number
  percent: number
  items: Array<{
    attemptItemId: string
    questionVersionId: string
    correct: boolean
  }>
  solutions?: Array<{
    questionVersionId: string
    correctAnswer?: string
    explanation?: string
  }>
}

function mapQuestion(dto: QuestionDto): Question {
  return {
    id: dto.questionVersionId,
    number: dto.sortOrder,
    prompt: dto.stem,
    options: dto.options
      ? [...dto.options]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((option) => ({ value: option.optionKey, label: option.content }))
      : null,
    hint: dto.hint ?? null,
  }
}

function mapQuestionResult(dto: {
  questionVersionId: string
  correct: boolean
  correctAnswer?: string
  explanation?: string
  hint?: string | null
  error?: ErrorHintDto | null
}): QuestionResult {
  const error = mapErrorHint(dto.error)
  return {
    questionId: dto.questionVersionId,
    correct: dto.correct,
    ...(dto.correctAnswer !== undefined ? { correctAnswer: dto.correctAnswer } : {}),
    ...(dto.explanation !== undefined ? { explanation: dto.explanation } : {}),
    hint: dto.hint ?? null,
    ...(error ? { error } : {}),
  }
}

export function mapCourseSummary(dto: CourseSummaryDto): CourseSummary {
  return {
    id: dto.courseId,
    code: dto.code,
    title: dto.name,
    bandLevel: Number(dto.bandLevel),
    topicCount: dto.topicCount,
    passedTopicCount: dto.passedTopicCount,
    completedLessons: dto.completedLessonCount ?? 0,
    totalLessons: dto.totalLessonCount ?? 0,
    lastStudiedAt: dto.lastStudiedAt ?? null,
    recommended: dto.recommended,
    testStatus: dto.testStatus,
  }
}

export function mapTopicSummary(dto: TopicSummaryDto): TopicSummary {
  const premium = dto.accessLevel === 'PREMIUM'
  return {
    id: dto.topicId,
    course: dto.course
      ? { id: dto.course.courseId, code: dto.course.code, title: dto.course.name, bandLevel: Number(dto.course.bandLevel) }
      : null,
    code: dto.code,
    title: dto.name,
    description: premium ? 'Nội dung Premium.' : '',
    sequenceOrder: dto.sequenceOrder,
    status: premium && dto.status !== 'PASSED' ? 'LOCKED' : dto.status,
    completedLessons: dto.completedLessonCount,
    totalLessons: dto.totalLessonCount,
    lockedReason: premium && dto.status !== 'PASSED'
      ? 'Topic Premium — chưa mở trong giai đoạn này.'
      : dto.status === 'LOCKED'
        ? 'Hoàn thành chặng trước để mở khóa.'
        : null,
    skill: dto.skill ?? null,
    accessLevel: dto.accessLevel ?? null,
  }
}

export function mapTopicLessons(dto: TopicLessonsDto, topic: TopicSummary): TopicLessonsResponse {
  const lessons = dto.lessons.map((lesson, index) => ({
    id: lesson.lessonId,
    title: lesson.title,
    sortOrder: lesson.sortOrder,
    status: lesson.status,
    estimatedMinutes: lesson.estimatedMinutes ?? null,
    lockedReason: lesson.status !== 'LOCKED' ? null
      : lesson.blockingReviewId ? 'Mở sau khi hoàn thành bài ôn.'
        : dto.lessons[index - 1]?.practiceStatus === 'REQUIRED' ? 'Đạt phần Luyện tập của bài trước để mở.'
          : 'Hoàn thành bài trước để mở.',
    blockingReviewId: lesson.blockingReviewId ?? null,
    practiceStatus: lesson.practiceStatus ?? null,
    practicePassReason: lesson.practicePassReason ?? null,
  }))
  const completed = lessons.filter((lesson) => lesson.status === 'COMPLETED').length
  return {
    topic: {
      ...topic,
      completedLessons: completed,
      totalLessons: lessons.length,
    },
    lessons,
    finalTest: {
      title: 'Bài kiểm tra cuối topic',
      testStatus: dto.testStatus,
      questionCount: 0,
      lastPercent: null,
    },
    pendingReviews: [],
  }
}

/** Preserves the lesson content used by its vocabulary and exercise sections; text and essays use other views. */
export function mapLessonBlocks(blocks: LessonBlockDto[] | undefined): LessonBlock[] {
  const mapped: LessonBlock[] = []
  let exerciseNumber = 0
  for (const block of [...(blocks ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (block.blockType === 'VOCABULARY') {
      mapped.push({
        id: block.blockId,
        sortOrder: block.sortOrder,
        type: 'VOCABULARY',
        vocabularySenseIds: block.vocabularySenseIds ?? [],
      })
    } else if (block.blockType === 'ASSET' && block.asset?.assetType === 'PASSAGE') {
      mapped.push({
        id: block.blockId,
        sortOrder: block.sortOrder,
        type: 'ASSET',
        assetType: 'PASSAGE',
        mediaUrl: null,
        ...mapPassageField(block.asset.textContent),
      })
    } else if (block.blockType === 'ASSET' && block.asset?.assetType === 'AUDIO' && block.asset.mediaUrl) {
      mapped.push({
        id: block.blockId,
        sortOrder: block.sortOrder,
        type: 'ASSET',
        assetType: 'AUDIO',
        mediaUrl: block.asset.mediaUrl,
        durationSeconds: block.asset.durationSeconds ?? null,
        transcript: block.asset.transcript ?? null,
      })
    } else if (block.blockType === 'EXERCISE' && (block.blockKind ?? 'EXERCISE') === 'EXERCISE' && block.questions) {
      exerciseNumber += 1
      const solutions = block.passed && block.solutions
        ? block.solutions.map((solution) => mapQuestionResult({
          questionVersionId: solution.questionVersionId,
          correct: true,
          correctAnswer: solution.correctAnswer,
          explanation: solution.explanation,
        }))
        : null
      mapped.push({
        id: block.blockId,
        sortOrder: block.sortOrder,
        type: 'EXERCISE',
        blockKind: 'EXERCISE',
        title: `Bài tập ${exerciseNumber}`,
        instructions: 'Trả lời mọi câu hỏi. Cần đúng từ 70% số câu để đạt.',
        knowledgePointCode: '',
        questions: [...block.questions].sort((a, b) => a.sortOrder - b.sortOrder).map(mapQuestion),
        state: block.passed ? 'PASSED' : 'NOT_ATTEMPTED',
        // A passed block shows its answers again; the server keeps no copy of what was typed, so the key stands in.
        savedAnswers: solutions
          ? Object.fromEntries(solutions.map((solution) => [solution.questionId, solution.correctAnswer ?? '']))
          : null,
        solutions,
      })
    }
  }
  return mapped
}

export function mapLessonExerciseResult(dto: LessonExerciseResultDto): LessonExerciseResult {
  return {
    blockPassed: dto.blockPassed,
    lessonCompleted: dto.lessonCompleted,
    results: dto.results.map(mapQuestionResult),
    gamification: mapGamification(dto.gamification),
  }
}

export function mapLessonDetail(dto: LessonDetailDto, topicTitle: string): LessonDetail {
  return {
    id: dto.lessonId,
    topicId: dto.topicId,
    topicTitle,
    title: dto.title,
    sortOrder: dto.sortOrder,
    status: dto.status,
    nextLessonId: null,
    pendingReviews: [],
    blocks: mapLessonBlocks(dto.blocks),
  }
}

export function mapLessonCompletion(dto: LessonCompletionDto): LessonCompletionResult {
  return {
    lessonCompleted: dto.status === 'COMPLETED',
    nextLessonId: null,
    pendingReviews: [],
  }
}

export function mapReviewRef(dto: ReviewRefDto): ReviewRef {
  return {
    reviewId: dto.reviewId,
    lessonId: dto.lessonId,
    blocking: dto.blocking ?? true,
    sourcePackageId: dto.sourcePackageId ?? null,
    knowledgePointCode: dto.knowledgePointId.slice(0, 8),
    knowledgePointTitle: dto.blocking === false ? 'Bài ôn tự chọn' : 'Bài ôn bắt buộc',
  }
}

/**
 * A passage sent as plain text keeps one paragraph per line. A paragraph that opens with a capital letter and a dot
 * ("A. Desert plants…") gets that letter as its label, the way IELTS passages name their paragraphs.
 */
export function splitPassage(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const label = /^([A-Z])\.\s+/.exec(line)
    return label ? { label: label[1], text: line.slice(label[0].length) } : { label: null, text: line }
  })
}

function mapPassageField(
  passage?: string | { title?: string; paragraphs?: Array<{ label?: string | null; text: string }> } | null,
) {
  if (!passage) return { title: '', paragraphs: [] as Array<{ label: string | null; text: string }> }
  if (typeof passage === 'string') return { title: '', paragraphs: splitPassage(passage) }
  return {
    title: passage.title ?? '',
    paragraphs: (passage.paragraphs ?? []).map((paragraph) => ({
      label: paragraph.label ?? null,
      text: paragraph.text,
    })),
  }
}

export function mapReviewDetail(dto: ReviewDetailDto, topicId: string): ReviewDetail {
  const theory = dto.theory ?? []
  const failedSets = dto.failedSets ?? 0
  const maxFailedSets = dto.maxFailedSets ?? null
  const stage = dto.stage ?? (dto.set ? 'PRACTICE' : 'THEORY')
  const errorTrap = mapErrorHint(dto.errorTrap)

  const set = dto.set
    ? {
        setId: dto.set.reviewSetId,
        packageCode: dto.set.packageId.slice(0, 8),
        attemptNumber: maxFailedSets === null ? failedSets + 1 : Math.min(failedSets + 1, maxFailedSets),
        maxAttempts: maxFailedSets,
        passage: mapPassageField(dto.set.passage),
        audio: dto.set.audio?.mediaUrl
          ? {
              mediaUrl: dto.set.audio.mediaUrl,
              durationSeconds: dto.set.audio.durationSeconds ?? null,
              transcript: null,
            }
          : null,
        questions: dto.set.questions.map(mapQuestion),
      }
    : null

  return {
    reviewId: dto.reviewId,
    topicId,
    status: dto.reviewStatus,
    stage,
    knowledgePoint: {
      code: dto.knowledgePointId?.slice(0, 8) ?? 'KP',
      title: 'Ôn kiến thức',
    },
    sourceLessonTitle: 'Bài học trước',
    theory,
    set,
    failedSets,
    maxFailedSets,
    theoryReason: dto.theoryReason ?? null,
    resumeLessonId: dto.lessonId,
    ...(dto.blocking === undefined ? {} : { blocking: dto.blocking }),
    ...(errorTrap ? { errorTrap } : {}),
  }
}

export function mapLessonPracticeSets(dto: LessonPracticeSetsDto): import('~types/learningPath').LessonPracticeSets {
  return {
    lessonId: dto.lessonId,
    skill: dto.skill,
    lessonCompleted: dto.lessonCompleted,
    practiceStatus: dto.practiceStatus,
    practicePassReason: dto.practicePassReason,
    items: dto.items.map((item) => ({
      packageId: item.packageId,
      code: item.code,
      title: item.title,
      questionCount: item.questionCount,
      accessLevel: item.accessLevel,
      status: item.status as import('~types/learningPath').PracticeSetItemStatus,
      bestPercent: item.bestPercent,
      lastAttemptId: item.lastAttemptId,
      revealed: item.revealed,
      skills: item.skills,
    })),
  }
}

function mapPracticeEssay(dto: PracticeEssayDto): import('~types/learningPath').PracticeEssay {
  return {
    id: dto.questionVersionId,
    number: dto.sortOrder,
    prompt: dto.stem,
    task: dto.task === 'TASK_1' || dto.task === 'TASK_2' ? dto.task : null,
    minWords: dto.minWords ?? null,
    passBand: dto.passBand ?? null,
    guide: dto.guide ?? null,
    images: (dto.images ?? []).map((image) => ({ mediaUrl: image.mediaUrl, altText: image.altText ?? null })),
    sampleAnswer: dto.sampleAnswer ?? null,
    latest: dto.latestSubmission
      ? {
          id: dto.latestSubmission.id,
          status: dto.latestSubmission.status,
          overallBand: dto.latestSubmission.overallBand ?? null,
          passed: dto.latestSubmission.passed ?? null,
        }
      : null,
  }
}

export function mapEssayGrade(dto: EssayGradeDto): import('~types/learningPath').EssayGrade {
  return {
    submissionId: dto.submissionId,
    status: dto.status,
    wordCount: dto.wordCount ?? null,
    overallBand: dto.overallBand ?? null,
    passed: dto.passed ?? null,
    criteria: (dto.criteria ?? []).map((criterion) => ({
      code: criterion.code,
      band: criterion.band,
      strengths: criterion.strengths ?? [],
      improvements: criterion.improvements ?? [],
      knowledgePointJudgments: (criterion.knowledgePointJudgments ?? [])
        .filter((item) => Boolean(item.knowledgePointId))
        .map((item) => ({
          knowledgePointId: item.knowledgePointId!,
          code: item.code ?? null,
          name: item.name ?? null,
          judgment: item.judgment === 'PASS' || item.judgment === 'FAIL' ? item.judgment : 'NOT_ASSESSED',
          excerpt: item.excerpt ?? null,
          reason: item.reason ?? null,
        })),
    })),
    corrections: (dto.corrections ?? []).map((correction) => ({
      excerpt: correction.excerpt,
      suggestion: correction.suggestion,
      category: correction.category ?? null,
    })),
    studyPoints: (dto.studyPoints ?? []).map((point): EssayStudyPoint => ({
      kind: point.kind === 'CRITERION' || point.kind === 'KNOWLEDGE_POINT' ? point.kind : 'AI',
      criterionCode: point.criterionCode ?? null,
      band: point.band ?? null,
      knowledgePointId: point.knowledgePointId ?? null,
      code: point.code ?? null,
      name: point.name ?? null,
      title: point.title ?? null,
      reason: point.reason ?? null,
      excerpt: point.excerpt ?? null,
      practiceKnowledgePointId: point.practiceKnowledgePointId ?? null,
    })).filter((point) => point.kind === 'CRITERION' || point.kind === 'KNOWLEDGE_POINT'
      ? Boolean(point.knowledgePointId)
      : Boolean(point.title?.trim())),
    summary: dto.summary ?? null,
    pointsCharged: dto.pointsCharged ?? null,
    sampleAnswer: dto.sampleAnswer ?? null,
  }
}

export function mapPracticeAttemptView(dto: PracticeAttemptViewDto): import('~types/learningPath').PracticeAttemptView {
  return {
    attemptId: dto.attemptId,
    packageId: dto.packageId,
    packageVersionId: dto.packageVersionId,
    passage: dto.passage ? mapPassageField(dto.passage) : null,
    audio: dto.audio?.mediaUrl
      ? {
          mediaUrl: dto.audio.mediaUrl,
          durationSeconds: dto.audio.durationSeconds ?? null,
          transcript: dto.audio.transcript ?? null,
        }
      : null,
    questions: (dto.questions ?? []).map(mapQuestion),
    essays: (dto.sections ?? [])
      .flatMap((section) => [...(section.essays ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))
      .map(mapPracticeEssay),
  }
}

export function mapPracticeSubmission(dto: PracticeSubmissionResultDto): import('~types/learningPath').PracticeSubmissionResult {
  return {
    attemptId: dto.attemptId,
    correct: dto.correct,
    total: dto.total,
    percent: dto.percent,
    passed: dto.passed,
    countedAsEvidence: dto.countedAsEvidence,
    results: dto.results.map(mapQuestionResult),
    reviewsCreated: (dto.reviewsCreated ?? []).map((review) => ({
      reviewId: review.reviewId,
      knowledgePointId: review.knowledgePointId,
      stage: (review.stage === 'THEORY' ? 'THEORY' : 'PRACTICE') as import('~types/learningPath').ReviewStage,
    })),
    gamification: mapGamification(dto.gamification),
  }
}

export type PracticeAttemptReviewDto = { attempt: PracticeAttemptViewDto; result: PracticeSubmissionResultDto }

export function mapPracticeAttemptReview(dto: PracticeAttemptReviewDto): import('~types/learningPath').PracticeAttemptReview {
  return { attempt: mapPracticeAttemptView(dto.attempt), result: mapPracticeSubmission(dto.result) }
}

export function mapTheoryCheck(dto: TheoryCheckResultDto): import('~types/learningPath').TheoryCheckResult {
  return {
    reviewId: dto.reviewId,
    correct: dto.correct,
    total: dto.total,
    stage: dto.stage,
    results: dto.results.map(mapQuestionResult),
  }
}

export function toWireAnswers(answers: AnswerInput[]) {
  return answers.map((answer) => ({
    questionVersionId: answer.questionId,
    answer: answer.answer,
  }))
}

export function mapReviewSubmission(
  dto: ReviewSubmissionResultDto,
  topicId: string,
  resumeLessonId: string | null,
): ReviewSubmissionResult {
  const results = dto.results.map(mapQuestionResult)
  const correctCount = results.filter((result) => result.correct).length
  const totalCount = results.length
  const percent = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100)
  return {
    status: dto.reviewStatus,
    stage: dto.stage ?? 'PRACTICE',
    passed: dto.reviewStatus === 'DONE',
    correctCount,
    totalCount,
    percent,
    failedSets: dto.failedSets ?? 0,
    results,
    resumeLessonId,
    topicId,
    gamification: mapGamification(dto.gamification),
  }
}

export function mapTestAssignment(
  dto: TestAssignmentDto,
  scope: { topicId?: string; courseId?: string } = {},
): TestAssignment {
  return {
    assignmentId: dto.assignmentId,
    ...(scope.topicId ? { topicId: scope.topicId } : {}),
    ...(scope.courseId ? { courseId: scope.courseId } : {}),
    packageVersionId: dto.packageVersionId,
    packageCode: dto.packageId.slice(0, 8),
  }
}

export function toStartAttemptBody(_request: StartAttemptRequest) {
  return {
    packageVersionId: _request.packageVersionId,
    mode: 'STANDARD' as const,
    channel: 'WEB' as const,
  }
}

function stringifySnapshot(value: unknown): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value ?? null)
}

export function mapAttemptStructure(raw: {
  sections: Array<{
    id: string
    contentSectionId: string
    sortOrder: number
    snapshot: unknown
    startedAt?: string | null
    completedAt?: string | null
    items: Array<{
      id: string
      questionVersionId: string
      sortOrder: number
      questionSnapshot: unknown
      answerSnapshot?: unknown
      knowledgeSnapshot?: unknown
    }>
  }>
}): AttemptStructure {
  return {
    sections: raw.sections.map((section) => ({
      id: section.id,
      contentSectionId: section.contentSectionId,
      sortOrder: section.sortOrder,
      snapshot: stringifySnapshot(section.snapshot),
      startedAt: section.startedAt ?? null,
      completedAt: section.completedAt ?? null,
      items: section.items.map((item) => ({
        id: item.id,
        questionVersionId: item.questionVersionId,
        sortOrder: item.sortOrder,
        questionSnapshot: stringifySnapshot(
          normalizeQuestionSnapshot(item.questionSnapshot, item.questionVersionId, item.sortOrder),
        ),
        answerSnapshot: item.answerSnapshot == null ? null : stringifySnapshot(item.answerSnapshot),
        knowledgeSnapshot: item.knowledgeSnapshot == null ? null : stringifySnapshot(item.knowledgeSnapshot),
      })),
    })),
  }
}

/**
 * BE often returns questionSnapshot as a JSON string with stem/optionKey and no top-level
 * number — parse first, then map to the FE Question shape.
 */
function normalizeQuestionSnapshot(
  raw: unknown,
  questionVersionId: string,
  sortOrderFallback = 0,
): unknown {
  let value: unknown = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return raw
    }
  }
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  const options = Array.isArray(record.options)
    ? record.options.map((option) => {
        if (!option || typeof option !== 'object') return option
        const entry = option as Record<string, unknown>
        if (typeof entry.value === 'string' && typeof entry.label === 'string') return entry
        return {
          value: typeof entry.optionKey === 'string' ? entry.optionKey : entry.value,
          label: typeof entry.content === 'string' ? entry.content : entry.label,
        }
      })
    : record.options ?? null
  const number = typeof record.number === 'number'
    ? record.number
    : typeof record.sortOrder === 'number'
      ? record.sortOrder
      : sortOrderFallback
  const prompt = typeof record.prompt === 'string'
    ? record.prompt
    : typeof record.stem === 'string'
      ? record.stem
      : ''
  return {
    number,
    prompt,
    options,
    id: questionVersionId,
    hint: record.hint ?? null,
  }
}

export function mapAttemptResult(dto: LearnerAttemptResultDto, topicId: string): AttemptResult {
  const solutions = new Map((dto.solutions ?? []).map((item) => [item.questionVersionId, item]))
  return {
    attemptId: dto.attemptId,
    topicId,
    packageCode: '',
    score: dto.score,
    maxScore: dto.maxScore,
    percent: dto.percent,
    passed: dto.percent >= 70,
    items: dto.items.map((item, index) => {
      const solution = solutions.get(item.questionVersionId)
      return {
        itemId: item.attemptItemId,
        number: index + 1,
        prompt: '',
        correct: item.correct,
        yourAnswer: null,
        ...(solution?.correctAnswer !== undefined ? { correctAnswer: solution.correctAnswer } : {}),
        ...(solution?.explanation !== undefined ? { explanation: solution.explanation } : {}),
      }
    }),
    topicStatus: dto.percent >= 70 ? 'PASSED' : 'IN_PROGRESS',
    nextTopicId: null,
  }
}

export type { AssessmentAttempt, AttemptItemResponse, SaveItemResponseRequest }
