import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adviseTime,
  formatClockTime,
  formatMinutes,
  formatTip,
  mascotMessage,
  rateAccuracy,
  rateFormats,
  weakFormats,
} from '../src/features/practice/lib/practiceAnalysis.ts'
import { buildReadingResultView } from '../src/features/practice/lib/readingResultView.ts'

test('accuracy is rated 90 excellent, 75 good, 50 average, 25 weak and below that very weak', () => {
  const expected: Array<[number, string]> = [
    [100, 'excellent'], [90, 'excellent'], [89, 'good'], [75, 'good'], [74, 'average'],
    [50, 'average'], [49, 'weak'], [25, 'weak'], [24, 'veryWeak'], [0, 'veryWeak'],
  ]
  for (const [percent, rating] of expected) assert.equal(rateAccuracy(percent), rating, `${percent}%`)
})

test('the formats that lose the most questions get priority 1 and 2, and only formats under 50% qualify', () => {
  const rated = rateFormats([
    { formatCode: 'SUMMARY_COMPLETION', total: 16, correct: 0, incorrect: 0, blank: 16 },
    { formatCode: 'MATCHING_INFORMATION', total: 6, correct: 1, incorrect: 3, blank: 2 },
    { formatCode: 'MULTIPLE_CHOICE_ONE', total: 4, correct: 1, incorrect: 3, blank: 0 },
    { formatCode: 'YES_NO_NOT_GIVEN', total: 5, correct: 3, incorrect: 2, blank: 0 },
  ])
  const byCode = Object.fromEntries(rated.map((format) => [format.formatCode, format]))
  assert.equal(byCode.SUMMARY_COMPLETION!.priority, 1)
  assert.equal(byCode.MATCHING_INFORMATION!.priority, 2)
  assert.equal(byCode.MULTIPLE_CHOICE_ONE!.priority, null)
  assert.equal(byCode.YES_NO_NOT_GIVEN!.priority, null, '60% is not a weak format, so it is never a priority')
  assert.equal(byCode.SUMMARY_COMPLETION!.rating, 'veryWeak')
  assert.equal(byCode.MATCHING_INFORMATION!.percent, 17)
  assert.equal(rated[0]!.formatCode, 'SUMMARY_COMPLETION', 'the weakest format comes first')
})

test('a long format at 40% outranks a short one at 0% because it loses more questions', () => {
  const rated = rateFormats([
    { formatCode: 'GAP_FILLING', total: 20, correct: 8, incorrect: 12, blank: 0 },
    { formatCode: 'MATCHING_HEADINGS', total: 2, correct: 0, incorrect: 2, blank: 0 },
  ])
  assert.equal(rated.find((format) => format.formatCode === 'GAP_FILLING')!.priority, 1)
  assert.equal(rated.find((format) => format.formatCode === 'MATCHING_HEADINGS')!.priority, 2)
})

test('why points were lost lists only the formats under 50%, weakest first', () => {
  const rated = rateFormats([
    { formatCode: 'A_FORMAT', total: 4, correct: 4, incorrect: 0, blank: 0 },
    { formatCode: 'B_FORMAT', total: 4, correct: 1, incorrect: 3, blank: 0 },
    { formatCode: 'C_FORMAT', total: 4, correct: 0, incorrect: 4, blank: 0 },
    { formatCode: 'D_FORMAT', total: 4, correct: 2, incorrect: 2, blank: 0 },
  ])
  assert.deepEqual(weakFormats(rated).map((format) => format.formatCode), ['C_FORMAT', 'B_FORMAT'])
})

test('every known format has a tip and an unknown one still gets general advice', () => {
  assert.match(formatTip('TRUE_FALSE_NOT_GIVEN'), /NOT GIVEN/)
  assert.ok(formatTip('SOMETHING_NEW').length > 10)
})

test('the mascot says something for every band of results', () => {
  const messages = new Set([95, 80, 60, 30, 5].map(mascotMessage))
  assert.equal(messages.size, 5)
})

