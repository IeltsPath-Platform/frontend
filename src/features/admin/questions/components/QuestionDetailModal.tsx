import { AdminDetails, AdminModal } from '../../components/AdminLayer'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { getQuestion } from '../api/questionApi'
import { PURPOSE_LABEL, SKILL_LABEL, STATUS_LABEL, TYPE_LABEL, statusBadgeClass } from '../lib/labels'
import type { Question } from '../types'
import { VersionCard } from './VersionCard'

/** Reads one question: its header from the list row, its versions from the server. */
export function QuestionDetailModal({ question, onClose }: { question: Question; onClose: () => void }) {
  const detail = useAdminResource(`question|${question.id}`, (signal) => getQuestion(question.id, signal))
  const versions = [...(detail.data?.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber)

  return (
    <AdminModal onClose={onClose} title="Chi tiết câu hỏi">
      <AdminDetails items={[
        { label: 'Mã', value: <code>{question.id}</code> },
        { label: 'Dạng', value: TYPE_LABEL[question.questionType] ?? question.questionType },
        { label: 'Kỹ năng', value: question.skill ? SKILL_LABEL[question.skill] ?? question.skill : '—' },
        { label: 'Mục đích', value: question.purpose ? PURPOSE_LABEL[question.purpose] ?? question.purpose : '—' },
        { label: 'Gói truy cập', value: question.accessLevel ?? '—' },
        { label: 'Trạng thái', value: <span className={statusBadgeClass(question.status)}>{STATUS_LABEL[question.status]}</span> },
        { label: 'Cập nhật', value: question.updatedAt ? new Date(question.updatedAt).toLocaleString('vi-VN') : '—' },
      ]} />

      {detail.status === 'loading' ? <AdminLoading label="Đang tải các phiên bản…" /> : null}
      {detail.status === 'error' ? <AdminError message={detail.error ?? 'Không tải được câu hỏi.'} onRetry={detail.reload} /> : null}
      {detail.status === 'success' ? (
        <>
          <h3 className="qb-section-title">Các phiên bản</h3>
          <section aria-label="Các phiên bản" className="qb-versions">
            {versions.length === 0 ? <p className="adm-muted">Câu hỏi chưa có phiên bản nào.</p> : null}
            {versions.map((version) => (
              <VersionCard current={question.currentPublishedVersionId === version.id} key={version.id} version={version} />
            ))}
          </section>
        </>
      ) : null}
    </AdminModal>
  )
}
