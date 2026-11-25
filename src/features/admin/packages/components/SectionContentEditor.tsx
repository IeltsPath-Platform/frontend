import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { AdminField } from '../../components/AdminField'
import { AdminModal } from '../../components/AdminLayer'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { deleteAudio, deletePassage, updateAudio, updatePassage, uploadAudio } from '../api/packageApi'
import type { PackageSection } from '../types'
import { useAdminError } from '../../lib/useAdminError'

const MAX_AUDIO_BYTES = 25 * 1024 * 1024

function safeMediaUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined }
  catch { return undefined }
}

export function SectionContentEditor({ packageId, versionId, section, disabled, onSaved, onMutate }: {
  packageId: string; versionId: string; section: PackageSection; disabled: boolean; onSaved: () => void
  onMutate: (action: () => Promise<unknown>, message: string) => Promise<boolean>
}) {
  const { confirm, confirmDialog } = useAdminConfirm()
  const [passage, setPassage] = useState(section.passage ?? '')
  const [reference, setReference] = useState(section.audio?.mediaReference ?? '')
  const [duration, setDuration] = useState(section.audio?.durationSeconds?.toString() ?? '')
  const [transcript, setTranscript] = useState(section.audio?.transcript ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [editing, setEditing] = useState<'passage' | 'audio' | null>(null)
  const [, setError] = useAdminError()
  const mounted = useRef(true)
  const manualDuration = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [section.id, versionId])
  const locked = disabled || pending
  const passageSchema = useMemo(() => z.object({ passage: requiredText('Nội dung đoạn văn', 50000) }), [])
  const passageForm = useFormErrors(passageSchema, { passage })
  const audioSchema = useMemo(() => z.object({ reference: z.string(), hasFile: z.boolean(), duration: z.string() }).superRefine((value, ctx) => {
    if (!value.hasFile && value.reference.trim() === '') ctx.addIssue({ code: 'custom', path: ['reference'], message: 'Chọn file audio.' })
    const seconds = Number(value.duration)
    if (value.duration.trim() === '') ctx.addIssue({ code: 'custom', path: ['duration'], message: 'Thời lượng audio không được để trống.' })
    else if (!Number.isInteger(seconds) || seconds < 1 || seconds > 7200) ctx.addIssue({ code: 'custom', path: ['duration'], message: 'Thời lượng audio phải là số nguyên từ 1 đến 7.200 giây.' })
  }), [])
  const audioForm = useFormErrors(audioSchema, { reference, hasFile: !!file, duration })
  const fileError = file ? file.size === 0 ? 'Tệp audio đang rỗng. Chọn tệp khác.' : file.size > MAX_AUDIO_BYTES ? 'File lớn hơn 25 MiB. Chọn tệp nhỏ hơn.' : undefined : undefined
  const currentAudio = safeMediaUrl(section.audio?.mediaUrl)

  async function mutate(action: () => Promise<unknown>, message: string, after?: () => void) {
    if (locked) return
    setPending(true); setError(null)
    try {
      if (await onMutate(action, message) && mounted.current) { after?.(); setEditing(null); onSaved() }
    } finally { if (mounted.current) setPending(false) }
  }

  function savePassage(event: FormEvent) {
    event.preventDefault()
    if (locked) return
    if (!passageForm.validate()) return
    void mutate(() => updatePassage(packageId, versionId, section.id, { text: passage }), 'Đã lưu đoạn văn.')
  }

  function saveAudio(event: FormEvent) {
    event.preventDefault()
    if (locked) return
    if (!audioForm.validate()) return
    const seconds = Number(duration)
    // A chosen file is uploaded first and its key attached in the same save; without one the stored key is kept.
    let mediaReference = reference.trim()
    void mutate(async () => {
      if (file) mediaReference = (await uploadAudio(file)).mediaReference
      await updateAudio(packageId, versionId, section.id, { mediaReference, durationSeconds: seconds, transcript: transcript || null })
    }, 'Đã lưu audio.', () => { setFile(null); setReference(mediaReference) })
  }

  // The length is read from the chosen file in the browser, so the author rarely types it.
  function chooseFile(chosen: File | null) {
    setFile(chosen); setError(null)
    manualDuration.current = false
    if (!chosen) return
    const url = URL.createObjectURL(chosen)
    const probe = document.createElement('audio')
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => {
      const seconds = Math.ceil(probe.duration)
      if (mounted.current && !manualDuration.current && Number.isFinite(seconds) && seconds >= 1 && seconds <= 7200) setDuration(String(seconds))
      URL.revokeObjectURL(url)
    }
    probe.onerror = () => URL.revokeObjectURL(url)
    probe.src = url
  }

  // Listening takes audio and its transcript, Reading takes a passage, Writing takes neither (its prompt is the question's
  // image); a section with no skill chosen offers both, and a stored audio or passage stays visible so it can be removed,
  // except on Writing, where an old text copy of the chart is left out.
  const showPassage = !section.skill || section.skill === 'READING' || (section.skill !== 'WRITING' && !!section.passage)
  const showAudio = !section.skill || section.skill === 'LISTENING' || !!section.audio
  if (!showPassage && !showAudio) return null
  const passageFormElement = <form aria-label={`Đoạn văn của ${section.title}`} noValidate onSubmit={savePassage}>
      <fieldset className="adm-package-fields" disabled={locked}>
        <AdminField label="Nội dung đoạn văn" {...passageForm.field('passage')}><textarea className="adm-textarea" maxLength={50000} value={passage} onChange={(event) => setPassage(event.target.value)} /></AdminField>
        <p className="adm-muted">{passage.length.toLocaleString('vi-VN')}/50.000 ký tự</p>
        <div className="adm-package-actions"><button className="adm-btn" type="submit">Lưu đoạn văn</button><button className="adm-btn adm-btn--danger" type="button" disabled={!section.passage} onClick={() => void (async () => {
          if (locked) return
          if (!(await confirm({
            title: 'Gỡ đoạn văn khỏi phần này?',
            message: 'Tài nguyên gốc được giữ lại.',
            confirmLabel: 'Gỡ đoạn văn',
            tone: 'danger',
          }))) return
          await mutate(() => deletePassage(packageId, versionId, section.id), 'Đã gỡ đoạn văn.', () => setPassage(''))
        })()}>Gỡ đoạn văn</button></div>
      </fieldset>
    </form>
  const audioFormElement = <form aria-label={`Audio của ${section.title}`} noValidate onSubmit={saveAudio}>
      <fieldset className="adm-package-fields" disabled={locked}>
        <AdminField label="File audio" error={fileError ?? audioForm.field('reference').error}><input className="adm-input" type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} /></AdminField>
        <AdminField label="Thời lượng audio (giây)" {...audioForm.field('duration')} required><input className="adm-input" type="number" min={1} max={7200} step={1} value={duration} onChange={(event) => { manualDuration.current = true; setDuration(event.target.value) }} /></AdminField>
        <label className="adm-field"><span>Transcript (tùy chọn)</span><textarea className="adm-textarea" value={transcript} onChange={(event) => setTranscript(event.target.value)} /></label>
        <div className="adm-package-actions"><button className="adm-btn" type="submit" disabled={!!fileError}>{pending ? 'Đang lưu…' : 'Lưu audio'}</button><button className="adm-btn adm-btn--danger" type="button" disabled={!section.audio} onClick={() => void (async () => {
          if (locked) return
          if (!(await confirm({
            title: 'Gỡ audio khỏi phần này?',
            message: 'Tệp và tài nguyên gốc được giữ lại.',
            confirmLabel: 'Gỡ audio',
            tone: 'danger',
          }))) return
          await mutate(() => deleteAudio(packageId, versionId, section.id), 'Đã gỡ audio.', () => { setFile(null); setReference(''); setDuration(''); setTranscript('') })
        })()}>Gỡ audio</button></div>
      </fieldset>
    </form>

  // The section shows what it holds; changing it happens in a dialog opened from here.
  return <div className="adm-package-content">
    {confirmDialog}
    {showAudio ? <div className="adm-pe-media">
      <h4>Audio</h4>
      {currentAudio ? <audio controls preload="metadata" src={currentAudio} aria-label={`Nghe audio của ${section.title}`} /> : section.audio ? <p className="adm-muted">Audio chưa có địa chỉ phát hợp lệ. Kiểm tra cấu hình media trước khi xuất bản.</p> : <p className="adm-muted">Phần chưa có audio.</p>}
      {section.audio?.transcript ? <details><summary>Transcript</summary><p className="adm-pe-media__text">{section.audio.transcript}</p></details> : null}
      {!disabled ? <button className="adm-btn adm-btn--small" type="button" onClick={() => setEditing('audio')}>{section.audio ? 'Sửa audio' : 'Thêm audio'}</button> : null}
    </div> : null}
    {showPassage ? <div className="adm-pe-media">
      <h4>Đoạn văn</h4>
      {section.passage ? <p className="adm-pe-media__text">{section.passage}</p> : <p className="adm-muted">Phần chưa có đoạn văn.</p>}
      {!disabled ? <button className="adm-btn adm-btn--small" type="button" onClick={() => setEditing('passage')}>{section.passage ? 'Sửa đoạn văn' : 'Thêm đoạn văn'}</button> : null}
    </div> : null}
    {editing === 'audio' && showAudio ? <AdminModal onClose={() => setEditing(null)} stacked top title="Audio của phần" description={section.title}>{() => audioFormElement}</AdminModal> : null}
    {editing === 'passage' && showPassage ? <AdminModal onClose={() => setEditing(null)} stacked top title="Đoạn văn của phần" description={section.title}>{() => passageFormElement}</AdminModal> : null}
  </div>
}
