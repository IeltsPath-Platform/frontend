import { useState } from 'react'
import { AdminModal } from '../../components/AdminLayer'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { getPackage } from '../../packages/api/packageApi'
import type { z } from 'zod'
import type { sectionQuestionSchema } from '../../packages/types'
import { SKILL_LABEL } from '../../questions/lib/labels'
import { CourseQuestionContent } from './CourseQuestionContent'

type SectionQuestion = z.infer<typeof sectionQuestionSchema>

/** One question of a set, folded to its text; opening it reads the options, the answer and the explanation. */
function SetQuestion({ question, number }: { question: SectionQuestion; number: number }) {
  const [open, setOpen] = useState(false)
  return <details className="adm-pkgdetail__question" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><strong>Câu {number}.</strong> {question.stem?.trim() || '(không có nội dung)'}</summary>
    {open && question.questionId ? <CourseQuestionContent questionId={question.questionId} versionId={question.questionVersionId} withPassages={false} /> : null}
  </details>
}

/** What a practice set holds, read when the dialog opens: its sections with the text and passage, and its questions. */
export function CoursePackageDetail({ packageId, onClose }: { packageId: string; onClose: () => void }) {
  const detail = useAdminResource(`course-package-detail:${packageId}`, (signal) => getPackage(packageId, signal))
  const pack = detail.data
  // The version learners get is the published one; a set with none shows its newest draft.
  const version = pack ? pack.versions.find((item) => item.id === pack.currentPublishedVersionId) ?? pack.versions.at(-1) : undefined
  return <AdminModal title={pack?.title ?? 'Chi tiết gói luyện tập'} description={pack ? pack.code : undefined} onClose={onClose} stacked>
    {detail.status === 'loading' ? <AdminLoading label="Đang tải gói luyện tập…" /> : null}
    {detail.status === 'error' ? <AdminError message={detail.error ?? 'Không tải được gói luyện tập.'} onRetry={detail.reload} /> : null}
    {detail.status === 'success' && !version ? <p className="adm-muted">Gói này chưa có phiên bản nào.</p> : null}
    {detail.status === 'success' && version ? <div className="adm-qdetail">
      {version.sections.length === 0 ? <p className="adm-muted">Gói chưa có phần nào.</p> : null}
      {version.sections.map((section) => <section aria-label={section.title} className="adm-pkgdetail__section" key={section.id}>
        <h3>{section.title}{section.skill ? ` · ${SKILL_LABEL[section.skill] ?? section.skill}` : ''}</h3>
        {section.instructions?.trim() ? <p className="adm-qdetail__stem">{section.instructions}</p> : null}
        {section.passage?.trim() ? <div className="adm-qdetail__passage"><p className="adm-qdetail__stem">{section.passage}</p></div> : null}
        {section.questions.map((question, index) => <SetQuestion key={question.id} number={index + 1} question={question} />)}
        {section.questions.length === 0 ? <p className="adm-muted">Phần này chưa có câu hỏi.</p> : null}
      </section>)}
    </div> : null}
  </AdminModal>
}
