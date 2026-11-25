import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useToast } from '@/components/toast/toastContext'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { AdminField } from '../../components/AdminField'
import { AdminModal } from '../../components/AdminLayer'
import { useAdminErrorToast } from '../../lib/useAdminError'
import { requestQuestionDraft } from '../../ai-drafts/api/aiDraftApi'
import { aiDraftError } from '../../ai-drafts/lib/aiDraftLabels'
import { QUESTION_DRAFT_TYPES, type QuestionDraftType } from '../../ai-drafts/types'
import type { LessonEditor } from '../types'

const schema = z.object({ knowledgePointId: z.string().min(1, 'Chọn điểm kiến thức.'), questionType: z.enum(QUESTION_DRAFT_TYPES), count: z.string().regex(/^(?:[1-9]|10)$/, 'Số câu phải từ 1 đến 10.') })

export function LessonQuestionRequestModal({ lesson, blockId, onClose }: { lesson: LessonEditor; blockId?: string; onClose: () => void }) {
  const [knowledgePointId, setKnowledgePointId] = useState(lesson.knowledgePointIds[0] ?? '')
  const [questionType, setQuestionType] = useState<QuestionDraftType>('MULTIPLE_CHOICE')
  const [count, setCount] = useState('5')
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const form = useFormErrors(schema, { knowledgePointId, questionType, count })
  const fail = useAdminErrorToast()
  const { toast } = useToast()
  const navigate = useNavigate()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !form.validate()) return
    setBusy(true)
    try {
      const draft = await requestQuestionDraft({ knowledgePointId, questionType, count: Number(count), instructions: instructions.trim() || undefined, lessonId: lesson.id, ...(blockId ? { blockId } : {}) })
      toast({ title: 'Đã gửi yêu cầu', description: 'Đang sinh câu hỏi.', tone: 'success' })
      onClose()
      navigate(`/content-author/ai-drafts/${draft.id}`)
    } catch (reason) { fail(aiDraftError(reason)) }
    finally { setBusy(false) }
  }

  return <AdminModal onClose={onClose} size="wide" title="Sinh câu hỏi bằng AI">
    {() => <form className="adm-form" noValidate onSubmit={(event) => void submit(event)}>
      <AdminField label="Điểm kiến thức" {...form.field('knowledgePointId')}>
        <select className="adm-select" value={knowledgePointId} onChange={(event) => setKnowledgePointId(event.target.value)}>
          <option value="">Chọn điểm kiến thức</option>
          {lesson.knowledgePointIds.map((id) => { const point = lesson.knowledgePoints.find((item) => item.id === id); return <option key={id} value={id}>{point?.name ?? point?.code ?? id}</option> })}
        </select>
      </AdminField>
      <AdminField label="Dạng câu hỏi" {...form.field('questionType')}>
        <select className="adm-select" value={questionType} onChange={(event) => setQuestionType(event.target.value as QuestionDraftType)}>
          <option value="MULTIPLE_CHOICE">Trắc nghiệm</option><option value="TRUE_FALSE_NOT_GIVEN">Đúng / Sai / Không có thông tin</option><option value="FILL_IN_BLANK">Điền từ</option><option value="SHORT_ANSWER">Trả lời ngắn</option>
        </select>
      </AdminField>
      <AdminField label="Số câu" {...form.field('count')}><input className="adm-input" inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} /></AdminField>
      <label className="adm-field"><span>Yêu cầu thêm (không bắt buộc)</span><textarea className="adm-textarea" maxLength={500} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
      <div className="adm-form-footer"><button className="adm-btn" disabled={busy} onClick={onClose} type="button">Đóng</button><button className="adm-btn adm-btn--primary" disabled={busy} type="submit">{busy ? 'Đang gửi…' : 'Sinh câu hỏi'}</button></div>
    </form>}
  </AdminModal>
}
