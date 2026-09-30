import type { PassageAction, PassageSelection, PracticeMode, TextHighlight } from '@/types/practice'

export function getPracticeMode(value: string | null): PracticeMode {
  return value === 'exam' ? 'exam' : 'practice'
}

export function canUsePassageAction(mode: PracticeMode, action: PassageAction) {
  return mode === 'practice' && Boolean(action)
}

export function mergeHighlights(ranges: TextHighlight[]): TextHighlight[] {
  const sorted = ranges.filter(({ start, end }) => start >= 0 && end > start)
    .map((range) => ({ ...range }))
    .sort((a, b) => a.paragraph.localeCompare(b.paragraph) || a.start - b.start)
  const merged: TextHighlight[] = []
  for (const range of sorted) {
    const last = merged.at(-1)
    if (last && last.paragraph === range.paragraph && range.start <= last.end) {
      last.end = Math.max(last.end, range.end)
    } else merged.push(range)
  }
  return merged
}

// Offset ranges survive React renders and highlights spanning multiple text nodes.
export function readPassageSelection(root: HTMLElement | null): PassageSelection | null {
  const selection = window.getSelection()
  if (!root || !selection || selection.isCollapsed || !selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null
  const ranges: TextHighlight[] = []
  const parts: string[] = []
  root.querySelectorAll<HTMLElement>('[data-passage-text]').forEach((paragraph) => {
    if (!range.intersectsNode(paragraph)) return
    const clipped = document.createRange()
    clipped.selectNodeContents(paragraph)
    if (paragraph.contains(range.startContainer)) clipped.setStart(range.startContainer, range.startOffset)
    if (paragraph.contains(range.endContainer)) clipped.setEnd(range.endContainer, range.endOffset)
    const text = clipped.toString()
    if (!text.trim()) return
    const before = document.createRange()
    before.selectNodeContents(paragraph)
    before.setEnd(clipped.startContainer, clipped.startOffset)
    const start = before.toString().length
    ranges.push({ paragraph: paragraph.dataset.passageText!, start, end: start + text.length })
    parts.push(text)
  })
  return ranges.length ? { text: parts.join('\n').trim(), ranges } : null
}
