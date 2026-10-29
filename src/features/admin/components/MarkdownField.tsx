import { useId, useState, type ReactNode } from 'react'
import { Eye } from 'lucide-react'
import { LessonSummary } from '@/features/learning-path/components/resources/LessonSummary'
import { AdminModal } from './AdminLayer'
import '@/features/learning-path/learning-path.css'
import '@/features/learning-path/lesson-resources.css'

/**
 * A Markdown text area with a "Xem trước" button that opens the text in a dialog the way a learner reads a lesson
 * summary, so the `##` headings, lists and tables can be checked before saving. `preview` replaces the learner's view
 * when what the learner sees is more than the text alone.
 */
export function MarkdownField({ label, value, onChange, maxLength, disabled = false, textareaClassName = 'adm-textarea', preview }: {
  label: string
  value: string
  onChange: (next: string) => void
  maxLength?: number
  disabled?: boolean
  textareaClassName?: string
  preview?: (markdown: string) => ReactNode
}) {
  const id = useId()
  const [previewing, setPreviewing] = useState(false)
  return <div className="adm-mdfield">
    <div className="adm-mdfield__bar">
      <label htmlFor={id}>{label}</label>
      <button className="adm-btn adm-btn--small" onClick={() => setPreviewing(true)} type="button"><Eye aria-hidden="true" size={14} />Xem trước</button>
    </div>
    <textarea className={textareaClassName} disabled={disabled} id={id} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} value={value} />
    {previewing ? <AdminModal description="Như người học sẽ thấy trên trang bài học" onClose={() => setPreviewing(false)} stacked title="Xem trước tóm tắt">
      {() => <div className="adm-mdfield__preview lp-tokens">{preview ? preview(value) : <LessonSummary markdown={value} />}</div>}
    </AdminModal> : null}
  </div>
}
