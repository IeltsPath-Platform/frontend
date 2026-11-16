import type { WritingCorrection, WritingRevision } from './writingApi'
import { correctedEssay } from './writingResultModel'

/** How an essay sent again compares with the version before: kinds of error fixed, still repeated, and new. */
export function RevisionSummary({ revision, names }: { revision: WritingRevision; names: Map<string, string> }) {
  const label = (code: string) => names.get(code) ?? code
  const { fixedCodes, repeatedCodes, newCodes } = revision
  if (fixedCodes.length + repeatedCodes.length + newCodes.length === 0) return null
  return (
    <section className="wr-revision" aria-label="So với bài trước">
      <h2>So với bài trước</h2>
      <ul>
        {fixedCodes.length > 0 && <li className="is-ok">Đã sửa {fixedCodes.length} dạng lỗi.</li>}
        {repeatedCodes.length > 0 && <li className="is-miss">Còn lặp lại: {repeatedCodes.map(label).join(', ')}.</li>}
        {newCodes.length > 0 && <li>Lỗi mới: {newCodes.map(label).join(', ')}.</li>}
      </ul>
    </section>
  )
}

/** The essay with the grader's suggestions in place; what changed is underlined. It sits beside the original, never instead of it. */
export function CorrectedEssay({ essay, corrections }: { essay: string; corrections: WritingCorrection[] }) {
  const segments = correctedEssay(essay, corrections)
  if (!segments.some((segment) => segment.changed)) return null
  return (
    <details className="wr-corrected">
      <summary>Đọc bản đã sửa</summary>
      <p>
        {segments.map((segment, index) => segment.changed
          ? <ins key={index}>{segment.text}</ins>
          : <span key={index}>{segment.text}</span>)}
      </p>
    </details>
  )
}
