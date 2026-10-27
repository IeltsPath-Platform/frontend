import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { deleteAudio, deletePassage, updateAudio, updatePassage, uploadAudio } from '../api/packageApi'
import type { AudioUpload, PackageSection } from '../types'

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
  const [uploaded, setUploaded] = useState<{ value: AudioUpload; generation: number } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  const generation = useRef(0)
  const manualDuration = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; generation.current += 1 }
  }, [section.id, versionId])
  const locked = disabled || pending
  const currentAudio = safeMediaUrl(section.audio?.mediaUrl)
  const uploadedUrl = safeMediaUrl(uploaded?.value.mediaUrl)

  async function mutate(action: () => Promise<unknown>, message: string, after?: () => void) {
    if (locked) return
    setPending(true); setError(null)
    try {
      if (await onMutate(action, message) && mounted.current) { after?.(); onSaved() }
    } finally { if (mounted.current) setPending(false) }
  }

  function savePassage(event: FormEvent) {
    event.preventDefault()
    if (locked) return
    if (!passage.trim() || passage.length > 50000) { setError('Nhập đoạn văn từ 1 đến 50.000 ký tự.'); return }
    void mutate(() => updatePassage(packageId, versionId, section.id, { text: passage }), 'Đã lưu đoạn văn.')
  }

  function saveAudio(event: FormEvent) {
    event.preventDefault()
    if (locked) return
    const seconds = Number(duration)
    if (!reference.trim() || reference.includes('..') || reference.startsWith('/') || reference.includes('\\') || reference.includes('://')) { setError('Nhập key audio hợp lệ, không dùng URL hoặc đường dẫn có “..”.'); return }
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 7200) { setError('Thời lượng audio phải là số nguyên từ 1 đến 7.200 giây.'); return }
    void mutate(() => updateAudio(packageId, versionId, section.id, { mediaReference: reference.trim(), durationSeconds: seconds, transcript: transcript || null }), 'Đã lưu audio.', () => setUploaded(null))
  }

  async function upload() {
    if (locked || !file) return
    if (file.size === 0) { setError('Tệp audio đang rỗng. Chọn tệp khác.'); return }
    if (file.size > 25 * 1024 * 1024) { setError('File lớn hơn 25 MiB. Chọn tệp nhỏ hơn.'); return }
    const currentGeneration = ++generation.current
    setPending(true); setError(null)
    let result: AudioUpload | null = null
    try {
      const succeeded = await onMutate(async () => { result = await uploadAudio(file) }, 'Đã tải audio. Kiểm tra thời lượng rồi bấm Lưu audio để gắn vào phần.')
      if (succeeded && mounted.current && currentGeneration === generation.current && result) {
        const value: AudioUpload = result
        manualDuration.current = false
        setReference(value.mediaReference)
        setDuration('')
        setUploaded({ value, generation: currentGeneration })
      }
    } finally { if (mounted.current && currentGeneration === generation.current) setPending(false) }
  }

  return <div className="adm-package-content">
    {confirmDialog}
    {error ? <div className="adm-alert adm-alert--error" role="alert">{error}</div> : null}
    <form aria-label={`Đoạn văn của ${section.title}`} noValidate onSubmit={savePassage}>
      <h4>Đoạn văn</h4>
      <fieldset className="adm-package-fields" disabled={locked}>
        <label className="adm-field"><span>Nội dung đoạn văn</span><textarea className="adm-textarea" maxLength={50000} value={passage} onChange={(event) => setPassage(event.target.value)} /></label>
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
    <form aria-label={`Audio của ${section.title}`} noValidate onSubmit={saveAudio}>
      <h4>Audio</h4>
      {currentAudio ? <audio controls preload="metadata" src={currentAudio} aria-label={`Nghe audio của ${section.title}`} /> : section.audio ? <p className="adm-muted">Audio chưa có địa chỉ phát hợp lệ. Kiểm tra cấu hình media trước khi xuất bản.</p> : null}
      <fieldset className="adm-package-fields" disabled={locked}>
        <label className="adm-field"><span>File audio</span><input className="adm-input" type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(null) }} /></label>
        <p className="adm-muted">MP3, M4A, WAV hoặc OGG, tối đa 25 MiB. Tải tệp trước, sau đó lưu để gắn audio vào phần.</p>
        <button className="adm-btn" type="button" disabled={!file} onClick={() => void upload()}>{pending ? 'Đang xử lý…' : 'Tải file audio'}</button>
        {uploaded ? <p role="status">Đã tải tệp. {uploadedUrl ? 'Đang đọc thời lượng; bạn có thể nhập tay nếu không đọc được.' : 'Không đọc được địa chỉ phát. Nhập thời lượng bên dưới.'}</p> : null}
        <label className="adm-field"><span>Thời lượng audio (giây)</span><input className="adm-input" required type="number" min={1} max={7200} step={1} value={duration} onChange={(event) => { manualDuration.current = true; setDuration(event.target.value) }} /></label>
        <label className="adm-field"><span>Transcript (tùy chọn)</span><textarea className="adm-textarea" value={transcript} onChange={(event) => setTranscript(event.target.value)} /></label>
        <details><summary>Dùng file có sẵn</summary><label className="adm-field"><span>Key audio</span><input className="adm-input" value={reference} onChange={(event) => { generation.current += 1; setUploaded(null); setReference(event.target.value) }} /></label><p className="adm-muted">Nhập key tệp đã lưu, ví dụ listening/demo/ls1.mp3, và thời lượng ở trên.</p></details>
        <div className="adm-package-actions"><button className="adm-btn" type="submit">Lưu audio</button><button className="adm-btn adm-btn--danger" type="button" disabled={!section.audio} onClick={() => void (async () => {
          if (locked) return
          if (!(await confirm({
            title: 'Gỡ audio khỏi phần này?',
            message: 'Tệp và tài nguyên gốc được giữ lại.',
            confirmLabel: 'Gỡ audio',
            tone: 'danger',
          }))) return
          await mutate(() => deleteAudio(packageId, versionId, section.id), 'Đã gỡ audio.', () => { generation.current += 1; setReference(''); setDuration(''); setTranscript(''); setUploaded(null) })
        })()}>Gỡ audio</button></div>
      </fieldset>
      {uploaded && uploadedUrl ? <audio key={uploaded.generation} hidden preload="metadata" src={uploadedUrl} aria-label="Đọc thời lượng audio tải lên" onLoadedMetadata={(event) => {
        if (!mounted.current || generation.current !== uploaded.generation || manualDuration.current) return
        const seconds = Math.ceil(event.currentTarget.duration)
        if (Number.isFinite(seconds) && seconds >= 1 && seconds <= 7200) setDuration(String(seconds))
      }} /> : null}
    </form>
  </div>
}
