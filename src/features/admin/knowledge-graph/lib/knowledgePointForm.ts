import { CEFR_LEVELS, type KnowledgePoint, type KnowledgePointRequest } from '../types'

export const KIND_OPTIONS = [
  { value: 'GRAMMAR', label: 'Grammar' },
  { value: 'VOCABULARY', label: 'Vocabulary' },
  { value: 'STRATEGY', label: 'Strategy' },
  { value: 'PRONUNCIATION', label: 'Pronunciation' },
] as const

export const LEARNING_TYPE_OPTIONS = [
  { value: 'MEMORY', label: 'Memory' },
  { value: 'CONCEPT', label: 'Concept' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'DESIGN', label: 'Design' },
] as const

export const SKILL_OPTIONS = [
  { value: 'LISTENING', label: 'Listening' },
  { value: 'READING', label: 'Reading' },
  { value: 'WRITING', label: 'Writing' },
  { value: 'SPEAKING', label: 'Speaking' },
  { value: 'ALL', label: 'Grammar / Vocabulary' },
] as const

export const CEFR_OPTIONS = CEFR_LEVELS.map((level) => ({ value: level, label: level }))

/** What the form holds while it is open: every field as the text or choice the author sees. */
export interface KnowledgePointForm {
  topicId: string
  code: string
  name: string
  kind: string
  learningType: string
  skill: string
  cefrLevel: string
  canDo: string
  scopeIn: string
  scopeOut: string
  description: string
}

export const EMPTY_FORM: KnowledgePointForm = {
  topicId: '', code: '', name: '', kind: '', learningType: '', skill: '', cefrLevel: '', canDo: '', scopeIn: '', scopeOut: '', description: '',
}

export function formOf(point: KnowledgePoint): KnowledgePointForm {
  return {
    topicId: point.topicId,
    code: point.code,
    name: point.name,
    kind: point.kind,
    learningType: point.learningType ?? '',
    skill: point.skill ?? '',
    cefrLevel: point.cefrLevel ?? '',
    canDo: point.canDo ?? '',
    scopeIn: point.scopeIn ?? '',
    scopeOut: point.scopeOut ?? '',
    description: point.description ?? '',
  }
}

/** The code format of the API: a prefix letter, the band it starts at, then the name in capitals. */
const CODE_PATTERN = /^[RLWGVS](55|60|65|70)_[A-Z0-9_]{2,60}$/

/** What is wrong with the form, in words for the author; null when it can be saved. */
export function formProblem(form: KnowledgePointForm): string | null {
  const missing = [
    !form.code.trim() && 'mã',
    !form.name.trim() && 'tên',
    !form.topicId && 'chủ đề',
    !form.kind && 'loại',
    !form.learningType && 'kiểu học',
    !form.canDo.trim() && 'can-do',
  ].filter(Boolean)
  if (missing.length) return `Cần nhập ${missing.join(', ')}.`
  if (!CODE_PATTERN.test(form.code.trim())) return 'Mã phải có dạng R55_EXAMPLE: một chữ R, L, W, G, V hoặc S, rồi 55, 60, 65 hoặc 70, rồi tên viết hoa.'
  return null
}

export function requestOf(form: KnowledgePointForm): KnowledgePointRequest {
  return {
    topicId: form.topicId,
    code: form.code.trim(),
    name: form.name.trim(),
    kind: form.kind,
    learningType: form.learningType,
    skill: form.skill || null,
    description: form.description.trim(),
    cefrLevel: form.cefrLevel || null,
    canDo: form.canDo.trim(),
    scopeIn: form.scopeIn.trim(),
    scopeOut: form.scopeOut.trim(),
  }
}
