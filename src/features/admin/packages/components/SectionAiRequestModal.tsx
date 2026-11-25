import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AdminField } from '../../components/AdminField'
import { AdminModal } from '../../components/AdminLayer'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { getAiAllowance, requestSectionQuestions } from '../api/sectionDraftApi'
import { sectionQuestionRequestSchema } from '../../ai-drafts/types'
import type { PackageSection } from '../types'
import { HttpError } from '@/lib/httpClient'
import { aiDraftError } from '../../ai-drafts/lib/aiDraftLabels'

const QUESTION_OPTIONS = {
  LISTENING: [['MULTIPLE_CHOICE', 'Trắc nghiệm'], ['FILL_IN_BLANK', 'Điền từ'], ['SHORT_ANSWER', 'Trả lời ngắn']],
  READING: [['MULTIPLE_CHOICE', 'Trắc nghiệm'], ['FILL_IN_BLANK', 'Điền từ'], ['SHORT_ANSWER', 'Trả lời ngắn'], ['TRUE_FALSE_NOT_GIVEN', 'Đúng/Sai/Không có thông tin']],
} as const

export function SectionAiRequestModal({ packageId, versionId, section, onClose, onCreated }: {
  packageId: string; versionId: string; section: PackageSection; onClose: () => void; onCreated: (draftId: string) => void
}) {
  const options = section.skill === 'LISTENING' || section.skill === 'READING' ? QUESTION_OPTIONS[section.skill] : []
  const [questionType, setQuestionType] = useState<string>(options[0]?.[0] ?? '')
  const [count, setCount] = useState(Math.max(1, Math.min(10, (section.skill === 'READING' ? 13 : 10) - section.questions.length)))
  const [instructions, setInstructions] = useState('')
  const [allowance, setAllowance] = useState<{ limit: number; used: number; remaining: number } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const schema = useMemo(() => sectionQuestionRequestSchema.pick({ questionType: true, count: true, instructions: true }), [])
  const form = useFormErrors(schema, { questionType, count, instructions })
  useEffect(() => { const controller = new AbortController(); void getAiAllowance(controller.signal).then(setAllowance).catch(() => setAllowance(null)); return () => controller.abort() }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending || !form.validate()) return
    setPending(true); setError(null)
    try {
      const parsed = sectionQuestionRequestSchema.parse({ packageId, versionId, sectionId: section.id,
        questionType, count, instructions: instructions.trim() || null })
      const draft = await requestSectionQuestions(parsed)
      onCreated(draft.id)
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409 && reason.code === 'SECTION_DRAFT_OPEN') {
        const body = reason.body as { details?: { draftId?: unknown } } | null
        if (typeof body?.details?.draftId === 'string') {
          onCreated(body.details.draftId)
          return
        }
      }
      setError(aiDraftError(reason))
    } finally { setPending(false) }
  }
  return <AdminModal onClose={onClose} title="Sinh câu hỏi bằng AI" stacked top>
    {() => <form className="adm-form" noValidate onSubmit={(event) => void submit(event)}>
      <fieldset className="adm-form__fields" disabled={pending}>
        <AdminField label="Dạng câu hỏi" {...form.field('questionType')}>
          <select className="adm-select" value={questionType} onChange={(event) => setQuestionType(event.target.value)}>
            {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </AdminField>
        <AdminField label="Số câu" {...form.field('count')}>
          <input className="adm-input" type="number" min={1} max={10} value={count} onChange={(event) => setCount(Number(event.target.value))} />
        </AdminField>
        <AdminField label="Ghi chú" {...form.field('instructions')}>
          <textarea className="adm-textarea" maxLength={500} value={instructions} onChange={(event) => setInstructions(event.target.value)} />
        </AdminField>
      </fieldset>
      <p className="adm-ai-allowance">Còn {allowance?.remaining ?? '—'}/{allowance?.limit ?? 20} lượt hôm nay</p>
      {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
      <div className="adm-form-footer">
        <button className="adm-btn" type="button" disabled={pending} onClick={onClose}>Hủy</button>
        <button className="adm-btn adm-btn--primary" type="submit" disabled={pending || allowance?.remaining === 0 || !options.length}>{pending ? 'Đang gửi…' : 'Sinh câu hỏi'}</button>
      </div>
    </form>}
  </AdminModal>
}
