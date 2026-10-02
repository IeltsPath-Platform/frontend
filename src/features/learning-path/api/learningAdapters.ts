import type {
  AnswerInput,
  AssessmentAttempt,
  AttemptItemResponse,
  AttemptResult,
  AttemptStructure,
  ExerciseSubmissionRequest,
  ExerciseSubmissionResult,
  LessonCompletionResult,
  LessonDetail,
  LessonStatus,
  Question,
  QuestionResult,
  RawBlock,
  ReviewDetail,
  ReviewRef,
  ReviewStatus,
  ReviewSubmissionResult,
  SaveItemResponseRequest,
  StartAttemptRequest,
  TestAssignment,
  TestStatus,
  TopicLessonsResponse,
  TopicStatus,
  TopicSummary,
} from '~types/learningPath'

/** Wire DTOs — backend/docs/contracts/lesson-learning-v1.md */

export type TopicSummaryDto = {
  topicId: string
  code: string
  name: string
  sequenceOrder: number
  status: TopicStatus
  completedLessonCount: number
  accessLevel?: 'FREE' | 'PREMIUM'
}

export type LessonSummaryDto = {
  lessonId: string
  code: string
  title: string
  sortOrder: number
  status: LessonStatus
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

export type SolutionDto = {
  questionVersionId: string
  correctAnswer: string
  explanation: string
}

export type AssetDto = {
  id?: string
  assetType: string
  textContent?: string | null
  mediaUrl?: string | null
  durationSeconds?: number | null
  transcript?: string | null
}

export type LessonBlockDto = {
  blockId: string
  blockType: string
  blockKind?: string
  sortOrder: number
  passed?: boolean
  textContent?: string
  asset?: AssetDto
  questions?: QuestionDto[]
  solutions?: SolutionDto[]
  question?: {
    questionVersionId: string
    stem: string
    task: string
    minWords: number
    passBand: number
    images?: Array<{ mediaUrl: string; altText: string }>
  }
  latestSubmission?: {
    id: string
    status: string
    overallBand: number | null
    passed: boolean | null
  } | null
  sampleAnswer?: string | null
}

export type LessonDetailDto = {
  lessonId: string
  topicId: string
  code: string
  title: string
  summary?: string | null
  sortOrder: number
  status: LessonStatus
  blocks: LessonBlockDto[]
}

export type ExerciseSubmissionResultDto = {
  blockPassed: boolean
  lessonCompleted: boolean
  results: Array<{
    questionVersionId: string
    correct: boolean
    correctAnswer?: string
    explanation?: string
    hint?: string | null
  }>
}

export type LessonCompletionDto = {
  lessonId: string
  status: 'COMPLETED'
}

export type ReviewRefDto = {
  reviewId: string
  lessonId: string
  knowledgePointId: string
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
}

export type ReviewSubmissionResultDto = {
  reviewStatus: ReviewStatus
  results: Array<{
    questionVersionId: string
    correct: boolean
    correctAnswer?: string
    explanation?: string
  }>
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
}): QuestionResult {
  return {
    questionId: dto.questionVersionId,
    correct: dto.correct,
    ...(dto.correctAnswer !== undefined ? { correctAnswer: dto.correctAnswer } : {}),
    ...(dto.explanation !== undefined ? { explanation: dto.explanation } : {}),
    hint: dto.hint ?? null,
  }
}

function mapSolution(dto: SolutionDto): QuestionResult {
  return mapQuestionResult({
    questionVersionId: dto.questionVersionId,
    correct: true,
    correctAnswer: dto.correctAnswer,
    explanation: dto.explanation,
  })
}

