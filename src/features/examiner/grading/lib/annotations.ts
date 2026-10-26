import type { Annotation } from '../types'

export interface Range { start: number; end: number }

export const EXCERPT_MAX = 500
export const SUGGESTION_MAX = 1000

export const overlaps = (a: Range, b: Range) => a.start < b.end && b.start < a.end

export interface AnnotationInput {
  /** The quoted text. Leading and trailing blanks are ignored. */
  excerpt: string
  /** Where the examiner selected it, when they did; otherwise the first free occurrence is used. */
  start?: number | null
  errorCode: string
  suggestion: string
}

export type BuildResult = { ok: true; annotation: Annotation } | { ok: false; message: string }

function firstFree(essay: string, text: string, taken: readonly Range[]): number {
  for (let from = essay.indexOf(text); from >= 0; from = essay.indexOf(text, from + 1)) {
    if (!taken.some((range) => overlaps(range, { start: from, end: from + text.length }))) return from
  }
  return -1
}

/**
 * Checks an error the examiner wants to mark and gives it its place in the essay. The backend accepts it only when the
 * excerpt equals the essay between `start` and `end`, so that is guaranteed here before anything is sent.
 */
export function buildAnnotation(essay: string, existing: readonly Annotation[], input: AnnotationInput): BuildResult {
  const text = input.excerpt.trim()
  if (!text) return { ok: false, message: 'Hãy chọn hoặc nhập đoạn văn có lỗi.' }
  if (text.length > EXCERPT_MAX) return { ok: false, message: `Đoạn trích tối đa ${EXCERPT_MAX} ký tự.` }
  if (!input.errorCode) return { ok: false, message: 'Hãy chọn loại lỗi.' }
  const suggestion = input.suggestion.trim()
  if (!suggestion) return { ok: false, message: 'Hãy nhập gợi ý sửa.' }
  if (suggestion.length > SUGGESTION_MAX) return { ok: false, message: `Gợi ý sửa tối đa ${SUGGESTION_MAX} ký tự.` }

  const leading = input.excerpt.length - input.excerpt.trimStart().length
  const hinted = input.start == null ? -1 : input.start + leading
  let start = hinted >= 0 && essay.slice(hinted, hinted + text.length) === text ? hinted : -1
  if (start < 0) start = firstFree(essay, text, existing)
  if (start < 0) {
    return { ok: false, message: essay.includes(text) ? 'Đoạn này đã được ghi nhận một lỗi khác.' : 'Không tìm thấy đoạn này trong bài viết.' }
  }
  const range = { start, end: start + text.length }
  if (existing.some((annotation) => overlaps(annotation, range))) return { ok: false, message: 'Đoạn này đã được ghi nhận một lỗi khác.' }
  return { ok: true, annotation: { excerpt: text, start: range.start, end: range.end, errorCode: input.errorCode, suggestion } }
}

export interface Segment {
  text: string
  /** Offset of the segment in the essay. */
  start: number
  /** Index into the annotations when the segment is marked, otherwise null. */
  marked: number | null
}

/** Cuts the essay into plain and marked pieces in reading order. Annotations are expected not to overlap. */
export function segmentsOf(essay: string, annotations: readonly Annotation[]): Segment[] {
  const order = annotations.map((annotation, index) => ({ annotation, index })).sort((a, b) => a.annotation.start - b.annotation.start)
  const segments: Segment[] = []
  let cursor = 0
  for (const { annotation, index } of order) {
    if (annotation.start < cursor || annotation.end > essay.length) continue
    if (annotation.start > cursor) segments.push({ text: essay.slice(cursor, annotation.start), start: cursor, marked: null })
    segments.push({ text: essay.slice(annotation.start, annotation.end), start: annotation.start, marked: index })
    cursor = annotation.end
  }
  if (cursor < essay.length) segments.push({ text: essay.slice(cursor), start: cursor, marked: null })
  return segments
}

/** The distinct codes used, in the order first used. */
export function usedCodes(annotations: readonly Annotation[]): string[] {
  return [...new Set(annotations.map((annotation) => annotation.errorCode))]
}

/**
 * The position of a point of a selection in the essay. Every piece of the essay sits in one element that carries its
 * offset in `data-start`, so the position is that offset plus the offset inside the piece's text.
 */
export function essayOffset(node: Node, offset: number): number | null {
  const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)
  const piece = element?.closest<HTMLElement>('[data-start]')
  if (!piece) return null
  const base = Number(piece.dataset.start)
  if (Number.isNaN(base)) return null
  if (node.nodeType === Node.TEXT_NODE) return base + offset
  return base + (offset > 0 ? (piece.textContent ?? '').length : 0)
}

/** The selected stretch of the essay, or null when nothing inside it is selected. */
export function selectionRange(container: HTMLElement, selection: Selection | null): Range | null {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) return null
  const first = essayOffset(range.startContainer, range.startOffset)
  const last = essayOffset(range.endContainer, range.endOffset)
  if (first === null || last === null || last <= first) return null
  return { start: first, end: last }
}
