import { Link } from 'react-router-dom'
import { courseIssueLabel } from '../lib/courseDraftLabels'
import type { CourseAnalysis, CourseAnalysisIssue } from '../types'

/** What the panel knows of a knowledge point, to show its name where the analysis only carries an id. */
export type KnowledgeNames = ReadonlyMap<string, { code: string; name: string }>

/** A knowledge point by name and code; anything the names do not know (a band, a code, an unknown id) is shown as it came. */
function Subject({ value, names }: { value: string; names: KnowledgeNames }) {
  const known = names.get(value)
  return known ? <><strong>{known.name}</strong> <code>{known.code}</code></> : <code>{value}</code>
}

function Issues({ items, names }: { items: readonly CourseAnalysisIssue[]; names: KnowledgeNames }) {
  return <ul>{items.map((issue, index) => <li key={index}><span>{courseIssueLabel(issue.code)}</span>{issue.subject ? <p className="adm-muted">Đối tượng: <Subject names={names} value={issue.subject} />{issue.related ? <> · Liên quan: <Subject names={names} value={issue.related} /></> : null}</p> : null}</li>)}</ul>
}

/** Every reason the library lacks something for a knowledge point, one entry per point in the order they first appear. */
function groupGaps(gaps: CourseAnalysis['gaps']): Array<{ knowledgePointId: string; reasons: string[] }> {
  const byPoint = new Map<string, string[]>()
  for (const gap of gaps) {
    const reasons = byPoint.get(gap.knowledgePointId) ?? []
    if (!reasons.includes(gap.reason)) reasons.push(gap.reason)
    byPoint.set(gap.knowledgePointId, reasons)
  }
  return [...byPoint].map(([knowledgePointId, reasons]) => ({ knowledgePointId, reasons }))
}

export function CourseAnalysisPanel({ analysis, unmatchedTopics = [], warnings = [], questionDraftsEnabled = false, names = new Map() }: {
  analysis: CourseAnalysis; unmatchedTopics?: string[]; warnings?: Array<{ code: string; subject: string | null }>; questionDraftsEnabled?: boolean; names?: KnowledgeNames
}) {
  const gaps = groupGaps(analysis.gaps)
  return <section className="adm-block adm-course-draft-analysis" aria-label="Phân tích khóa học">
    <h2>Phân tích khóa học</h2>
    <p>Đã phủ {analysis.coverage.covered}/{analysis.coverage.expected} điểm kiến thức cần có.</p>
    <section aria-label="Lỗi chặn duyệt"><h3>Lỗi chặn duyệt ({analysis.errors.length})</h3>
      {analysis.errors.length ? <Issues items={analysis.errors} names={names} /> : <p>Không có lỗi chặn trong lần phân tích này.</p>}
    </section>
    <section aria-label="Cảnh báo"><h3>Cảnh báo ({analysis.warnings.length + warnings.length})</h3>
      <Issues items={[...analysis.warnings, ...warnings.map((issue) => ({ ...issue, related: null }))]} names={names} />
      {!analysis.warnings.length && !warnings.length ? <p className="adm-muted">Không có cảnh báo.</p> : null}
    </section>
    {unmatchedTopics.length ? <section aria-label="Chủ đề chưa khớp"><h3>Chủ đề chưa tìm thấy kiến thức</h3><ul>{unmatchedTopics.map((topic, index) => <li key={index}>{topic}</li>)}</ul></section> : null}
    <section aria-label="Thiếu nội dung trong kho"><h3>Thiếu nội dung trong kho ({gaps.length} điểm kiến thức)</h3>
      <p className="adm-muted">Không chặn duyệt. Bổ sung để khóa học có đủ nội dung luyện tập.</p>
      {gaps.length ? <ul className="adm-analysis-gaps">{gaps.map((gap) => <li key={gap.knowledgePointId}>
        <p><Subject names={names} value={gap.knowledgePointId} /></p>
        <p className="adm-muted">{gap.reasons.map((reason) => courseIssueLabel(reason)).join(' · ')}</p>
        {questionDraftsEnabled ? <Link className="adm-btn" to={`/content-author/ai-drafts?new=questions&knowledgePointId=${encodeURIComponent(gap.knowledgePointId)}`}>Sinh thêm câu cho KP này</Link> : null}
      </li>)}</ul> : <p className="adm-muted">Không có thiếu hụt được ghi nhận.</p>}
      {gaps.length && !questionDraftsEnabled ? <p className="adm-muted">Sinh thêm câu hỏi đang chờ triển khai.</p> : null}
    </section>
  </section>
}