function mapBlock(dto: LessonBlockDto): RawBlock {
  if (dto.blockType === 'TEXT') {
    return {
      id: dto.blockId,
      sortOrder: dto.sortOrder,
      type: 'TEXT',
      text: dto.textContent ?? '',
    }
  }

  if (dto.blockType === 'ASSET') {
    const asset = dto.asset
    const assetType = asset?.assetType ?? 'PASSAGE'
    if (assetType === 'PASSAGE') {
      const text = asset?.textContent ?? ''
      return {
        id: dto.blockId,
        sortOrder: dto.sortOrder,
        type: 'ASSET',
        assetType: 'PASSAGE',
        mediaUrl: null,
        title: '',
        paragraphs: text ? [{ label: null, text }] : [],
      }
    }
    if (assetType === 'AUDIO' && asset?.mediaUrl) {
      return {
        id: dto.blockId,
        sortOrder: dto.sortOrder,
        type: 'ASSET',
        assetType: 'AUDIO',
        mediaUrl: asset.mediaUrl,
        durationSeconds: asset.durationSeconds ?? null,
        transcript: asset.transcript ?? null,
      }
    }
    return {
      id: dto.blockId,
      sortOrder: dto.sortOrder,
      type: 'ASSET',
      assetType,
      mediaUrl: asset?.mediaUrl ?? null,
      title: '',
      paragraphs: [],
    }
  }

  if (dto.blockType === 'EXERCISE' && dto.blockKind === 'ESSAY' && dto.question) {
    return {
      id: dto.blockId,
      sortOrder: dto.sortOrder,
      type: 'EXERCISE',
      blockKind: 'ESSAY',
      title: 'Bài luận Writing',
      questionVersionId: dto.question.questionVersionId,
      stem: dto.question.stem,
      task: dto.question.task,
      minWords: dto.question.minWords,
      passBand: dto.question.passBand,
      images: (dto.question.images ?? []).map((image) => ({
        mediaUrl: image.mediaUrl,
        altText: image.altText,
      })),
      latestSubmission: dto.latestSubmission ?? null,
      sampleAnswer: dto.sampleAnswer ?? null,
    }
  }

  if (dto.blockType === 'EXERCISE') {
    const questions = (dto.questions ?? []).map(mapQuestion)
    const passed = dto.passed === true
    return {
      id: dto.blockId,
      sortOrder: dto.sortOrder,
      type: 'EXERCISE',
      blockKind: 'EXERCISE',
      title: 'Bài tập',
      instructions: '',
      knowledgePointCode: '',
      questions,
      state: passed ? 'PASSED' : 'NOT_ATTEMPTED',
      savedAnswers: null,
      solutions: passed && dto.solutions ? dto.solutions.map(mapSolution) : null,
    }
  }

  return {
    id: dto.blockId,
    sortOrder: dto.sortOrder,
    type: dto.blockType,
  }
}

export function mapTopicSummary(dto: TopicSummaryDto): TopicSummary {
  const premium = dto.accessLevel === 'PREMIUM'
  return {
    id: dto.topicId,
    code: dto.code,
    title: dto.name,
    description: premium ? 'Nội dung Premium.' : '',
    sequenceOrder: dto.sequenceOrder,
    status: premium && dto.status !== 'PASSED' ? 'LOCKED' : dto.status,
    completedLessons: dto.completedLessonCount,
    totalLessons: Math.max(dto.completedLessonCount, 0),
    lockedReason: premium && dto.status !== 'PASSED'
      ? 'Topic Premium — chưa mở trong giai đoạn này.'
      : dto.status === 'LOCKED'
        ? 'Hoàn thành chặng trước để mở khóa.'
        : null,
  }
}

