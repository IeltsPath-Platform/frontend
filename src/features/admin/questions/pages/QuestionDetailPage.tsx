import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { AdminPage } from '../../pages/AdminPage'
import { addQuestionVersion, archiveQuestionVersion, getQuestion, publishQuestionVersion } from '../api/questionApi'
import { VersionCard } from '../components/VersionCard'
import { VersionForm } from '../components/VersionForm'
import {
  PURPOSE_LABEL, SKILL_LABEL, STATUS_LABEL, TYPE_LABEL, questionErrorText, statusBadgeClass,
} from '../lib/labels'
import type { QuestionVersion, VersionRequest } from '../types'
import '../questions.css'

export function QuestionDetailPage() {
  const { questionId = '' } = useParams()
  const detail = useAdminResource(`question|${questionId}`, (signal) => getQuestion(questionId, signal))
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const question = detail.data
  const versions = [...(question?.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber)
  const nextVersionNumber = (versions[0]?.versionNumber ?? 0) + 1

  async function run(version: QuestionVersion, action: () => Promise<unknown>, done: string) {
    setBusyId(version.id)
    setActionError(null)
    setNotice(null)
    try {
      await action()
      setNotice(done)
      detail.reload()
    } catch (reason) {
      setActionError(questionErrorText(reason))
    } finally {
      setBusyId(null)
    }
  }

  async function saveVersion(body: VersionRequest) {
    await addQuestionVersion(questionId, body)
    setAdding(false)
    setNotice(`Đã lưu phiên bản ${body.versionNumber} ở trạng thái nháp.`)
    detail.reload()
  }

  const back = (
    <Link className="adm-btn" to="/admin/questions"><ArrowLeft aria-hidden="true" size={14} /> Ngân hàng câu hỏi</Link>
  )

  return (
    <AdminPage
      actions={
        <>
          {back}
          {question ? (
            <button className="adm-btn adm-btn--primary" onClick={() => setAdding((open) => !open)} type="button">
              <Plus aria-hidden="true" size={16} /> Thêm phiên bản
            </button>
          ) : null}
        </>
      }
      subtitle={question ? `Mã ${question.id}` : undefined}
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

          {notice ? <div className="adm-alert" role="status">{notice}</div> : null}
          {actionError ? <div className="adm-alert adm-alert--error" role="alert">{actionError}</div> : null}

          {adding ? (
            <VersionForm
              nextVersionNumber={nextVersionNumber}
              onCancel={() => setAdding(false)}
              onSubmit={saveVersion}
              questionType={question.questionType}
            />
          ) : null}

          <section aria-label="Các phiên bản" className="qb-versions">
            {versions.length === 0 ? <p className="adm-muted">Câu hỏi chưa có phiên bản nào. Thêm phiên bản đầu tiên.</p> : null}
            {versions.map((version) => (
              <VersionCard
                busy={busyId === version.id}
                current={question.currentPublishedVersionId === version.id}
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
