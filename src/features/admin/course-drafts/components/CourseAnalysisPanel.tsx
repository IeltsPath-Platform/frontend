import { Link } from 'react-router-dom'
import { courseIssueLabel } from '../lib/courseDraftLabels'
import type { CourseAnalysis, CourseAnalysisIssue } from '../types'

function Issues({ items }: { items: readonly CourseAnalysisIssue[] }) {
  return <ul>{items.map((issue, index) => <li key={index}><span>{courseIssueLabel(issue.code)}</span>{issue.subject ? <p className="adm-muted">Đối tượng: <code>{issue.subject}</code>{issue.related ? <> · Liên quan: <code>{issue.related}</code></> : null}</p> : null}</li>)}</ul>
}

export function CourseAnalysisPanel({ analysis, unmatchedTopics = [], warnings = [], questionDraftsEnabled = false }: {
  analysis: CourseAnalysis; unmatchedTopics?: string[]; warnings?: Array<{ code: string; subject: string | null }>; questionDraftsEnabled?: boolean
}) {
  return <section className="adm-block adm-course-draft-analysis" aria-label="Phân tích khóa học">
    <h2>Phân tích khóa học</h2>
    <p>Đã phủ {analysis.coverage.covered}/{analysis.coverage.expected} điểm kiến thức cần có.</p>
    <section aria-label="Lỗi chặn duyệt"><h3>Lỗi chặn duyệt ({analysis.errors.length})</h3>
      {analysis.errors.length ? <Issues items={analysis.errors} /> : <p>Không có lỗi chặn trong lần phân tích này.</p>}
    </section>
    <section aria-label="Cảnh báo"><h3>Cảnh báo ({analysis.warnings.length + warnings.length})</h3>
      <Issues items={[...analysis.warnings, ...warnings.map((issue) => ({ ...issue, related: null }))]} />
      {!analysis.warnings.length && !warnings.length ? <p className="adm-muted">Không có cảnh báo.</p> : null}
    </section>
    {unmatchedTopics.length ? <section aria-label="Chủ đề chưa khớp"><h3>Chủ đề chưa tìm thấy kiến thức</h3><ul>{unmatchedTopics.map((topic, index) => <li key={index}>{topic}</li>)}</ul></section> : null}
    <section aria-label="Thiếu nội dung trong kho"><h3>Thiếu nội dung trong kho ({analysis.gaps.length})</h3>
      <p className="adm-muted">Cảnh báo và thiếu kho không chặn duyệt. Kiểm tra để khóa học có đủ nội dung luyện tập.</p>
      {analysis.gaps.length ? <ul>{analysis.gaps.map((gap, index) => <li key={index}>
        <span>{courseIssueLabel(gap.reason)}</span><p className="adm-muted">Điểm kiến thức: <code>{gap.knowledgePointId}</code></p>
        {questionDraftsEnabled ? <Link className="adm-btn" to={`/content-author/ai-drafts?new=questions&knowledgePointId=${encodeURIComponent(gap.knowledgePointId)}`}>Sinh thêm câu cho KP này</Link> : <p className="adm-muted">Sinh thêm câu hỏi đang chờ triển khai.</p>}
      </li>)}</ul> : <p className="adm-muted">Không có thiếu hụt được ghi nhận.</p>}
    </section>
  </section>
}
