import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AdminPage } from '../../pages/AdminPage'
import '../packages.css'

export function PackagesPage() {
  const [id, setId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  function open(event: FormEvent) {
    event.preventDefault()
    const parsed = z.uuid().safeParse(id.trim())
    if (!parsed.success) { setError('Nhập ID gói hợp lệ (UUID).'); return }
    navigate(`/content-author/packages/${parsed.data}`)
  }
  return <AdminPage title="Đề & gói câu hỏi" subtitle="Mở một gói có sẵn để soạn phiên bản và các phần của đề.">
    <div className="adm-package-workspace">
      <p className="adm-muted">Danh sách gói và tạo gói mới: Chờ backend. Nếu đã biết ID gói, bạn có thể mở trực tiếp bên dưới.</p>
      <div className="adm-package-actions"><button className="adm-btn" disabled title="Chờ backend" type="button">Danh sách gói · Chờ backend</button><button className="adm-btn" disabled title="Chờ backend" type="button">Tạo gói mới · Chờ backend</button></div>
      <form className="adm-card" aria-label="Mở gói có sẵn" noValidate onSubmit={open}>
        <h2>Mở gói có sẵn</h2>
        <label className="adm-field"><span>ID gói (UUID)</span><input className="adm-input" value={id} onChange={(event) => setId(event.target.value)} required autoCapitalize="none" spellCheck={false} /></label>
        {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
        <button className="adm-btn adm-btn--primary" type="submit">Mở gói</button>
      </form>
    </div>
  </AdminPage>
}
