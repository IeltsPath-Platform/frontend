import { describe, expect, it } from 'vitest'
import type { Annotation } from '../types'
import { buildAnnotation, essayOffset, overlaps, segmentsOf, selectionRange, usedCodes } from './annotations'

const essay = 'The figure have rose. Engineering was popular. The figure have rose.'
const mark = (start: number, end: number, errorCode = 'VERB_FORM'): Annotation => ({ excerpt: essay.slice(start, end), start, end, errorCode, suggestion: 'fix' })
const build = (input: Partial<Parameters<typeof buildAnnotation>[2]>, existing: Annotation[] = []) =>
  buildAnnotation(essay, existing, { excerpt: 'have rose', errorCode: 'VERB_FORM', suggestion: 'have risen', ...input })

describe('buildAnnotation', () => {
  it('uses the place the examiner selected, even when the same words occur earlier', () => {
    const second = essay.lastIndexOf('have rose')
    const result = build({ start: second })

    expect(result).toEqual({ ok: true, annotation: { excerpt: 'have rose', start: second, end: second + 9, errorCode: 'VERB_FORM', suggestion: 'have risen' } })
  })

  it('takes the first place that is still free when the examiner typed the words', () => {
    const first = essay.indexOf('have rose')
    const open = build({})
    expect(open.ok && open.annotation.start).toBe(first)

    const next = build({}, [mark(first, first + 9)])
    expect(next.ok && next.annotation.start).toBe(essay.lastIndexOf('have rose'))
  })

  it('ignores blanks around the quote and keeps the selection aligned', () => {
    const start = essay.indexOf('have rose')
    const result = build({ excerpt: '  have rose ', start: start - 2 })

    expect(result.ok && [result.annotation.excerpt, result.annotation.start, result.annotation.end]).toEqual(['have rose', start, start + 9])
  })

  it('refuses a quote that is not in the essay, one that is already marked, and incomplete input', () => {
    const first = essay.indexOf('have rose')
    const last = essay.lastIndexOf('have rose')
    const taken = 'Đoạn này đã được ghi nhận một lỗi khác.'
    expect(build({ excerpt: 'nowhere' })).toEqual({ ok: false, message: 'Không tìm thấy đoạn này trong bài viết.' })
    expect(build({ start: first }, [mark(first, first + 9)])).toEqual({ ok: false, message: taken })
    expect(build({}, [mark(first, first + 9), mark(last, last + 9)])).toEqual({ ok: false, message: taken })
    expect(build({ excerpt: '   ' })).toMatchObject({ ok: false })
    expect(build({ errorCode: '' })).toEqual({ ok: false, message: 'Hãy chọn loại lỗi.' })
    expect(build({ suggestion: ' ' })).toEqual({ ok: false, message: 'Hãy nhập gợi ý sửa.' })
  })

  it('refuses a quote that overlaps one already marked', () => {
    const start = essay.indexOf('figure have')
    expect(build({ excerpt: 'figure have', start }, [mark(essay.indexOf('have'), essay.indexOf('have') + 9)])).toMatchObject({ ok: false })
  })

  it('keeps to the lengths the backend accepts', () => {
    const long = 'x'.repeat(501)
    expect(buildAnnotation(long, [], { excerpt: long, errorCode: 'A', suggestion: 'b' })).toMatchObject({ ok: false })
    expect(build({ suggestion: 'y'.repeat(1001) })).toMatchObject({ ok: false })
  })
})

describe('segmentsOf', () => {
  it('cuts the essay into plain and marked pieces that join back into the essay', () => {
    const segments = segmentsOf(essay, [mark(22, 45, 'B'), mark(4, 10)])

    expect(segments.map((segment) => segment.marked)).toEqual([null, 1, null, 0, null])
    expect(segments.map((segment) => segment.text).join('')).toBe(essay)
    expect(segments.every((segment) => essay.slice(segment.start, segment.start + segment.text.length) === segment.text)).toBe(true)
  })

  it('shows an unmarked essay as one piece and skips a mark that no longer fits', () => {
    expect(segmentsOf(essay, [])).toEqual([{ text: essay, start: 0, marked: null }])
    expect(segmentsOf('short', [{ ...mark(0, 5), end: 99 }]).map((segment) => segment.marked)).toEqual([null])
  })
})

describe('overlaps and usedCodes', () => {
  it('treats touching ranges as separate and lists each code once in the order first used', () => {
    expect(overlaps({ start: 0, end: 5 }, { start: 5, end: 9 })).toBe(false)
    expect(overlaps({ start: 0, end: 6 }, { start: 5, end: 9 })).toBe(true)
    expect(usedCodes([mark(0, 3, 'B'), mark(4, 8, 'A'), mark(9, 12, 'B')])).toEqual(['B', 'A'])
  })
})

describe('selection', () => {
  function essayDom() {
    const container = document.createElement('div')
    container.innerHTML = '<span data-start="0">Hello big </span><mark data-start="10">world</mark><sup>1</sup><span data-start="15">, bye</span>'
    document.body.append(container)
    return container
  }
  const selecting = (container: HTMLElement, from: [Node, number], to: [Node, number]) => ({
    isCollapsed: false,
    rangeCount: 1,
    getRangeAt: () => ({ commonAncestorContainer: container, startContainer: from[0], startOffset: from[1], endContainer: to[0], endOffset: to[1] }),
  }) as unknown as Selection

  it('finds the position in the essay from the piece the selection starts and ends in', () => {
    const container = essayDom()
    const hello = container.children[0].firstChild!
    const world = container.children[1].firstChild!

    expect(essayOffset(hello, 6)).toBe(6)
    expect(essayOffset(world, 3)).toBe(13)
    expect(selectionRange(container, selecting(container, [hello, 6], [world, 5]))).toEqual({ start: 6, end: 15 })
    container.remove()
  })

  it('reports nothing for an empty selection, one outside the essay, or one that ends in the number mark', () => {
    const container = essayDom()
    const hello = container.children[0].firstChild!
    const outside = document.createElement('p')
    document.body.append(outside)

    expect(selectionRange(container, null)).toBeNull()
    expect(selectionRange(container, { ...selecting(container, [hello, 1], [hello, 3]), isCollapsed: true } as Selection)).toBeNull()
    expect(selectionRange(container, selecting(outside, [hello, 1], [hello, 3]))).toBeNull()
    expect(selectionRange(container, selecting(container, [hello, 1], [container.children[2].firstChild!, 1]))).toBeNull()
    container.remove()
    outside.remove()
  })
})
