import { describe, expect, it } from 'vitest'
import { mapEssayGrade } from './learningAdapters'

const serverResponse = {
  submissionId: 'eba1e594-7345-424a-b576-53524c5b37a0',
  status: 'GRADED',
  task: 'TASK_2',
  wordCount: 260,
  overallBand: 5.5,
  passed: false,
  criteria: [{ code: 'CC', band: 5.5, strengths: [], improvements: ['Link ideas'] }],
  corrections: [],
  studyPoints: [
    {
      kind: 'CRITERION', criterionCode: 'CC', band: 5.5,
      knowledgePointId: '3c000000-0000-4000-8000-020000000003',
      code: 'DEMO_WRITING_CRITERION_CC', name: 'Mạch lạc và liên kết (CC)', title: 'Mạch lạc và liên kết (CC)',
      reason: 'Chia đoạn hợp lý, sắp ý theo trình tự rõ ràng và nối câu bằng từ nối đúng chức năng.',
    },
    {
      kind: 'AI', title: 'Cohesive Devices',
      reason: 'Dùng từ nối tự nhiên để liên kết câu và đoạn mạch lạc.',
    },
  ],
  summary: 'Work on cohesion',
  pointsCharged: 3,
}

describe('mapEssayGrade study points', () => {
  it('reads grades from older servers as having no study points', () => {
    expect(mapEssayGrade({ submissionId: 'old', status: 'GRADED' }).studyPoints).toEqual([])
  })

  it('maps criterion metadata and defaults absent AI fields to null', () => {
    const criterion = {
      kind: 'CRITERION' as const, criterionCode: 'CC', band: 5.5, knowledgePointId: 'kp-1',
      code: 'DEMO_WRITING_CRITERION_CC', name: 'Mạch lạc và liên kết (CC)', title: 'Cohesion', reason: 'Link ideas.',
      excerpt: null, practiceKnowledgePointId: null,
    }
    const result = mapEssayGrade({ submissionId: 'new', status: 'GRADED', studyPoints: [criterion, { kind: 'AI', title: 'Transitions' }] })
    expect(result.studyPoints).toEqual([criterion, {
      kind: 'AI', criterionCode: null, band: null, knowledgePointId: null,
      code: null, name: null, title: 'Transitions', reason: null, excerpt: null, practiceKnowledgePointId: null,
    }])
  })

  it('maps criterion knowledge point judgments and treats unknown values as unassessed', () => {
    const result = mapEssayGrade({ submissionId: 'new', status: 'GRADED', criteria: [{
      code: 'CC', band: 5.5, knowledgePointJudgments: [
        { knowledgePointId: 'kp-1', code: 'LINKING', name: 'Từ nối', judgment: 'PASS', excerpt: 'However', reason: 'Good use.' },
        { knowledgePointId: 'kp-2', judgment: 'FUTURE_VALUE' },
        { code: 'NO_ID', judgment: 'FAIL' },
      ],
    }] })

    expect(result.criteria[0]?.knowledgePointJudgments).toEqual([
      { knowledgePointId: 'kp-1', code: 'LINKING', name: 'Từ nối', judgment: 'PASS', excerpt: 'However', reason: 'Good use.' },
      { knowledgePointId: 'kp-2', code: null, name: null, judgment: 'NOT_ASSESSED', excerpt: null, reason: null },
    ])
  })

  it('maps a knowledge point study point and drops one without an id', () => {
    const result = mapEssayGrade({ submissionId: 'new', status: 'GRADED', studyPoints: [
      { kind: 'KNOWLEDGE_POINT', criterionCode: 'CC', knowledgePointId: 'kp-1', practiceKnowledgePointId: 'practice-kp',
        name: 'Từ nối', excerpt: 'Moreover', reason: 'Dùng sai chức năng.' },
      { kind: 'KNOWLEDGE_POINT', title: 'Missing id' },
    ] })

    expect(result.studyPoints).toEqual([{
      kind: 'KNOWLEDGE_POINT', criterionCode: 'CC', band: null, knowledgePointId: 'kp-1',
      code: null, name: 'Từ nối', title: null, reason: 'Dùng sai chức năng.', excerpt: 'Moreover',
      practiceKnowledgePointId: 'practice-kp',
    }])
  })

  it('treats unknown kinds as AI and drops unusable points', () => {
    const result = mapEssayGrade({ submissionId: 'new', status: 'GRADED', studyPoints: [
      { kind: 'future-kind', title: 'Visible suggestion' },
      { kind: 'AI' }, { kind: 'AI', title: '  ' },
      { kind: 'CRITERION', criterionCode: 'CC' },
    ] })
    expect(result.studyPoints).toHaveLength(1)
    expect(result.studyPoints[0]).toMatchObject({ kind: 'AI', title: 'Visible suggestion' })
  })

  it('maps the JSON serialized by the backend WebMvc test', () => {
    expect(mapEssayGrade(serverResponse).studyPoints).toEqual([
      {
        kind: 'CRITERION', criterionCode: 'CC', band: 5.5,
        knowledgePointId: '3c000000-0000-4000-8000-020000000003',
        code: 'DEMO_WRITING_CRITERION_CC', name: 'Mạch lạc và liên kết (CC)', title: 'Mạch lạc và liên kết (CC)',
        reason: 'Chia đoạn hợp lý, sắp ý theo trình tự rõ ràng và nối câu bằng từ nối đúng chức năng.',
        excerpt: null, practiceKnowledgePointId: null,
      },
      {
        kind: 'AI', criterionCode: null, band: null, knowledgePointId: null,
        code: null, name: null, title: 'Cohesive Devices',
        reason: 'Dùng từ nối tự nhiên để liên kết câu và đoạn mạch lạc.', excerpt: null, practiceKnowledgePointId: null,
      },
    ])
  })

describe('mapEssayGrade judgments of the question points', () => {
  it('reads a grade made before the question points were judged as having none', () => {
    expect(mapEssayGrade({ submissionId: 'old', status: 'GRADED' }).taskKnowledgePointJudgments).toEqual([])
  })

  it('maps the question point judgments and treats unknown values as unassessed', () => {
    const result = mapEssayGrade({ submissionId: 'new', status: 'GRADED', taskKnowledgePointJudgments: [
      { knowledgePointId: 'kp-1', code: 'TOPIC', name: 'Câu chủ đề', judgment: 'FAIL', excerpt: 'Trees are good.', reason: 'Thiếu ý chính.' },
      { knowledgePointId: 'kp-2', judgment: 'SOMETHING_NEW' },
      { code: 'NO_ID', judgment: 'PASS' },
    ] })

    expect(result.taskKnowledgePointJudgments).toEqual([
      { knowledgePointId: 'kp-1', code: 'TOPIC', name: 'Câu chủ đề', judgment: 'FAIL', excerpt: 'Trees are good.', reason: 'Thiếu ý chính.' },
      { knowledgePointId: 'kp-2', code: null, name: null, judgment: 'NOT_ASSESSED', excerpt: null, reason: null },
    ])
  })

  it('keeps a failed question point whose practice target is absent as it came', () => {
    const [point] = mapEssayGrade({ submissionId: 'new', status: 'GRADED', studyPoints: [
      { kind: 'KNOWLEDGE_POINT', knowledgePointId: 'kp-1', name: 'Câu chủ đề', excerpt: 'Trees are good.' },
    ] }).studyPoints

    expect(point).toMatchObject({ kind: 'KNOWLEDGE_POINT', criterionCode: null, band: null, practiceKnowledgePointId: null })
  })
})
})

describe('mapEssayGrade corrections', () => {
  it('keeps whether a correction is only a suggestion of better wording', () => {
    const result = mapEssayGrade({ submissionId: 'new', status: 'GRADED', corrections: [
      { excerpt: 'a', suggestion: 'b', category: 'GRAMMAR', certainty: 'SUGGESTION' },
      { excerpt: 'c', suggestion: 'd' },
    ] })

    expect(result.corrections.map((item) => item.certainty)).toEqual(['SUGGESTION', null])
  })
})
