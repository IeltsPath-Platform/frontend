import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, Wrench } from 'lucide-react'
import { z } from 'zod'
import { AdminModal } from '../../components/AdminLayer'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { QuestionChooser } from '../../lessons/components/QuestionChooser'
import { QuestionImageEditor } from '../../questions/components/QuestionImageEditor'
import { addSectionQuestion, moveToNewerQuestionVersion, removeSectionQuestion, reorderSectionQuestions } from '../api/packageApi'
import type { PackageSection, PackageType } from '../types'
import { useAdminError } from '../../lib/useAdminError'
import { SectionAiButton } from './SectionAiButton'
import type { SectionQuestionDraft } from '../../ai-drafts/types'
import { publishSectionDraftQuestions } from '../api/sectionDraftApi'

/** Every question counts one point: the band tables of Listening and Reading assume it. */
const DEFAULT_SCORE = 1

export function SectionQuestionsEditor({ packageId, versionId, section, packageType, disabled, onSaved, onMutate, openDraft }: {
  packageId: string; versionId: string; section: PackageSection; packageType: PackageType; disabled: boolean; onSaved: () => void
  onMutate: (action: () => Promise<unknown>, message: string) => Promise<boolean>
  openDraft?: SectionQuestionDraft
}) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const [selected, setSelected] = useState<string[]>([])
  const [choosing, setChoosing] = useState(false)
  const [pending, setPending] = useState(false)
  const [, setError] = useAdminError()
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [section.id, versionId])
  const purpose = packageType === 'MOCK_TEST' || packageType === 'PRACTICE_TEST' ? 'EXAM' : packageType === 'PLACEMENT_TEST' ? 'PLACEMENT' : 'LEARNING'
  const locked = disabled || pending
  const questions = [...section.questions].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
  // A Writing task is one prompt: once it has its question the author edits that question instead of adding, swapping or removing it.
  const fixedPrompt = section.skill === 'WRITING' && questions.length === 1
  const full = section.skill === 'WRITING' && questions.length > 0
  const unpublishedCount = questions.filter((question) => question.status === 'DRAFT').length
  const taken = section.questions.map((question) => question.questionVersionId).join(',')
  const schema = useMemo(() => z.object({ picked: z.array(z.string()) }).superRefine((value, ctx) => {
    if (value.picked.length !== 1) ctx.addIssue({ code: 'custom', path: ['picked'], message: 'Chọn đúng một câu hỏi để thêm vào phần.' })
    else if (taken.split(',').includes(value.picked[0]!)) ctx.addIssue({ code: 'custom', path: ['picked'], message: 'Câu này đã có trong phần. Chọn câu khác.' })
  }), [taken])
  const form = useFormErrors(schema, { picked: selected })
  const pickedError = form.field('picked').error

  async function mutate(action: () => Promise<unknown>, message: string, after?: () => void) {
    if (locked) return
    setPending(true); setError(null)
    try {
      if (await onMutate(action, message) && mounted.current) { after?.(); onSaved() }
    } finally { if (mounted.current) setPending(false) }
  }

  function add(event: FormEvent) {
    event.preventDefault()
    if (locked) return
    if (!form.validate()) return
    void mutate(() => addSectionQuestion(packageId, versionId, section.id, { questionVersionId: selected[0]!, maxScore: DEFAULT_SCORE }), 'Đã thêm câu hỏi.', () => { setSelected([]); setChoosing(false) })
  }

  function move(index: number, delta: number) {
    if (locked) return
    const ids = questions.map((question) => question.id)
    const other = index + delta
    if (other < 0 || other >= ids.length) return
    ;[ids[index], ids[other]] = [ids[other]!, ids[index]!]
    void mutate(() => reorderSectionQuestions(packageId, versionId, section.id, ids), 'Đã đổi thứ tự câu hỏi.')
  }

  return <section className="adm-package-questions" aria-label={`Câu hỏi của ${section.title}`}>
    {confirmDialog}
    <div className="adm-package-questions__head">
      <h4>Câu hỏi ({questions.length})</h4>
      <div className="adm-package-actions">
        {!disabled ? <SectionAiButton packageId={packageId} versionId={versionId} section={section} packageType={packageType} disabled={locked} openDraft={openDraft} onSaved={onSaved} onMutate={onMutate} /> : null}
        {!disabled && unpublishedCount ? <button className="adm-btn adm-btn--small" type="button" disabled={locked} onClick={() => void mutate(() => publishSectionDraftQuestions(packageId, versionId, section.id), `Đã xuất bản ${unpublishedCount} câu nháp.`)}>Xuất bản {unpublishedCount} câu nháp</button> : null}
        {full ? null : <button className="adm-btn adm-btn--small" type="button" disabled={locked} onClick={() => setChoosing(true)}><Plus aria-hidden="true" size={14} /> Thêm câu hỏi</button>}
      </div>
    </div>
    {!questions.length ? <p className="adm-muted">Phần chưa có câu hỏi.</p> : null}
    <ol className="adm-package-question-list">{questions.map((question, index) => <li key={question.id}>
      <p className="adm-package-question-stem">{question.stem || `Phiên bản ${question.questionVersionId}`}</p>
      <p className="adm-muted">{question.maxScore} điểm · Thứ tự {question.sortOrder}</p>
      {question.status === 'DRAFT' ? <span className="adm-badge adm-badge--warn">Câu chưa xuất bản</span> : null}
      {question.newerVersionNumber ? <span className="adm-badge adm-badge--warn">Có phiên bản mới (v{question.newerVersionNumber})</span> : null}
      {question.purpose && question.purpose !== purpose ? <span className="adm-badge adm-badge--warn">Sai mục đích: cần {purpose}</span> : null}
      {section.skill === 'WRITING' ? <div className="adm-package-question-image"><QuestionImageEditor editable={false} questionId={question.questionId ?? ''} versionId={question.questionVersionId} /></div> : null}
      <div className="adm-package-actions">
        {question.newerVersionNumber && !disabled ? <button className="adm-btn adm-btn--small" type="button" disabled={locked} onClick={() => void mutate(() => moveToNewerQuestionVersion(packageId, versionId, section.id, question.id), `Đã chuyển câu ${index + 1} sang phiên bản ${question.newerVersionNumber}.`)}>Dùng phiên bản mới</button> : null}
        {question.questionId ? <a className="adm-pe-icon" href={`/content-author/questions?edit=${question.questionId}`} rel="noreferrer" target="_blank" aria-label="Mở câu hỏi" title="Mở câu hỏi"><Wrench aria-hidden="true" size={16} /></a> : null}
        {questions.length > 1 ? <>
          <button className="adm-pe-icon" type="button" disabled={locked || index === 0} aria-label={`Đưa câu ${index + 1} lên`} onClick={() => move(index, -1)}><ArrowUp aria-hidden="true" size={16} /></button>
          <button className="adm-pe-icon" type="button" disabled={locked || index === questions.length - 1} aria-label={`Đưa câu ${index + 1} xuống`} onClick={() => move(index, 1)}><ArrowDown aria-hidden="true" size={16} /></button>
        </> : null}
        {fixedPrompt ? null : <button className="adm-pe-icon adm-pe-icon--danger" type="button" disabled={locked} aria-label={`Gỡ câu ${index + 1}`} onClick={() => void (async () => {
          if (locked) return
          if (!(await confirm({
            title: 'Gỡ câu hỏi khỏi phần này?',
            message: `Gỡ câu ${index + 1}? Câu hỏi trong ngân hàng vẫn được giữ lại.`,
            confirmLabel: 'Gỡ câu',
            tone: 'danger',
          }))) return
          await mutate(() => removeSectionQuestion(packageId, versionId, section.id, question.id), 'Đã gỡ câu hỏi.')
        })()}><Trash2 aria-hidden="true" size={16} /></button>}
      </div>
    </li>)}</ol>
    {choosing ? <AdminModal onClose={() => setChoosing(false)} size="wide" stacked top title="Thêm câu hỏi" description={section.title}>{(close) => <>
      <form aria-label={`Thêm câu hỏi vào ${section.title}`} noValidate onSubmit={add}>
        <fieldset className="adm-package-fields" disabled={locked}>
          <QuestionChooser purpose={purpose} emptyText="Không còn câu hỏi trống nào cho phần này." fixedSkill={section.skill} freeOnly hideSelected value={selected} known={section.questions} onChange={(next) => setSelected(next.length ? [next.at(-1)!] : [])} />
          {pickedError ? <p className="adm-field__error" role="alert">{pickedError}</p> : null}
          <div className="adm-package-actions"><button className="adm-btn adm-btn--primary" type="submit">Thêm câu đã chọn</button><button className="adm-btn" type="button" onClick={close}>Hủy</button></div>
        </fieldset>
      </form>
    </>}</AdminModal> : null}
  </section>
}
