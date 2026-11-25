import { useAdminResource } from '../../lib/useAdminResource'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { listQuestionUsages } from '../api/questionApi'

const STATUS: Record<string, string> = { DRAFT: 'Nháp', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Lưu trữ' }

/** Where one version of a question is held: the packages and lessons an edit of it would reach. */
export function QuestionUsages({ questionId, versionId, refreshKey }: { questionId: string; versionId: string; refreshKey: number }) {
  const resource = useAdminResource(`question-usages|${questionId}|${refreshKey}`, (signal) => listQuestionUsages(questionId, signal))
  if (resource.status === 'loading') return <AdminLoading label="Đang tải nơi sử dụng…" />
  if (resource.status === 'error') return <AdminError message={resource.error ?? 'Không tải được nơi sử dụng.'} onRetry={resource.reload} />
  const usages = (resource.data ?? []).filter((usage) => usage.questionVersionId === versionId)
  return (
    <section aria-label="Đang dùng trong" className="qb-usages">
      <h4 className="qb-usages__title">Đang dùng trong</h4>
      {usages.length === 0 ? <p className="adm-muted">Phiên bản này chưa được dùng ở đâu.</p> : (
        <ul className="qb-usages__list">
          {usages.map((usage, index) => (
            <li key={`${usage.kind}|${usage.targetId}|${usage.targetVersionNumber ?? ''}|${index}`}>
              <span className="adm-badge adm-badge--muted">{usage.kind === 'PACKAGE' ? 'Gói đề' : 'Bài học'}</span>
              {usage.kind === 'PACKAGE'
                ? <a href={`/content-author/packages?package=${usage.targetId}`} rel="noreferrer" target="_blank">{usage.targetCode} · {usage.targetTitle}</a>
                : <span>{usage.targetCode} · {usage.targetTitle}</span>}
              <span className="adm-muted">
                {usage.targetVersionNumber != null ? `Bản ${usage.targetVersionNumber}` : null}
                {usage.targetStatus ? ` (${STATUS[usage.targetStatus] ?? usage.targetStatus})` : null} · {usage.location}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
