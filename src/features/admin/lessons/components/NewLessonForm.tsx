import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { AdminField } from '../../components/AdminField'
import { createLesson } from '../api/lessonApi'
import { lessonErrorText } from '../lib/lessonErrors'
import { useAdminError } from '../../lib/useAdminError'
import { requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'

const schema = z.object({ code: requiredText('Mã bài học', 100), title: requiredText('Tiêu đề bài học', 255) })

export function NewLessonForm({ topicId, onCreated, onCancel }: { topicId: string; onCreated: () => void; onCancel: () => void }) {
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [, setError] = useAdminError()
  const [saving, setSaving] = useState(false)
  const form = useFormErrors(schema, { code, title })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.validate()) return
    setSaving(true)
    setError(null)
    try {
      await createLesson(topicId, { code: code.trim(), title: title.trim(), summary: '', summaryMarkdown: '', estimatedMinutes: null })
      onCreated()
    } catch (reason) {
      setError(lessonErrorText(reason))
      setSaving(false)
    }
  }

  return (
    <form aria-label="Bài học mới" noValidate onSubmit={(event) => void submit(event)}>
      <div className="adm-filters adm-filters--fields">
        <AdminField label="Mã bài học" {...form.field('code')}>
          <input autoFocus className="adm-input" maxLength={100} onChange={(event) => setCode(event.target.value)} value={code} />
        </AdminField>
        <AdminField className="ls-grow" label="Tiêu đề" {...form.field('title')}>
          <input className="adm-input" maxLength={255} onChange={(event) => setTitle(event.target.value)} value={title} />
        </AdminField>
      </div>
      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Hủy</button>
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang tạo…' : 'Tạo bài học nháp'}</button>
      </div>
    </form>
  )
}
