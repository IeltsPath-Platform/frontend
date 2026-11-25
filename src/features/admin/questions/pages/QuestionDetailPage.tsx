import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useToast } from '@/components/toast/toastContext'
import { ArrowLeft, Plus } from 'lucide-react'
import { AdminDrawer } from '../../components/AdminLayer'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { addQuestionVersion, archiveQuestionVersion, getQuestion, publishQuestionVersion } from '../api/questionApi'
import { QuestionImageEditor } from '../components/QuestionImageEditor'
import { VersionCard } from '../components/VersionCard'
import { VersionForm } from '../components/VersionForm'
import {
  PURPOSE_LABEL, SKILL_LABEL, STATUS_LABEL, TYPE_LABEL, questionErrorText, statusBadgeClass,
} from '../lib/labels'
import type { QuestionVersion, VersionRequest } from '../types'
import '../questions.css'
import { useAdminError } from '../../lib/useAdminError'

export function QuestionDetailPage() {
  const { questionId = '' } = useParams()
  const detail = useAdminResource(`question|${questionId}`, (signal) => getQuestion(questionId, signal))
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, setActionError] = useAdminError()
  const { toast } = useToast()

  const question = detail.data
  const versions = [...(question?.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber)
  const nextVersionNumber = (versions[0]?.versionNumber ?? 0) + 1

  async function run(version: QuestionVersion, action: () => Promise<unknown>, done: string) {
    setBusyId(version.id)
    setActionError(null)
    try {
      await action()
      toast({ title: 'Thành công', description: done, tone: 'success' })
      detail.reload()
    } catch (reason) {
      setActionError(questionErrorText(reason))
    } finally {
      setBusyId(null)
    }
  }

  async function saveVersion(body: VersionRequest) {
    await addQuestionVersion(questionId, body)
    toast({ title: 'Thành công', description: `Đã lưu phiên bản ${body.versionNumber} ở trạng thái nháp.`, tone: 'success' })
    detail.reload()
  }

  const back = (
    <Link className="adm-btn" to="/content-author/questions"><ArrowLeft aria-hidden="true" size={14} /> Ngân hàng câu hỏi</Link>
  )

  return (
    <AdminPage
      actions={
        <>
          {back}
          {question ? (
            <button className="adm-btn adm-btn--primary" onClick={() => setAdding(true)} type="button">
              <Plus aria-hidden="true" size={16} /> Thêm phiên bản
            </button>
          ) : null}
        </>
      }
      subtitle={question ? `Mã ${question.code}` : undefined}
      title={question ? TYPE_LABEL[question.questionType] ?? question.questionType : 'Câu hỏi'}
    >
      {detail.status === 'loading' ? <AdminLoading label="Đang tải câu hỏi…" /> : null}
      {detail.status === 'error' ? <AdminError message={detail.error ?? 'Không tải được câu hỏi.'} onRetry={detail.reload} /> : null}

      {question ? (
        <>
          <p className="qb-meta">
            <span className={statusBadgeClass(question.status)}>{STATUS_LABEL[question.status]}</span>
            <span className="adm-badge">{question.skill ? SKILL_LABEL[question.skill] ?? question.skill : 'Chưa gắn kỹ năng'}</span>
            <span className="adm-badge">{question.purpose ? PURPOSE_LABEL[question.purpose] ?? question.purpose : '—'}</span>
            {question.accessLevel ? <span className="adm-badge adm-badge--muted">{question.accessLevel}</span> : null}
          </p>

          

          {adding ? (
            <AdminDrawer title="Phiên bản mới (nháp)" description={`Mã ${question.code}`} size="lg" onClose={() => setAdding(false)}>
              {(close) => (
                <VersionForm
                  nextVersionNumber={nextVersionNumber}
                  onCancel={close}
                  onSubmit={async (body) => { await saveVersion(body); close() }}
                  questionType={question.questionType}
                  skill={question.skill}
                />
              )}
            </AdminDrawer>
          ) : null}

          <section aria-label="Các phiên bản" className="qb-versions">
            {versions.length === 0 ? <p className="adm-muted">Câu hỏi chưa có phiên bản nào. Thêm phiên bản đầu tiên.</p> : null}
            {versions.map((version) => (
              <VersionCard
                busy={busyId === version.id}
                current={question.currentPublishedVersionId === version.id}
                extra={question.skill === 'WRITING' ? <QuestionImageEditor editable={version.status !== 'ARCHIVED'} questionId={questionId} versionId={version.id} /> : undefined}
                key={version.id}
                onArchive={(target) => void run(target, () => archiveQuestionVersion(questionId, target.id), `Đã lưu trữ phiên bản ${target.versionNumber}.`)}
                onPublish={(target) => void run(target, () => publishQuestionVersion(questionId, target.id), `Đã xuất bản phiên bản ${target.versionNumber}.`)}
                version={version}
              />
            ))}
          </section>
        </>
      ) : null}
    </AdminPage>
  )
}