test('time advice compares the time taken with the time given', () => {
  assert.match(adviseTime(89, 3600, 40).message, /đoán/, 'a 2% attempt on a one hour test reads as guessing')
  assert.match(adviseTime(2400, 3600, 40).message, /dư thời gian/)
  assert.match(adviseTime(3300, 3600, 40).message, /gần hết/)
  assert.match(adviseTime(4000, 3600, 40).message, /quá thời gian/)
  assert.equal(adviseTime(89, 3600, 40).secondsPerQuestion, 2)
  assert.match(adviseTime(null, 3600, 40).message, /Chưa ghi nhận/)
  assert.equal(adviseTime(600, null, 10).usedShare, null)
})

test('clock and minute formats', () => {
  assert.equal(formatClockTime(89), '00:01:29')
  assert.equal(formatClockTime(3725), '01:02:05')
  assert.equal(formatClockTime(null), '—')
  assert.equal(formatMinutes(28), '00:28')
  assert.equal(formatMinutes(1200), '20:00')
  assert.equal(formatMinutes(3600), '1:00:00')
})

test('the result view reads the band, the limit and the time of each passage that the backend adds', () => {
  const question = (stem: string, groupId: string) => JSON.stringify({ stem, groupId })
  const view = buildReadingResultView({
    structure: {
      sections: [
        { id: 's1', sortOrder: 1, snapshot: { title: 'Passage 1: A', partNo: 1, groups: [{ groupId: 'g1', formatCode: 'GAP_FILLING' }] },
          items: [{ id: 'i1', sortOrder: 1, questionSnapshot: question('q1', 'g1') }, { id: 'i2', sortOrder: 2, questionSnapshot: question('q2', 'g1') }] },
        { id: 's2', sortOrder: 2, snapshot: { title: 'Passage 2: B', partNo: 2, groups: [{ groupId: 'g2', formatCode: 'MULTIPLE_CHOICE_ONE' }] },
          items: [{ id: 'i3', sortOrder: 1, questionSnapshot: question('q3', 'g2') }] },
      ],
    },
    responses: [
      { attemptItemId: 'i1', payload: JSON.stringify({ answer: 'x' }) },
      { attemptItemId: 'i3', payload: JSON.stringify({ answer: 'B' }) },
    ],
    result: {
      score: 2, maxScore: 3, percent: 66.67,
      items: [{ attemptItemId: 'i1', correct: true }, { attemptItemId: 'i2', correct: false }, { attemptItemId: 'i3', correct: true }],
      practice: {
        scope: 'FULL', startedAt: '2026-10-15T10:00:00Z', submittedAt: '2026-10-15T10:01:29Z', timeLimitSeconds: 2400, band: 4.5,
        sections: [
          { attemptSectionId: 's1', partNo: 1, title: 'Passage 1: A', questionCount: 2, timeSpentSeconds: 50, timeLimitSeconds: 1200 },
          { attemptSectionId: 's2', partNo: 2, title: 'Passage 2: B', questionCount: 1, timeSpentSeconds: 30, timeLimitSeconds: 1200 },
        ],
      },
    },
    attempt: { startedAt: null, submittedAt: null },
  })

  assert.equal(view.scope, 'FULL')
  assert.equal(view.band, 4.5)
  assert.equal(view.timeLimitSeconds, 2400)
  assert.equal(view.durationSeconds, 89, 'the backend times win over the attempt times')
  assert.deepEqual(view.sections.map((section) => [section.partNo, section.total, section.correct, section.blank, section.timeSpentSeconds]), [
    [1, 2, 1, 1, 50],
    [2, 1, 1, 0, 30],
  ])
})

test('a result without practice data still builds, with no band and no section times', () => {
  const view = buildReadingResultView({
    structure: { sections: [{ id: 's1', sortOrder: 1, snapshot: { title: 'Passage 1', groups: [] }, items: [{ id: 'i1', sortOrder: 1, questionSnapshot: JSON.stringify({ stem: 'q' }) }] }] },
    responses: [],
    result: { score: 0, maxScore: 1, percent: 0, items: [{ attemptItemId: 'i1', correct: false }] },
    attempt: { startedAt: '2026-10-15T10:00:00Z', submittedAt: '2026-10-15T10:00:10Z' },
  })
  assert.equal(view.band, null)
  assert.equal(view.scope, null)
  assert.equal(view.durationSeconds, 10)
  assert.equal(view.sections[0]!.timeSpentSeconds, null)
})
