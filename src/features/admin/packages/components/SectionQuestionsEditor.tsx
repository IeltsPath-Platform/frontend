import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { QuestionChooser } from '../../lessons/components/QuestionChooser'
import { addSectionQuestion, removeSectionQuestion, reorderSectionQuestions } from '../api/packageApi'
import type { PackageSection, PackageType } from '../types'

export function SectionQuestionsEditor({ packageId, versionId, section, packageType, disabled, onSaved, onMutate }: {
  packageId: string; versionId: string; section: PackageSection; packageType: PackageType; disabled: boolean; onSaved: () => void
  onMutate: (action: () => Promise<unknown>, message: string) => Promise<boolean>
}) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const [selected, setSelected] = useState<string[]>([])
  const [maxScore, setMaxScore] = useState('1')
  const [choosing, setChoosing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [section.id, versionId])
  const purpose = packageType === 'MOCK_TEST' || packageType === 'PRACTICE_TEST' ? 'EXAM' : packageType === 'PLACEMENT_TEST' ? 'PLACEMENT' : 'LEARNING'
  const locked = disabled || pending
  const questions = [...section.questions].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))

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
    if (selected.length !== 1) { setError('Chọn đúng một câu hỏi để thêm vào phần.'); return }
    if (questions.some((question) => question.questionVersionId === selected[0])) { setError('Câu này đã có trong phần. Chọn câu khác.'); return }
    const score = Number(maxScore)
    if (!Number.isFinite(score) || score <= 0) { setError('Điểm tối đa phải là số lớn hơn 0.'); return }
    void mutate(() => addSectionQuestion(packageId, versionId, section.id, { questionVersionId: selected[0]!, maxScore: score }), 'Đã thêm câu hỏi.', () => { setSelected([]); setChoosing(false) })
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
    <h4>Câu hỏi ({questions.length})</h4>
    {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
    {!questions.length ? <p className="adm-muted">Phần chưa có câu hỏi.</p> : null}
    <ol className="adm-package-question-list">{questions.map((question, index) => <li key={question.id}>
      <p className="adm-package-question-stem">{question.stem || `Phiên bản ${question.questionVersionId}`}</p>
      <p className="adm-muted">{question.maxScore} điểm · Thứ tự {question.sortOrder}</p>
      {question.status === 'DRAFT' ? <span className="adm-badge adm-badge--warn">Câu chưa xuất bản</span> : null}
      {question.purpose && question.purpose !== purpose ? <span className="adm-badge adm-badge--warn">Sai mục đích: cần {purpose}</span> : null}
      <div className="adm-package-actions">
        <button className="adm-btn" type="button" disabled={locked || index === 0} aria-label={`Đưa câu ${index + 1} lên`} onClick={() => move(index, -1)}><ArrowUp aria-hidden="true" size={16} /></button>
        <button className="adm-btn" type="button" disabled={locked || index === questions.length - 1} aria-label={`Đưa câu ${index + 1} xuống`} onClick={() => move(index, 1)}><ArrowDown aria-hidden="true" size={16} /></button>
        <button className="adm-btn adm-btn--danger" type="button" disabled={locked} aria-label={`Gỡ câu ${index + 1}`} onClick={() => void (async () => {
          if (locked) return
          if (!(await confirm({
            title: 'Gỡ câu hỏi khỏi phần này?',
            message: `Gỡ câu ${index + 1}? Câu hỏi trong ngân hàng vẫn được giữ lại.`,
            confirmLabel: 'Gỡ câu',
            tone: 'danger',
          }))) return
          await mutate(() => removeSectionQuestion(packageId, versionId, section.id, question.id), 'Đã gỡ câu hỏi.')
        })()}><Trash2 aria-hidden="true" size={16} /> Gỡ</button>
      </div>
    </li>)}</ol>
    {!choosing ? <button className="adm-btn" type="button" disabled={locked} onClick={() => setChoosing(true)}>Thêm câu hỏi</button> : <form aria-label={`Thêm câu hỏi vào ${section.title}`} noValidate onSubmit={add}>
      <fieldset className="adm-package-fields" disabled={locked}>
        <p className="adm-muted">Chọn một câu đã xuất bản có mục đích {purpose}. Thêm câu lần lượt để kiểm tra điểm và thứ tự.</p>
        <QuestionChooser purpose={purpose} value={selected} known={section.questions} onChange={(next) => setSelected(next.length ? [next.at(-1)!] : [])} />
        <label className="adm-field"><span>Điểm tối đa</span><input className="adm-input" type="number" min={0.01} step="any" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} /></label>
        <div className="adm-package-actions"><button className="adm-btn adm-btn--primary" type="submit">Thêm câu đã chọn</button><button className="adm-btn" type="button" onClick={() => setChoosing(false)}>Đóng chọn câu</button></div>
      </fieldset>
    </form>}
  </section>
}
