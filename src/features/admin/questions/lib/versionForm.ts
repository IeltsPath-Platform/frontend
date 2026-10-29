import type { Difficulty, QuestionType, QuestionVersion, VersionRequest } from '../types'

export interface VersionFormState {
  versionNumber: number
  stem: string
  /** CHOICE question types: the options and the key of the correct one. */
  options: Array<{ key: string; content: string }>
  correctKey: string
  /** Fill-in types: accepted answers, one per line. */
  accepted: string
  maxWords: string
  /** Essay type. */
  essayTask: 'TASK_1' | 'TASK_2'
  minWords: string
  passBand: string
  chartFacts: string
  difficulty: Difficulty | ''
  explanation: string
  hint: string
  knowledgePoints: Array<{ knowledgePointId: string; weight: number }>
}

export type AnswerShape = 'CHOICE' | 'FILL' | 'ESSAY' | 'NONE'

export const MAX_HINT_CHARS = 500
export const MAX_CHART_FACTS_CHARS = 2000
export const PASS_BANDS = Array.from({ length: 11 }, (_, index) => 4 + index * 0.5)

/**
 * The answer-spec shape an author can build for a question type (`backend/docs/contracts/answer-spec-v1.md`). Types that
 * the contract gives no grading shape for (matching, speaking) carry no answer spec.
 */
