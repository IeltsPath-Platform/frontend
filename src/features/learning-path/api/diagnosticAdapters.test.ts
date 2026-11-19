import { describe, expect, it } from 'vitest'
import {
  mapDiagnostic,
  mapDiagnosticProbe,
  mapDiagnosticProbeSubmission,
  type DiagnosticDto,
} from './diagnosticAdapters'
import { mapReviewDetail, mapReviewSubmission, type ReviewDetailDto, type ReviewSubmissionResultDto } from './learningAdapters'

describe('diagnostic adapters', () => {
  it('keeps the score of an answered probe and leaves it null for one that was not answered', () => {
    const dto: DiagnosticDto = {
      sessionId: 's1', rootReviewId: 'r1', status: 'PROBING',
      probes: [
        { probeId: 'p1', knowledgePoint: { knowledgePointId: 'k1', code: 'A', name: 'Nền A' }, depth: 1, status: 'ANSWERED', correct: 2, total: 3, result: 'PASSED' },
        { probeId: 'p2', knowledgePoint: { knowledgePointId: 'k2', code: 'B', name: 'Nền B' }, depth: 1, status: 'SKIPPED' },
      ],
    }

    const diagnosis = mapDiagnostic(dto)

    expect(diagnosis.probes[0]).toMatchObject({ status: 'ANSWERED', correct: 2, total: 3, result: 'PASSED' })
    expect(diagnosis.probes[1]).toMatchObject({ status: 'SKIPPED', correct: null, total: null, result: null })
    expect(diagnosis.conclusion).toEqual([])
    expect(diagnosis.waitingOnReviewIds).toEqual([])
  })

  it('maps the questions of an open probe and gives a closed probe none', () => {
    const open = mapDiagnosticProbe({
      sessionId: 's1', probeId: 'p1', knowledgePointId: 'k1', status: 'OPEN',
      passage: 'Đoạn một.\n\nĐoạn hai.',
      audio: { mediaUrl: 'https://media.example/a.mp3', durationSeconds: 30 },
      questions: [{ questionVersionId: 'q1', sortOrder: 1, stem: 'Chọn.', options: [{ optionKey: 'A', content: 'Một', sortOrder: 1 }] }],
    })
    const closed = mapDiagnosticProbe({ sessionId: 's1', probeId: 'p2', knowledgePointId: 'k2', status: 'NO_SET' })

    expect(open.questions).toHaveLength(1)
    expect(open.questions[0]).toMatchObject({ id: 'q1', prompt: 'Chọn.' })
    expect(open.audio).toMatchObject({ mediaUrl: 'https://media.example/a.mp3', durationSeconds: 30 })
    expect(closed.questions).toEqual([])
    expect(closed.audio).toBeNull()
  })

  it('maps the graded answers of a probe submission', () => {
    const submission = mapDiagnosticProbeSubmission({
      probeId: 'p1', passed: false, correct: 1, total: 3, sessionStatus: 'PROBING',
      results: [{ questionVersionId: 'q1', correct: true, correctAnswer: 'A', explanation: 'Vì A.' }],
    })

    expect(submission).toMatchObject({ probeId: 'p1', passed: false, correct: 1, total: 3, sessionStatus: 'PROBING' })
    expect(submission.results[0]).toMatchObject({ questionId: 'q1', correct: true, correctAnswer: 'A', explanation: 'Vì A.' })
  })
})

describe('review adapters for the diagnosis and the basket move', () => {
  const detail: ReviewDetailDto = { reviewId: 'r1', reviewStatus: 'PENDING', lessonId: 'l1', theory: [], set: null }

  it('treats a review without the new fields as active, with no diagnosis and nothing to wait for', () => {
    const review = mapReviewDetail(detail, 'topic-1')

    expect(review.state).toBe('ACTIVE')
    expect(review.diagnosticSessionId).toBeNull()
    expect(review.waitingOnReviewIds).toEqual([])
    expect(review.theoryScope).toBeNull()
  })

  it('carries the diagnosis state, the session and the reviews waited on', () => {
    const review = mapReviewDetail(
      { ...detail, state: 'WAITING_ON_PREREQUISITES', diagnosticSessionId: 's1', waitingOnReviewIds: ['gap-1'], theoryScope: 'NO_LESSON' },
      'topic-1',
    )

    expect(review).toMatchObject({ state: 'WAITING_ON_PREREQUISITES', diagnosticSessionId: 's1', waitingOnReviewIds: ['gap-1'], theoryScope: 'NO_LESSON' })
  })

  it('reads whether a submitted set left the review blocking, and null for an answer saved without it', () => {
    const base: ReviewSubmissionResultDto = { reviewStatus: 'PENDING', failedSets: 4, results: [] }

    expect(mapReviewSubmission({ ...base, blocking: false }, 't', null).blocking).toBe(false)
    expect(mapReviewSubmission({ ...base, blocking: true }, 't', null).blocking).toBe(true)
    expect(mapReviewSubmission(base, 't', null).blocking).toBeNull()
  })

  it('keeps counting attempts without a cap for an optional review', () => {
    const optional = mapReviewDetail(
      { ...detail, failedSets: 4, maxFailedSets: null, blocking: false,
        set: { reviewSetId: 'set-1', packageId: 'package-0001', packageVersionId: 'v1', questions: [] } },
      'topic-1',
    )

    expect(optional.set?.attemptNumber).toBe(5)
    expect(optional.set?.maxAttempts).toBeNull()
  })
})