export function mapTopicLessons(dto: TopicLessonsDto, topic: TopicSummary): TopicLessonsResponse {
  const lessons = dto.lessons.map((lesson) => ({
    id: lesson.lessonId,
    title: lesson.title,
    sortOrder: lesson.sortOrder,
    status: lesson.status,
    estimatedMinutes: 10,
    lockedReason: lesson.status === 'LOCKED' ? 'Hoàn thành bài trước để mở.' : null,
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

export function mapLessonDetail(dto: LessonDetailDto, topicTitle: string): LessonDetail {
  return {
    id: dto.lessonId,
    topicId: dto.topicId,
    topicTitle,
    title: dto.title,
    sortOrder: dto.sortOrder,
    status: dto.status,
    blocks: dto.blocks.map(mapBlock),
    nextLessonId: null,
    pendingReviews: [],
  }
}

export function mapExerciseSubmission(
  blockId: string,
  request: ExerciseSubmissionRequest,
  dto: ExerciseSubmissionResultDto,
): ExerciseSubmissionResult {
  const results = dto.results.map(mapQuestionResult)
  const correctCount = results.filter((result) => result.correct).length
  const totalCount = results.length || request.answers.length
  return {
    blockId,
    passed: dto.blockPassed,
    correctCount,
    totalCount,
    percent: totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100),
    results,
    lessonCompleted: dto.lessonCompleted,
    nextLessonId: null,
    pendingReviews: [],
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
    knowledgePointCode: dto.knowledgePointId.slice(0, 8),
    knowledgePointTitle: 'Bài ôn bắt buộc',
  }
}

export function mapReviewDetail(dto: ReviewDetailDto, topicId: string): ReviewDetail {
  const theory = dto.theory.map((text, index) => ({
    id: `theory-${index}`,
    sortOrder: index + 1,
    type: 'TEXT',
    text,
  }))

  const set = dto.set
    ? {
        setId: dto.set.reviewSetId,
        packageCode: dto.set.packageId.slice(0, 8),
        attemptNumber: 1,
        maxAttempts: 3,
        passage: (() => {
          if (!dto.set?.passage) return { title: '', paragraphs: [] as Array<{ label: string | null; text: string }> }
          if (typeof dto.set.passage === 'string') {
            return { title: '', paragraphs: [{ label: null, text: dto.set.passage }] }
          }
          return {
            title: dto.set.passage.title ?? '',
            paragraphs: (dto.set.passage.paragraphs ?? []).map((paragraph) => ({
              label: paragraph.label ?? null,
              text: paragraph.text,
            })),
          }
        })(),
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
    knowledgePoint: { code: 'KP', title: 'Ôn kiến thức' },
    sourceLessonTitle: 'Bài học trước',
    theory,
    set,
    resumeLessonId: dto.lessonId,
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
    passed: dto.reviewStatus === 'DONE',
    correctCount,
    totalCount,
    percent,
    results,
    resumeLessonId,
    topicId,
  }
}

export function mapTestAssignment(dto: TestAssignmentDto, topicId: string): TestAssignment {
  return {
    assignmentId: dto.assignmentId,
    topicId,
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
      items: section.items.map((item) => ({
        id: item.id,
        questionVersionId: item.questionVersionId,
        sortOrder: item.sortOrder,
        questionSnapshot: stringifySnapshot(normalizeQuestionSnapshot(item.questionSnapshot, item.questionVersionId)),
        answerSnapshot: item.answerSnapshot == null ? null : stringifySnapshot(item.answerSnapshot),
        knowledgeSnapshot: item.knowledgeSnapshot == null ? null : stringifySnapshot(item.knowledgeSnapshot),
      })),
    })),
  }
}

function normalizeQuestionSnapshot(raw: unknown, questionVersionId: string): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const record = raw as Record<string, unknown>
  if (typeof record.prompt === 'string' && typeof record.number === 'number') return record
  // BE may use stem/sortOrder/options[{optionKey,content}]
  const options = Array.isArray(record.options)
    ? record.options.map((option) => {
        if (!option || typeof option !== 'object') return option
        const entry = option as Record<string, unknown>
        if (typeof entry.value === 'string') return entry
        return { value: entry.optionKey, label: entry.content }
      })
    : record.options ?? null
  return {
    number: typeof record.sortOrder === 'number' ? record.sortOrder : 0,
    prompt: typeof record.stem === 'string' ? record.stem : typeof record.prompt === 'string' ? record.prompt : '',
    options,
    id: questionVersionId,
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
