import type { WritingCorrection, WritingErrorGroup, WritingRevision } from './writingApi'
import { PracticeErrorButton } from './PracticeErrorButton'
import { certaintyOf, correctedEssay } from './writingResultModel'

export interface CategoryLook { label: string; tone: string }

/** The corrections as cards: what was written, the fix, why it is wrong, the rule, and a similar example from the error kind. */
export function CorrectionList({ corrections, groups, categoryOf }: {
  corrections: WritingCorrection[]
  groups: WritingErrorGroup[]
  categoryOf: (category: WritingCorrection['category']) => CategoryLook
}) {
  if (corrections.length === 0) return null
  const groupOf = new Map(groups.map((group) => [group.errorCode, group]))
  return (
    <section className="wr-fixes" aria-label="Các lỗi cần sửa">
      <h3>Các lỗi cần sửa</h3>
      <ul>
        {corrections.map((item, index) => {
          const look = categoryOf(item.category)
          const group = item.errorCode ? groupOf.get(item.errorCode) : undefined
          const suggestion = certaintyOf(item) === 'SUGGESTION'
          const rule = item.fixHint ?? group?.fixHint
          const knowledgePoint = item.practiceKnowledgePointId ?? group?.practiceKnowledgePointId
          return (
            <li key={`${item.excerpt}-${index}`} className={suggestion ? 'wr-fix is-suggestion' : 'wr-fix'}>
              <span className={`wr-mark wr-mark-${look.tone}`}>{look.label}</span>
              {suggestion && <span className="wr-tag">Gợi ý</span>}
              {item.errorName && <b className="wr-fix-name">{item.errorName}</b>}
              <p className="wr-fix-change"><b>{item.excerpt}</b> → {item.suggestion}</p>
              {item.reason && <p><b>Tại sao sai?</b> {item.reason}</p>}
              {rule && <p><b>Quy tắc:</b> {rule}</p>}
              {group?.example && <p className="wr-muted">Ví dụ tương tự: “{group.example.wrong}” → “{group.example.right}”</p>}
              <PracticeErrorButton knowledgePointId={knowledgePoint} name={item.errorName ?? look.label} code={item.errorCode} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

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