export function answerShapeOf(type: string): AnswerShape {
  if (type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE_NOT_GIVEN') return 'CHOICE'
  if (type === 'FILL_IN_BLANK' || type === 'SHORT_ANSWER') return 'FILL'
  if (type === 'ESSAY') return 'ESSAY'
  return 'NONE'
}

const TRUE_FALSE_OPTIONS = [
  { key: 'TRUE', content: 'True' },
  { key: 'FALSE', content: 'False' },
  { key: 'NOT_GIVEN', content: 'Not Given' },
]

export function initialFormState(type: QuestionType | string, nextVersionNumber: number): VersionFormState {
  const options = type === 'TRUE_FALSE_NOT_GIVEN'
    ? TRUE_FALSE_OPTIONS.map((option) => ({ ...option }))
    : type === 'MULTIPLE_CHOICE'
      ? ['A', 'B', 'C', 'D'].map((key) => ({ key, content: '' }))
      : []
  return {
    versionNumber: nextVersionNumber,
    stem: '',
    options,
    correctKey: '',
    accepted: '',
    maxWords: '',
    essayTask: 'TASK_2',
    minWords: '250',
    passBand: '6',
    chartFacts: '',
    difficulty: '',
    explanation: '',
    hint: '',
    knowledgePoints: [],
  }
}

/** A new draft that starts from an existing version: the same content under the next version number. */
export function formStateFromVersion(type: QuestionType | string, version: QuestionVersion, nextVersionNumber: number): VersionFormState {
  const base = initialFormState(type, nextVersionNumber)
  let spec: Record<string, unknown> = {}
  try {
    spec = JSON.parse(version.answerSpecJson ?? '{}') as Record<string, unknown>
  } catch {
    // An unreadable answer spec leaves the answer fields empty for the author to fill in again.
  }
  const stored = [...(version.options ?? [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((option) => ({ key: option.optionKey, content: option.content }))
  return {
    ...base,
    stem: version.stem ?? '',
    options: type === 'TRUE_FALSE_NOT_GIVEN' || stored.length === 0 ? base.options : stored,
    correctKey: typeof spec.correct === 'string' ? spec.correct : '',
    accepted: Array.isArray(spec.accepted) ? spec.accepted.join('\n') : '',
    maxWords: typeof spec.maxWords === 'number' ? String(spec.maxWords) : '',
    essayTask: spec.task === 'TASK_1' ? 'TASK_1' : 'TASK_2',
    minWords: typeof spec.minWords === 'number' ? String(spec.minWords) : base.minWords,
    passBand: typeof spec.passBand === 'number' ? String(spec.passBand) : base.passBand,
    chartFacts: typeof spec.chartFacts === 'string' ? spec.chartFacts : '',
    difficulty: version.difficulty ?? '',
    explanation: version.explanation ?? '',
    hint: version.hint ?? '',
    knowledgePoints: (version.knowledgePoints ?? []).map((link) => ({ knowledgePointId: link.knowledgePointId, weight: link.weight ?? 1 })),
  }
}

export type BuildResult ={ ok: true; body: VersionRequest } | { ok: false; problems: string[] }

function parseNumber(text: string): number | null {
  if (text.trim() === '') return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

/** Checks the form for the question type and builds the request. Problems are reported all at once, in Vietnamese. */
export function buildVersionRequest(type: QuestionType | string, form: VersionFormState): BuildResult {
  const problems: string[] = []
  const shape = answerShapeOf(type)
  if (!form.stem.trim()) problems.push('Cần nhập nội dung câu hỏi.')
  if (!Number.isInteger(form.versionNumber) || form.versionNumber < 1) problems.push('Số phiên bản phải là số nguyên từ 1.')
  if (form.hint.length > MAX_HINT_CHARS) problems.push(`Gợi ý tối đa ${MAX_HINT_CHARS} ký tự.`)

  let options: VersionRequest['options'] = []
  let answerSpec: Record<string, unknown> | null = null

  if (shape === 'CHOICE') {
    // The rows come with keys A to D already filled in, so a row without content is simply unused.
    const filled = form.options.filter((option) => option.content.trim() !== '')
    if (filled.some((option) => option.key.trim() === '')) problems.push('Mỗi lựa chọn có nội dung cần có mã lựa chọn.')
    const keys = filled.map((option) => option.key.trim())
    if (new Set(keys).size !== keys.length) problems.push('Mã các lựa chọn không được trùng nhau.')
    if (filled.length < 2) problems.push('Cần ít nhất 2 lựa chọn.')
    if (!keys.includes(form.correctKey.trim())) problems.push('Cần chọn đáp án đúng trong các lựa chọn.')
    options = filled.map((option, index) => ({ optionKey: option.key.trim(), content: option.content.trim(), sortOrder: index + 1 }))
    answerSpec = { type: 'CHOICE', correct: form.correctKey.trim() }
  } else if (shape === 'FILL') {
    const accepted = form.accepted.split('\n').map((line) => line.trim()).filter(Boolean)
    if (accepted.length === 0) problems.push('Cần ít nhất một đáp án được chấp nhận.')
    answerSpec = { type: 'FILL', accepted }
    const maxWords = parseNumber(form.maxWords)
    if (form.maxWords.trim() !== '') {
      if (maxWords === null || !Number.isInteger(maxWords) || maxWords < 1) problems.push('Giới hạn số từ phải là số nguyên từ 1.')
      else answerSpec.maxWords = maxWords
    }
  } else if (shape === 'ESSAY') {
    const minWords = parseNumber(form.minWords)
    const passBand = parseNumber(form.passBand)
    if (minWords === null || !Number.isInteger(minWords) || minWords < 1) problems.push('Số từ tối thiểu phải là số nguyên từ 1.')
    if (passBand === null || passBand < 4 || passBand > 9 || (passBand * 2) % 1 !== 0) {
      problems.push('Band đạt phải từ 4.0 đến 9.0, mỗi bước 0.5.')
    }
    answerSpec = { type: 'ESSAY', task: form.essayTask, minWords, passBand }
    if (form.essayTask === 'TASK_1') {
      const facts = form.chartFacts.trim()
      if (facts.length < 1 || facts.length > MAX_CHART_FACTS_CHARS) {
        problems.push(`Task 1 cần mô tả số liệu biểu đồ dài 1 đến ${MAX_CHART_FACTS_CHARS} ký tự.`)
      } else {
        answerSpec.chartFacts = facts
      }
    }
  }

  if (problems.length > 0) return { ok: false, problems }

  return {
    ok: true,
    body: {
      versionNumber: form.versionNumber,
      stem: form.stem.trim(),
      options,
      answerSpecJson: answerSpec ? JSON.stringify(answerSpec) : null,
      explanation: form.explanation.trim() || null,
      hint: form.hint.trim() || null,
      difficulty: form.difficulty || null,
      knowledgePoints: form.knowledgePoints,
    },
  }
}

/** One line describing a stored answer spec, for the author's version card. */
export function describeAnswerSpec(json: string | null | undefined): string {
  if (!json) return 'Chưa có đáp án chấm tự động.'
  try {
    const spec = JSON.parse(json) as Record<string, unknown>
    if (spec.type === 'ESSAY') return `Bài luận ${String(spec.task)}, tối thiểu ${String(spec.minWords)} từ, đạt từ band ${String(spec.passBand)}.`
    if (spec.type === 'FILL') return `Điền từ, chấp nhận: ${Array.isArray(spec.accepted) ? spec.accepted.join(' / ') : '—'}.`
    if (typeof spec.correct === 'string') return `Đáp án đúng: ${spec.correct}.`
    return 'Đáp án có định dạng chưa được hỗ trợ.'
  } catch {
    return 'Đáp án không phải JSON hợp lệ.'
  }
}
