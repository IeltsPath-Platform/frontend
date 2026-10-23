import { useEffect, useRef, useState, type FormEvent } from 'react'
import { KnowledgePointPicker } from '../../questions/components/KnowledgePointPicker'
import { DIFFICULTY_LABEL, TYPE_LABEL } from '../../questions/lib/labels'
import { requestQuestionDraft } from '../api/aiDraftApi'
import { aiDraftError } from '../lib/aiDraftLabels'
import {
  QUESTION_DIFFICULTIES, QUESTION_DRAFT_MAX_ITEMS, QUESTION_DRAFT_TYPES,
  questionGenerationRequestSchema, type QuestionDraft, type QuestionGenerationRequest,
} from '../types'

export function QuestionDraftForm({ initialKnowledgePointId, onCreated, onCancel }: {
  initialKnowledgePointId?: string; onCreated: (draft: QuestionDraft) => void; onCancel: () => void
}) {
  const [knowledgePointId, setKnowledgePointId] = useState<string | null>(initialKnowledgePointId ?? null)
  const [questionType, setQuestionType] = useState<QuestionGenerationRequest['questionType']>('MULTIPLE_CHOICE')
  const [count, setCount] = useState('5')
  const [difficulty, setDifficulty] = useState<QuestionGenerationRequest['difficulty']>('MEDIUM')
  const [instructions, setInstructions] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const parsed = questionGenerationRequestSchema.safeParse({
      knowledgePointId: knowledgePointId ?? '', questionType, count: Number(count), difficulty,
      ...(instructions ? { instructions } : {}),
    })
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0]
      setError(field === 'knowledgePointId' ? 'Chọn một điểm kiến thức đang dùng để tạo câu hỏi.'
        : field === 'count' ? `Nhập số câu là số nguyên từ 1 đến ${QUESTION_DRAFT_MAX_ITEMS}.`
        : field === 'instructions' ? 'Hướng dẫn thêm không được vượt quá 500 ký tự.'
        : 'Chọn dạng câu hỏi và độ khó hợp lệ.')
      return
    }
    setPending(true)
    setError(null)
    try {
      const draft = await requestQuestionDraft(parsed.data)
      if (mounted.current) onCreated(draft)
    }
    catch (reason) { if (mounted.current) setError(aiDraftError(reason)) }
    finally { if (mounted.current) setPending(false) }
  }

  return <form className="adm-card adm-draft-form" aria-label="Tạo bản nháp câu hỏi" noValidate onSubmit={(event) => void submit(event)}>
    <h2>Tạo nháp câu hỏi</h2>
    <p className="adm-muted">Chọn một điểm kiến thức và cấu hình câu hỏi. Bạn sẽ xem lại và chọn câu cần giữ trước khi duyệt.</p>
    {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
    <fieldset className="adm-draft-fields" disabled={pending}>
      <legend className="adm-sr-only">Cấu hình bản nháp câu hỏi</legend>
      <section aria-label="Điểm kiến thức cho câu hỏi">
        <h3>Điểm kiến thức (bắt buộc)</h3>
        <p className="adm-muted">Mỗi yêu cầu dùng một điểm kiến thức. Chọn điểm khác để thay thế.</p>
        <KnowledgePointPicker value={knowledgePointId ? [{ knowledgePointId, weight: 1 }] : []} onChange={(next) => setKnowledgePointId(next.at(-1)?.knowledgePointId ?? null)} />
        {knowledgePointId ? <button className="adm-btn" type="button" onClick={() => setKnowledgePointId(null)}>Gỡ điểm kiến thức</button> : null}
      </section>
      <label className="adm-field"><span>Dạng câu hỏi</span><select className="adm-select" required value={questionType} onChange={(event) => setQuestionType(event.target.value as QuestionGenerationRequest['questionType'])}>{QUESTION_DRAFT_TYPES.map((value) => <option key={value} value={value}>{TYPE_LABEL[value]}</option>)}</select></label>
      <label className="adm-field"><span>Số câu</span><input className="adm-input" type="number" required min={1} max={QUESTION_DRAFT_MAX_ITEMS} step={1} value={count} onChange={(event) => setCount(event.target.value)} /></label>
      <label className="adm-field"><span>Độ khó</span><select className="adm-select" required value={difficulty} onChange={(event) => setDifficulty(event.target.value as QuestionGenerationRequest['difficulty'])}>{QUESTION_DIFFICULTIES.map((value) => <option key={value} value={value}>{DIFFICULTY_LABEL[value]}</option>)}</select></label>
      <label className="adm-field"><span>Hướng dẫn thêm (tùy chọn)</span><textarea className="adm-textarea" maxLength={500} value={instructions} onChange={(event) => setInstructions(event.target.value)} /><span className="adm-muted adm-draft-counter">{instructions.length}/500 ký tự</span></label>
      <p className="adm-muted">Duyệt câu hỏi chỉ tạo nội dung nháp. Bạn cần xuất bản riêng trong ngân hàng câu hỏi trước khi dùng cho học viên.</p>
      <div className="adm-draft-actions">
        <button className="adm-btn adm-btn--primary" type="submit">{pending ? 'Đang gửi yêu cầu…' : 'Tạo nháp câu hỏi'}</button>
        <button className="adm-btn" type="button" onClick={onCancel}>Hủy</button>
      </div>
    </fieldset>
  </form>
}
