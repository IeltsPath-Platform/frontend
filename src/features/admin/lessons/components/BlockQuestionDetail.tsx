import { AdminModal } from '../../components/AdminLayer'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { getQuestion } from '../../questions/api/questionApi'
import { VersionCard } from '../../questions/components/VersionCard'

/** One question of an exercise block as the block holds it: that version, with its options, answer and explanation. */
export function BlockQuestionDetail({ questionId, questionVersionId, onClose }: {
  questionId: string
  questionVersionId: string
  onClose: () => void
}) {
  const detail = useAdminResource(`block-question|${questionId}`, (signal) => getQuestion(questionId, signal))
  const version = detail.data?.versions?.find((item) => item.id === questionVersionId)
  return (
    <AdminModal onClose={onClose} stacked title="Chi tiết câu hỏi">
      {detail.status === 'loading' ? <AdminLoading label="Đang tải câu hỏi…" /> : null}
      {detail.status === 'error' ? <AdminError message={detail.error ?? 'Không tải được câu hỏi.'} onRetry={detail.reload} /> : null}
      {detail.status === 'success' && !version ? <p className="adm-muted">Không tìm thấy phiên bản câu hỏi của block.</p> : null}
      {version ? <VersionCard current={detail.data?.currentPublishedVersionId === version.id} defaultOpen version={version} /> : null}
    </AdminModal>
  )
}
