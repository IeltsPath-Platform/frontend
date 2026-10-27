import { useState, type FormEvent } from 'react'
import { createLesson } from '../api/lessonApi'
import { lessonErrorText } from '../lib/lessonErrors'

export function NewLessonForm({ topicId, onCreated, onCancel }: { topicId: string; onCreated: () => void; onCancel: () => void }) {
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!code.trim() || !title.trim()) {
      setError('Cần nhập mã và tiêu đề bài học.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createLesson(topicId, { code: code.trim(), title: title.trim(), summary: summary.trim(), summaryMarkdown: '', estimatedMinutes: null })
      onCreated()
    } catch (reason) {
      setError(lessonErrorText(reason))
      setSaving(false)
    }
  }

  return (
    <form aria-label="Bài học mới" noValidate onSubmit={(event) => void submit(event)}>
      {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
      <div className="adm-filters">
        <label className="adm-field">
          <span>Mã bài học</span>
          <input autoFocus className="adm-input" onChange={(event) => setCode(event.target.value)} value={code} />
        </label>
        <label className="adm-field ls-grow">
          <span>Tiêu đề</span>
          <input className="adm-input" onChange={(event) => setTitle(event.target.value)} value={title} />
        </label>
      </div>
      <label className="adm-field">
        <span>Tóm tắt</span>
        <input className="adm-input" onChange={(event) => setSummary(event.target.value)} value={summary} />
      </label>
      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Hủy</button>
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang tạo…' : 'Tạo bài học nháp'}</button>
      </div>
    </form>
  )
}
