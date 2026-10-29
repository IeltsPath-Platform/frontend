import { describe, expect, it } from 'vitest'
import { answerShapeOf, buildVersionRequest, describeAnswerSpec, formStateFromVersion, initialFormState } from './versionForm'
import type { QuestionVersion } from '../types'

describe('formStateFromVersion', () => {
  const version: QuestionVersion = {
    id: 'v1', versionNumber: 1, stem: 'Pick one', status: 'PUBLISHED', difficulty: 'HARD',
    answerSpecJson: '{"type":"CHOICE","correct":"B"}', explanation: 'Because', hint: null,
    options: [{ optionKey: 'B', content: 'Rivers', sortOrder: 2 }, { optionKey: 'A', content: 'Trees', sortOrder: 1 }],
    knowledgePoints: [{ knowledgePointId: 'kp1', weight: null }],
  }

  it('copies the content of a choice version under the next number, options in sort order', () => {
    const form = formStateFromVersion('MULTIPLE_CHOICE', version, 2)

    expect(form).toMatchObject({ versionNumber: 2, stem: 'Pick one', correctKey: 'B', difficulty: 'HARD', explanation: 'Because', hint: '' })
    expect(form.options).toEqual([{ key: 'A', content: 'Trees' }, { key: 'B', content: 'Rivers' }])
    expect(form.knowledgePoints).toEqual([{ knowledgePointId: 'kp1', weight: 1 }])
  })

  it('round-trips through buildVersionRequest', () => {
    const result = buildVersionRequest('MULTIPLE_CHOICE', formStateFromVersion('MULTIPLE_CHOICE', version, 2))

    expect(result.ok).toBe(true)
  })

  it('reads fill and essay answer specs', () => {
    const fill = formStateFromVersion('FILL_IN_BLANK', { ...version, options: [], answerSpecJson: '{"type":"FILL","accepted":["a","b"],"maxWords":2}' }, 3)
    const essay = formStateFromVersion('ESSAY', { ...version, options: [], answerSpecJson: '{"type":"ESSAY","task":"TASK_1","minWords":150,"passBand":6.5,"chartFacts":"Up"}' }, 3)

    expect(fill).toMatchObject({ accepted: 'a\nb', maxWords: '2' })
    expect(essay).toMatchObject({ essayTask: 'TASK_1', minWords: '150', passBand: '6.5', chartFacts: 'Up' })
  })

  it('keeps the fixed options of true/false/not given and tolerates an unreadable spec', () => {
    const form = formStateFromVersion('TRUE_FALSE_NOT_GIVEN', { ...version, answerSpecJson: 'not json' }, 2)

    expect(form.options.map((option) => option.key)).toEqual(['TRUE', 'FALSE', 'NOT_GIVEN'])
    expect(form.correctKey).toBe('')
  })
})

function choiceForm() {
  const form = initialFormState('MULTIPLE_CHOICE', 2)
  form.stem = 'What is the main idea?'
  form.options = [{ key: 'A', content: 'Trees' }, { key: 'B', content: 'Rivers' }, { key: '', content: '' }]
  form.correctKey = 'B'
  return form
}

