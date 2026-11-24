import { importIssueLabel } from '../lib/importLabels'
import type { ImportIssue } from '../types'

/** The problems of a check as a table: where each one is in the workbook and what it is. */
export function ImportIssues({ title, issues }: { title: string; issues: ImportIssue[] }) {
  return (
    <section>
      <h2>{title} ({issues.length})</h2>
      {issues.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th className="adm-stt" scope="col">STT</th><th>Trang tính</th><th>Dòng Excel</th><th>Cột</th><th>Mã</th><th>Thông báo</th></tr></thead>
            <tbody>
              {issues.map((issue, index) => (
                <tr key={index}>
                  <td className="adm-stt">{index + 1}</td><td>{issue.sheet || 'Cả file'}</td><td>{issue.row === 0 ? 'Cả file' : issue.row}</td>
                  <td>{issue.column || '—'}</td><td>{issue.code}</td><td>{importIssueLabel(issue.code)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="adm-muted">Không có {title.toLocaleLowerCase('vi-VN')}.</p>}
    </section>
  )
}
