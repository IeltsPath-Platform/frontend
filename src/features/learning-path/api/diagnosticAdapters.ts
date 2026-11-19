import type {
  Diagnostic,
  DiagnosticProbe,
  DiagnosticProbeStatus,
  DiagnosticProbeSubmission,
  DiagnosticProbeSummary,
} from '~types/learningPath'
import type { ErrorHintDto } from './errorHint'
import { mapPassageField, mapQuestion, mapQuestionResult, type QuestionDto } from './learningAdapters'

export type DiagnosticDto = {
  sessionId: string
  rootReviewId: string
  status: 'PROBING' | 'CONCLUDED'
  probes?: Array<{
    probeId: string
    knowledgePoint: { knowledgePointId: string; code: string; name: string }
    depth: number
    status: DiagnosticProbeStatus
    correct?: number | null
    total?: number | null
    result?: 'PASSED' | 'FAILED' | 'UNKNOWN' | null
  }> | null
  conclusion?: Array<{ knowledgePointId: string; code: string; name: string }> | null
  waitingOnReviewIds?: string[] | null
}

export type DiagnosticProbeDto = {
  sessionId: string
  probeId: string
  knowledgePointId: string
  status: DiagnosticProbeStatus
  passage?: string | { title?: string; paragraphs?: Array<{ label?: string | null; text: string }> } | null
  audio?: { mediaUrl: string; durationSeconds?: number | null } | null
  questions?: QuestionDto[] | null
}

export type DiagnosticProbeSubmissionDto = {
  probeId: string
  passed: boolean
  correct: number
  total: number
  sessionStatus: 'PROBING' | 'CONCLUDED'
  results: Array<{
    questionVersionId: string
    correct: boolean
    correctAnswer?: string
    explanation?: string
    hint?: string | null
    error?: ErrorHintDto | null
  }>
}

function mapProbeSummary(dto: NonNullable<DiagnosticDto['probes']>[number]): DiagnosticProbeSummary {
  return {
    probeId: dto.probeId,
    knowledgePoint: dto.knowledgePoint,
    depth: dto.depth,
    status: dto.status,
    correct: dto.correct ?? null,
    total: dto.total ?? null,
    result: dto.result ?? null,
  }
}

export function mapDiagnostic(dto: DiagnosticDto): Diagnostic {
  return {
    sessionId: dto.sessionId,
    rootReviewId: dto.rootReviewId,
    status: dto.status,
    probes: (dto.probes ?? []).map(mapProbeSummary),
    conclusion: dto.conclusion ?? [],
    waitingOnReviewIds: dto.waitingOnReviewIds ?? [],
  }
}

export function mapDiagnosticProbe(dto: DiagnosticProbeDto): DiagnosticProbe {
  return {
    sessionId: dto.sessionId,
    probeId: dto.probeId,
    knowledgePointId: dto.knowledgePointId,
    status: dto.status,
    passage: mapPassageField(dto.passage),
    audio: dto.audio?.mediaUrl
      ? { mediaUrl: dto.audio.mediaUrl, durationSeconds: dto.audio.durationSeconds ?? null, transcript: null }
      : null,
    questions: (dto.questions ?? []).map(mapQuestion),
  }
}

export function mapDiagnosticProbeSubmission(dto: DiagnosticProbeSubmissionDto): DiagnosticProbeSubmission {
  return {
    probeId: dto.probeId,
    passed: dto.passed,
    correct: dto.correct,
    total: dto.total,
    results: dto.results.map(mapQuestionResult),
    sessionStatus: dto.sessionStatus,
  }
}