describe('buildVersionRequest', () => {
  it('builds a CHOICE spec and numbered options, dropping blank rows', () => {
    const result = buildVersionRequest('MULTIPLE_CHOICE', { ...choiceForm(), difficulty: 'MEDIUM', explanation: ' Because. ' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.body).toMatchObject({
      versionNumber: 2,
      stem: 'What is the main idea?',
      options: [
        { optionKey: 'A', content: 'Trees', sortOrder: 1 },
        { optionKey: 'B', content: 'Rivers', sortOrder: 2 },
      ],
      difficulty: 'MEDIUM',
      explanation: 'Because.',
      hint: null,
    })
    expect(JSON.parse(result.body.answerSpecJson ?? '')).toEqual({ type: 'CHOICE', correct: 'B' })
  })

  it('reports every problem of a choice question together', () => {
    const form = choiceForm()
    form.stem = ' '
    form.options = [{ key: 'A', content: 'Only one' }, { key: 'A', content: 'Same key' }]
    form.correctKey = 'Z'
    const result = buildVersionRequest('MULTIPLE_CHOICE', form)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems).toEqual(expect.arrayContaining([
      'Cần nhập nội dung câu hỏi.',
      'Mã các lựa chọn không được trùng nhau.',
      'Cần chọn đáp án đúng trong các lựa chọn.',
    ]))
  })

  it('gives True / False / Not Given its three fixed options', () => {
    const form = initialFormState('TRUE_FALSE_NOT_GIVEN', 1)
    form.stem = 'The writer agrees.'
    form.correctKey = 'NOT_GIVEN'
    const result = buildVersionRequest('TRUE_FALSE_NOT_GIVEN', form)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.body.options.map((option) => option.optionKey)).toEqual(['TRUE', 'FALSE', 'NOT_GIVEN'])
    expect(JSON.parse(result.body.answerSpecJson ?? '')).toEqual({ type: 'CHOICE', correct: 'NOT_GIVEN' })
  })

  it('builds a FILL spec from one accepted answer per line, with an optional word limit', () => {
    const form = initialFormState('FILL_IN_BLANK', 1)
    form.stem = 'The author is a ____.'
    form.accepted = 'critic\n  Critic \n\n'
    form.maxWords = '2'
    const result = buildVersionRequest('FILL_IN_BLANK', form)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(JSON.parse(result.body.answerSpecJson ?? '')).toEqual({ type: 'FILL', accepted: ['critic', 'Critic'], maxWords: 2 })
    expect(result.body.options).toEqual([])
  })

  it('rejects a FILL question without an accepted answer or with a bad word limit', () => {
    const form = initialFormState('SHORT_ANSWER', 1)
    form.stem = 'Name it.'
    form.maxWords = 'x'
    const result = buildVersionRequest('SHORT_ANSWER', form)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems).toEqual(expect.arrayContaining([
      'Cần ít nhất một đáp án được chấp nhận.',
      'Giới hạn số từ phải là số nguyên từ 1.',
    ]))
  })

  it('builds an ESSAY spec and requires chart facts for Task 1', () => {
    const task2 = initialFormState('ESSAY', 1)
    task2.stem = 'Discuss both views.'
    const ok = buildVersionRequest('ESSAY', task2)
    expect(ok.ok && JSON.parse(ok.body.answerSpecJson ?? '')).toEqual({ type: 'ESSAY', task: 'TASK_2', minWords: 250, passBand: 6 })

    const task1 = { ...initialFormState('ESSAY', 1), stem: 'Describe the chart.', essayTask: 'TASK_1' as const, minWords: '150' }
    const missing = buildVersionRequest('ESSAY', task1)
    expect(missing.ok).toBe(false)
    const withFacts = buildVersionRequest('ESSAY', { ...task1, chartFacts: 'Sales rose from 10 to 40.' })
    expect(withFacts.ok && JSON.parse(withFacts.body.answerSpecJson ?? '')).toMatchObject({ task: 'TASK_1', chartFacts: 'Sales rose from 10 to 40.' })
  })

  it('rejects an essay band outside 4.0 to 9.0 or off the half-band grid', () => {
    const base = { ...initialFormState('ESSAY', 1), stem: 'x' }
    expect(buildVersionRequest('ESSAY', { ...base, passBand: '3.5' }).ok).toBe(false)
    expect(buildVersionRequest('ESSAY', { ...base, passBand: '6.3' }).ok).toBe(false)
    expect(buildVersionRequest('ESSAY', { ...base, passBand: '9' }).ok).toBe(true)
  })

  it('sends no answer spec for types the contract has no grading shape for', () => {
    const form = { ...initialFormState('SPEAKING', 1), stem: 'Describe your hometown.' }
    const result = buildVersionRequest('SPEAKING', form)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.body.answerSpecJson).toBeNull()
  })

  it('limits the hint and passes the linked knowledge points through', () => {
    const form = { ...choiceForm(), hint: 'x'.repeat(501) }
    expect(buildVersionRequest('MULTIPLE_CHOICE', form).ok).toBe(false)

    const linked = { ...choiceForm(), knowledgePoints: [{ knowledgePointId: 'kp-1', weight: 1 }] }
    const result = buildVersionRequest('MULTIPLE_CHOICE', linked)
    expect(result.ok && result.body.knowledgePoints).toEqual([{ knowledgePointId: 'kp-1', weight: 1 }])
  })
})

describe('choice rows', () => {
  it('ignores rows that keep only their preset key and asks for a key when there is content', () => {
    const form = initialFormState('MULTIPLE_CHOICE', 1)
    form.stem = 'Stem'
    form.options = [{ key: 'A', content: 'One' }, { key: 'B', content: 'Two' }, { key: 'C', content: '' }, { key: 'D', content: '' }]
    form.correctKey = 'A'
    const ok = buildVersionRequest('MULTIPLE_CHOICE', form)
    expect(ok.ok && ok.body.options.map((option) => option.optionKey)).toEqual(['A', 'B'])

    form.options[2] = { key: '', content: 'Three' }
    const missingKey = buildVersionRequest('MULTIPLE_CHOICE', form)
    expect(missingKey.ok).toBe(false)
  })
})

describe('answerShapeOf and describeAnswerSpec', () => {
  it('maps the question types', () => {
    expect(answerShapeOf('MULTIPLE_CHOICE')).toBe('CHOICE')
    expect(answerShapeOf('SHORT_ANSWER')).toBe('FILL')
    expect(answerShapeOf('ESSAY')).toBe('ESSAY')
    expect(answerShapeOf('MATCHING')).toBe('NONE')
  })

  it('describes stored specs, including the legacy and invalid ones', () => {
    expect(describeAnswerSpec('{"type":"CHOICE","correct":"B"}')).toBe('Đáp án đúng: B.')
    expect(describeAnswerSpec('{"correct":"A"}')).toBe('Đáp án đúng: A.')
    expect(describeAnswerSpec('{"type":"FILL","accepted":["x","y"]}')).toBe('Điền từ, chấp nhận: x / y.')
    expect(describeAnswerSpec('{"type":"ESSAY","task":"TASK_2","minWords":250,"passBand":6}')).toContain('Bài luận TASK_2')
    expect(describeAnswerSpec(null)).toBe('Chưa có đáp án chấm tự động.')
    expect(describeAnswerSpec('not json')).toBe('Đáp án không phải JSON hợp lệ.')
  })
})
