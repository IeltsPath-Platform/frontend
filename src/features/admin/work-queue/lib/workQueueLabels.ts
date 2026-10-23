import { QUESTION_DRAFTS_ENABLED } from '../../ai-drafts/draftFlags'
import type { WorkItem, WorkKind } from '../types'

export const KIND_LABEL: Record<WorkKind, string> = {
  CONTENT_GAP: 'KP thiếu bài luyện',
  QUESTION_TOO_EASY: 'Câu quá dễ',
  QUESTION_TOO_HARD: 'Câu quá khó',
  EDGE_SUSPECT: 'Quan hệ tiên quyết đáng ngờ',
}

export const KIND_HELP: Record<WorkKind, string> = {
  CONTENT_GAP: 'Học viên làm hết bộ luyện của KP này mà chưa đạt; bài ôn bị bỏ qua.',
  QUESTION_TOO_EASY: 'Tỉ lệ đúng cao hơn mức của nhãn độ khó.',
  QUESTION_TOO_HARD: 'Tỉ lệ đúng thấp hơn mức của nhãn độ khó.',
  EDGE_SUSPECT: 'Dò ngược ít khi tìm ra lỗi ở KP tiên quyết này.',
}

export const STATUS_LABEL = { OPEN: 'Mới', IN_PROGRESS: 'Đang làm', DONE: 'Đã xong' } as const

export const NO_SUBJECT = 'Không tải được tên'

export function kindLabel(kind: string) {
  return KIND_LABEL[kind as WorkKind] ?? kind
}

const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) : '—')
const pct = (ratio: number) => `${Math.round(ratio * 100)}%`

function parseDetail(detail: string | null | undefined): Record<string, unknown> {
  if (!detail) return {}
  try {
    const value: unknown = JSON.parse(detail)
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const pointName = (end: { code?: string | null; name?: string | null; id: string }) => end.name || end.code || shortId(end.id)

/** The thing the item is about: a knowledge point, the start of a question, or the two ends of an edge. */
export function subjectText(item: WorkItem): string {
  const subject = item.subject
  if (!subject) return `${NO_SUBJECT} (${shortId(item.subjectRef)})`
  switch (subject.type) {
    case 'KNOWLEDGE_POINT':
      return subject.name || subject.code || `${NO_SUBJECT} (${shortId(subject.id)})`
    case 'QUESTION':
      return subject.stemPreview || `${NO_SUBJECT} (${shortId(subject.questionId)})`
    case 'EDGE':
      return `${pointName(subject.from)} → ${pointName(subject.to)}`
  }
}

/** The numbers behind the item as a sentence, for example "Đúng 97% trên 120 lượt". */
export function detailText(item: WorkItem): string {
  const detail = parseDetail(item.detail)
  const number = (key: string) => (typeof detail[key] === 'number' ? (detail[key] as number) : null)
  switch (item.kind) {
    case 'CONTENT_GAP': {
      const occurrences = item.subject?.type === 'KNOWLEDGE_POINT' ? item.subject.occurrences : null
      return occurrences ? `Hết bài ôn ${occurrences} lần` : 'Hết bài ôn chưa xem'
    }
    case 'QUESTION_TOO_EASY':
    case 'QUESTION_TOO_HARD': {
      const rate = number('correctRate')
      const attempts = number('attempts')
      const tag = typeof detail.difficulty === 'string' ? ` · nhãn ${detail.difficulty}` : ''
      return rate === null || attempts === null ? 'Chưa có số liệu' : `Đúng ${pct(rate)} trên ${attempts} lượt${tag}`
    }
    case 'EDGE_SUSPECT': {
      const probes = number('probes')
      const pass = number('passRate')
      const root = number('rootRate')
      if (probes === null || pass === null || root === null) return 'Chưa có số liệu'
      return `${probes} lượt dò, KP nền đạt ${pct(pass)}, là gốc lỗi ${pct(root)}`
    }
    default:
      return ''
  }
}

export interface WorkLink { label: string; to: string }

/** Where the author goes to deal with the item. Question generation is offered only once it is enabled. */
export function workLinks(item: WorkItem): WorkLink[] {
  const subject = item.subject
  switch (item.kind) {
    case 'CONTENT_GAP': {
      const links: WorkLink[] = [{ label: 'Tạo gói luyện', to: '/content-author/packages?create=PRACTICE_SET' }]
      const point = subject?.type === 'KNOWLEDGE_POINT' ? subject.id : item.subjectRef
      if (QUESTION_DRAFTS_ENABLED && point) {
        links.push({ label: 'Sinh câu cho KP này', to: `/content-author/ai-drafts?new=questions&knowledgePointId=${point}` })
      }
      return links
    }
    case 'QUESTION_TOO_EASY':
    case 'QUESTION_TOO_HARD': {
      const question = subject?.type === 'QUESTION' ? subject.questionId : null
      return question ? [{ label: 'Mở câu hỏi', to: `/content-author/questions/${question}` }] : []
    }
    case 'EDGE_SUSPECT': {
      const from = subject?.type === 'EDGE' ? subject.from.id : null
      return from ? [{ label: 'Xem trên cây tri thức', to: `/content-author/knowledge-graph?kp=${from}` }] : []
    }
    default:
      return []
  }
}
