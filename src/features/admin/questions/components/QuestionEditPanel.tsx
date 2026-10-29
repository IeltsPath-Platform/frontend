import { useState } from 'react'
import { useToast } from '@/components/toast/toastContext'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminError } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import { addQuestionVersion, archiveQuestionVersion, getQuestion, publishQuestionVersion } from '../api/questionApi'
import { PURPOSE_LABEL, SKILL_LABEL, STATUS_LABEL, TYPE_LABEL, questionErrorText, statusBadgeClass } from '../lib/labels'
import { formStateFromVersion } from '../lib/versionForm'
import type { Question, QuestionVersion, VersionRequest } from '../types'
import { VersionCard } from './VersionCard'
import { VersionForm } from './VersionForm'

/**
 * Body of the update drawer. A question has no fields of its own to edit: its content lives in versions, so updating
 * means saving a new draft that starts from the latest version, and publishing or archiving the versions that exist.
 */
export function QuestionEditPanel({ question, onChanged, onDone }: {
  question: Question
  /** Something changed on the server; the list behind the drawer reloads. */
  onChanged: () => void
  onDone: () => void
}) {
  const { toast } = useToast()
  // `refresh` keeps the form mounted, so a publish does not throw away what is typed in it.
  const detail = useAdminResource(`question|${question.id}`, (signal) => getQuestion(question.id, signal))
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, setActionError] = useAdminError()

  const versions = [...(detail.data?.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber)
  const latest = versions[0]
  const nextVersionNumber = (latest?.versionNumber ?? 0) + 1

  async function run(version: QuestionVersion, action: () => Promise<unknown>, done: string) {
    setBusyId(version.id)
    setActionError(null)
    try {
      await action()
      toast({ title: 'Thành công', description: done, tone: 'success' })
      detail.refresh()
      onChanged()
    } catch (reason) {
      setActionError(questionErrorText(reason))
    } finally {
      setBusyId(null)
    }
  }

  async function saveVersion(body: VersionRequest) {
    await addQuestionVersion(question.id, body)
    toast({ title: 'Thành công', description: `Đã lưu phiên bản ${body.versionNumber} ở trạng thái nháp.`, tone: 'success' })
    onChanged()
    onDone()
  }

  return (
    <>
      <p className="qb-meta">
        <span className="adm-badge">{TYPE_LABEL[question.questionType] ?? question.questionType}</span>
        <span className="adm-badge">{question.skill ? SKILL_LABEL[question.skill] ?? question.skill : 'Chưa gắn kỹ năng'}</span>
        <span className="adm-badge">{question.purpose ? PURPOSE_LABEL[question.purpose] ?? question.purpose : '—'}</span>
        <span className={statusBadgeClass(question.status)}>{STATUS_LABEL[question.status]}</span>
      </p>

      {detail.status === 'loading' ? <AdminLoading label="Đang tải câu hỏi…" /> : null}
      {detail.status === 'error' ? <AdminError message={detail.error ?? 'Không tải được câu hỏi.'} onRetry={detail.reload} /> : null}

      {detail.status === 'success' ? (
        <>
          {versions.length > 0 ? (
            <section aria-label="Các phiên bản" className="qb-versions">
              {versions.map((version) => (
                <VersionCard
                  busy={busyId === version.id}
                  current={question.currentPublishedVersionId === version.id}
                  key={version.id}
                  onArchive={(target) => void run(target, () => archiveQuestionVersion(question.id, target.id), `Đã lưu trữ phiên bản ${target.versionNumber}.`)}
                  onPublish={(target) => void run(target, () => publishQuestionVersion(question.id, target.id), `Đã xuất bản phiên bản ${target.versionNumber}.`)}
                  version={version}
                />
              ))}
            </section>
          ) : null}

          <h3 className="qb-section-title">{latest ? 'Phiên bản mới từ phiên bản ' + latest.versionNumber : 'Phiên bản đầu tiên'}</h3>
          <VersionForm
            initialState={latest ? formStateFromVersion(question.questionType, latest, nextVersionNumber) : undefined}
            nextVersionNumber={nextVersionNumber}
            onCancel={onDone}
            onSubmit={saveVersion}
            questionType={question.questionType}
          />
        </>
      ) : null}
    </>
  )
}
