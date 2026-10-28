import { useState, type FormEvent } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import type { CourseLessonResource } from '../types'
import { useAdminError } from '../../lib/useAdminError'

const LIMIT = 20
const SLIDE_TITLE = 'Slide bài học'
const WEB_LINK = /^https?:\/\/\S+$/i

/**
 * The slide and the documents of a lesson. A lesson has one slide, a single link; its documents are a table with a
 * remove button per row and a small form in a dialog to add one. All are links the learner opens from the lesson page.
 */
export function CourseLessonResources({ value, onChange, disabled }: {
  value: readonly CourseLessonResource[]; onChange: (next: CourseLessonResource[]) => void; disabled: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [, setError] = useAdminError()
  const slide = value.find((item) => item.type === 'SLIDE')
  const documents = value.filter((item) => item.type === 'DOCUMENT')
  const slideBad = !!slide?.url && !WEB_LINK.test(slide.url.trim())

  /** An empty link removes the slide; a typed one replaces it, so there is never more than one. */
  function setSlide(link: string) {
    const others = value.filter((item) => item.type !== 'SLIDE')
    onChange(link === '' ? others : [{ type: 'SLIDE', title: slide?.title ?? SLIDE_TITLE, url: link }, ...others])
  }
  function open() { setTitle(''); setUrl(''); setError(null); setAdding(true) }
  function submit(event: FormEvent, close: () => void) {
    event.preventDefault()
    if (!title.trim()) { setError('Nhập tên cho tài liệu.'); return }
    if (!WEB_LINK.test(url.trim()) || url.trim().length > 2000) { setError('Đường dẫn phải bắt đầu bằng http:// hoặc https://.'); return }
    onChange([...value, { type: 'DOCUMENT', title: title.trim(), url: url.trim() }])
    close()
  }

  return <>
    <label className="adm-field">
      <span>Slide (đường dẫn)</span>
      <input aria-invalid={slideBad} aria-label="Slide (đường dẫn)" className="adm-input" disabled={disabled} inputMode="url" maxLength={2000} onChange={(event) => setSlide(event.target.value.trim())} placeholder="https://docs.google.com/presentation/…/embed" value={slide?.url ?? ''} />
      {slideBad ? <small className="adm-field__error" role="alert">Đường dẫn phải bắt đầu bằng http:// hoặc https://.</small> : null}
    </label>
    <div className="adm-sec">
      <div className="adm-sec__head">
        <h5 className="adm-sec__title">Tài liệu<span className="adm-count">{documents.length}/{LIMIT}</span></h5>
        <button className="adm-btn adm-btn--small" disabled={disabled || value.length >= LIMIT} onClick={open} type="button">Thêm tài liệu</button>
      </div>
      <div className="adm-table-wrap adm-kp-table">
        <table aria-label="Tài liệu của bài" className="adm-table">
          <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Tên</th><th scope="col">Đường dẫn</th><th aria-label="Gỡ" scope="col" /></tr></thead>
          <tbody>{documents.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={4}>Chưa có tài liệu nào.</td></tr> : documents.map((item, index) => <tr key={`${item.url}-${index}`}>
            <td className="adm-stt">{index + 1}</td>
            <td>{item.title}</td>
            <td><a className="adm-link-out" href={item.url} rel="noreferrer" target="_blank">{item.url}<ExternalLink aria-hidden="true" size={13} /></a></td>
            <td className="adm-kp-table__remove"><button aria-label={`Gỡ tài liệu ${item.title}`} disabled={disabled} onClick={() => onChange(value.filter((other) => other !== item))} type="button"><X aria-hidden="true" size={16} /></button></td>
          </tr>)}</tbody>
        </table>
      </div>
      {adding ? <AdminModal title="Thêm tài liệu" description="Học viên mở bằng đường dẫn này" onClose={() => setAdding(false)} stacked>
        {(close) => <form aria-label="Thêm tài liệu" noValidate onSubmit={(event) => submit(event, close)}>
          <label className="adm-field"><span>Tên<span aria-hidden="true" className="adm-required" /></span><input className="adm-input" maxLength={255} onChange={(event) => setTitle(event.target.value)} value={title} /></label>
          <label className="adm-field"><span>Đường dẫn<span aria-hidden="true" className="adm-required" /></span><input className="adm-input" inputMode="url" maxLength={2000} onChange={(event) => setUrl(event.target.value)} placeholder="https://" value={url} /></label>
          <div className="adm-form-footer"><button className="adm-btn" onClick={close} type="button">Đóng</button><button className="adm-btn adm-btn--primary" type="submit">Lưu</button></div>
        </form>}
      </AdminModal> : null}
    </div>
  </>
}
