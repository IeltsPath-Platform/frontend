import assert from 'node:assert/strict'
import test from 'node:test'
import { parseExplanation } from '../src/features/practice/lib/explanationSteps.ts'

const DETAILED = [
  'Bước 1 · Hiểu câu hỏi',
  'Câu hỏi nghĩa là: Thư viện hiện chỉ được dùng để mượn sách.',
  'Bước 2 · Tìm từ khóa và cách diễn đạt lại',
  '- only for borrowing books ~ no longer used only for borrowing books',
  '- libraries ~ the buildings',
  'Bước 3 · Đối chiếu với bài đọc',
  'Đoạn A: «the buildings are no longer used only for borrowing books»',
  'Bài nói thư viện không còn chỉ để mượn sách, trái với câu hỏi.',
  'Bước 4 · Đáp án',
  'FALSE',
].join('\n')

test('a detailed explanation is split into its numbered steps', () => {
  const { steps, plain } = parseExplanation(DETAILED)
  assert.equal(plain, '')
  assert.deepEqual(steps.map((step) => [step.number, step.title]), [
    [1, 'Hiểu câu hỏi'], [2, 'Tìm từ khóa và cách diễn đạt lại'], [3, 'Đối chiếu với bài đọc'], [4, 'Đáp án'],
  ])
})

test('keyword lines are bullets, the quoted passage is the evidence and the rest is text', () => {
  const { steps } = parseExplanation(DETAILED)
  assert.deepEqual(steps[1]!.lines.map((line) => line.kind), ['bullet', 'bullet'])
  assert.equal(steps[1]!.lines[0]!.text, 'only for borrowing books ~ no longer used only for borrowing books')
  assert.deepEqual(steps[2]!.lines.map((line) => line.kind), ['evidence', 'text'])
  assert.deepEqual(steps[3]!.lines, [{ kind: 'text', text: 'FALSE' }])
})

test('an old one-line explanation stays one plain paragraph', () => {
  const parsed = parseExplanation('Paragraph A: no longer used only for borrowing books.')
  assert.deepEqual(parsed.steps, [])
  assert.equal(parsed.plain, 'Paragraph A: no longer used only for borrowing books.')
})

test('empty and missing explanations give nothing to draw', () => {
  for (const value of [null, undefined, '', '  \n ']) {
    const parsed = parseExplanation(value)
    assert.deepEqual(parsed.steps, [])
    assert.equal(parsed.plain, '')
  }
})

test('windows line endings and spacing around the heading marker are tolerated', () => {
  const { steps } = parseExplanation('Bước 1: Hiểu câu hỏi\r\nNội dung\r\nBước 2 - Đáp án\r\nTRUE')
  assert.deepEqual(steps.map((step) => step.title), ['Hiểu câu hỏi', 'Đáp án'])
  assert.equal(steps[0]!.lines[0]!.text, 'Nội dung')
})
