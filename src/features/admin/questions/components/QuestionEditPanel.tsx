import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useToast } from '@/components/toast/toastContext'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminError } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import { addQuestionVersion, archiveQuestionVersion, getQuestion, publishQuestionVersion } from '../api/questionApi'
import { PURPOSE_LABEL, SKILL_LABEL, STATUS_LABEL, TYPE_LABEL, questionErrorText } from '../lib/labels'
import { formStateFromVersion } from '../lib/versionForm'
import type { Question, QuestionVersion, VersionRequest } from '../types'
import { QuestionImageEditor } from './QuestionImageEditor'
import { QuestionContext } from './QuestionContext'
import { QuestionUsages } from './QuestionUsages'
import { VersionCard } from './VersionCard'
import { VersionForm } from './VersionForm'

const NEW_DRAFT = 'new-draft'

/**
 * Body of the update drawer. A question has no fields of its own to edit: its content lives in versions, so updating
 * means saving a new draft that starts from the latest version, and publishing or archiving the versions that exist.
 */
export function QuestionEditPanel({ question, onChanged }: {
  question: Question
  /** Something changed on the server; the list behind the drawer reloads. */
  onChanged: () => void
}) {
  const { toast } = useToast()
  // `refresh` keeps the form mounted, so a publish does not throw away what is typed in it.
  const detail = useAdminResource(`question|${question.id}`, (signal) => getQuestion(question.id, signal))
  const [busyId, setBusyId] = useState<string | null>(null)
  // The versions are listed first; the form for a new draft opens from "Tạo bản nháp", as in the package editor.
  const [drafting, setDrafting] = useState(false)
  const [, setActionError] = useAdminError()

  const versions = [...(detail.data?.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber)
  const latest = versions[0]
  // The version on show, and the one a new draft starts from: the one in use, else the newest.
  const [pickedId, setSelectedId] = useState<string | null>(null)
  // After saving a draft the panel moves to it as soon as the reloaded list holds it.
  const [savedNumber, setSavedNumber] = useState<number | null>(null)
  const selected = versions.find((version) => version.id === pickedId) ?? versions.find((version) => version.versionNumber === savedNumber) ?? versions.find((version) => version.id === question.currentPublishedVersionId) ?? latest
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
    setSavedNumber(body.versionNumber)
    setSelectedId(null)
    detail.refresh()
    setDrafting(false)
  }

  return (
    <>
      <p className="qb-meta">
        <span className="adm-badge">{TYPE_LABEL[question.questionType] ?? question.questionType}</span>
        <span className="adm-badge">{question.skill ? SKILL_LABEL[question.skill] ?? question.skill : 'Chưa gắn kỹ năng'}</span>
        <span className="adm-badge">{question.purpose ? PURPOSE_LABEL[question.purpose] ?? question.purpose : '—'}</span>
      </p>

      {detail.status === 'loading' ? <AdminLoading label="Đang tải câu hỏi…" /> : null}
      {detail.status === 'error' ? <AdminError message={detail.error ?? 'Không tải được câu hỏi.'} onRetry={detail.reload} /> : null}

      {detail.status === 'success' ? (
        <>
          <section aria-label="Phiên bản câu hỏi" className="qb-bar">
            <label className="adm-field qb-bar__select">
              <span>Chọn phiên bản</span>
              <select className="adm-select" disabled={versions.length === 0} onChange={(event) => { if (event.target.value === NEW_DRAFT) return; setSavedNumber(null); setSelectedId(event.target.value); setDrafting(false) }} value={drafting ? NEW_DRAFT : selected?.id ?? ''}>
                {drafting ? <option value={NEW_DRAFT}>Bản {nextVersionNumber} · Bản nháp mới</option> : null}
                {versions.length === 0 && !drafting ? <option value="">Chưa có phiên bản</option> : null}
                {versions.map((version) => <option key={version.id} value={version.id}>Bản {version.versionNumber} · {question.currentPublishedVersionId === version.id ? 'Đang dùng' : STATUS_LABEL[version.status]}</option>)}
              </select>
            </label>
            {drafting ? null : <button className="adm-btn adm-btn--small" onClick={() => setDrafting(true)} type="button"><Plus aria-hidden="true" size={14} /> Tạo bản nháp</button>}
          </section>

          {selected ? (question.skill === 'WRITING'
            ? <QuestionImageEditor editable={!drafting && selected.status !== 'ARCHIVED'} key={selected.id} questionId={question.id} versionId={selected.id} />
            : <QuestionContext key={selected.id} versionId={selected.id} />) : null}

          {drafting ? <>
            <h3 className="qb-section-title">{selected ? `Bản nháp mới từ bản ${selected.versionNumber}` : 'Bản nháp đầu tiên'}</h3>
            <VersionForm
              initialState={selected ? formStateFromVersion(question.questionType, selected, nextVersionNumber) : undefined}
              key={selected?.id ?? 'empty'}
              nextVersionNumber={nextVersionNumber}
              onCancel={() => setDrafting(false)}
              onSubmit={saveVersion}
              questionType={question.questionType}
              skill={question.skill}
            />
          </> : selected ? (<>
            <VersionCard
              busy={busyId === selected.id}
              current={question.currentPublishedVersionId === selected.id}
              full
              key={selected.id}
              onArchive={(target) => void run(target, () => archiveQuestionVersion(question.id, target.id), `Đã lưu trữ phiên bản ${target.versionNumber}.`)}
              onPublish={(target) => void run(target, () => publishQuestionVersion(question.id, target.id), `Đã xuất bản phiên bản ${target.versionNumber}.`)}
              questionType={question.questionType}
              skill={question.skill}
              version={selected}
            />
            <QuestionUsages questionId={question.id} refreshKey={versions.length} versionId={selected.id} />
          </>) : <p className="adm-muted">Câu hỏi chưa có phiên bản nào. Bấm Tạo bản nháp để thêm.</p>}
        </>
      ) : null}
    </>
  )
}
