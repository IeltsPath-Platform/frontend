import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState'
import { adminErrorMessage } from '@/features/admin/lib/adminErrors'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { AdminPage } from '@/features/admin/pages/AdminPage'
import { useAuthSession } from '@/features/auth/authSession'
import { getMyExaminerProfile, saveExaminerProfile } from '../api/examinerDashboardApi'
import { BAND_OPTIONS, profileInput } from '../lib/dashboardLabels'
import { MAX_CERTIFICATES, type Profile, type ProfileInput } from '../types'
import '../examiner-dashboard.css'

interface CertificateRow { key: number; name: string; issuer: string; year: string; score: string }

const YEAR_MIN = 1950
const YEAR_MAX = 2100

/** The form rows back into what the server takes: blank optional fields become null. Returns the first problem instead when a row is wrong. */
function toInput(band: string, accepting: boolean, rows: readonly CertificateRow[]): { input: ProfileInput } | { problem: string } {
  const certificates: ProfileInput['certificates'] = []
  for (const [index, row] of rows.entries()) {
    const label = `Chứng chỉ ${index + 1}`
    if (row.name.trim() === '') return { problem: `${label}: nhập tên chứng chỉ, hoặc xóa dòng này.` }
    const year = row.year.trim() === '' ? null : Number(row.year)
    if (year !== null && (!Number.isInteger(year) || year < YEAR_MIN || year > YEAR_MAX)) {
      return { problem: `${label}: năm phải từ ${YEAR_MIN} đến ${YEAR_MAX}.` }
    }
    certificates.push({ name: row.name.trim(), issuer: row.issuer.trim() || null, year, score: row.score.trim() || null })
  }
  return { input: { ieltsBand: band === '' ? null : Number(band), certificates, acceptingSubmissions: accepting } }
}

function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: (saved: Profile) => void }) {
  const nextKey = useRef(profile.certificates.length)
  const [band, setBand] = useState(profile.ieltsBand == null ? '' : String(profile.ieltsBand))
  const [accepting, setAccepting] = useState(profile.acceptingSubmissions)
  const [rows, setRows] = useState<CertificateRow[]>(() => profileInput(profile).certificates.map((certificate, index) => ({
    key: index,
    name: certificate.name,
    issuer: certificate.issuer ?? '',
    year: certificate.year == null ? '' : String(certificate.year),
    score: certificate.score ?? '',
  })))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const change = (key: number, field: keyof Omit<CertificateRow, 'key'>, value: string) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)))

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = toInput(band, accepting, rows)
    if ('problem' in result) { setMessage({ tone: 'error', text: result.problem }); return }
    setSaving(true)
    setMessage(null)
    try {
      onSaved(await saveExaminerProfile(result.input))
      setMessage({ tone: 'ok', text: 'Đã lưu hồ sơ. Học viên thấy thông tin mới khi chọn người chấm.' })
    } catch (reason) {
      setMessage({ tone: 'error', text: adminErrorMessage(reason) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form aria-label="Hồ sơ giám khảo" className="ex-form" noValidate onSubmit={(event) => { void submit(event) }}>
      <p className="adm-muted">Học viên đọc hồ sơ này khi chọn người chấm bài: tên, band IELTS và chứng chỉ của bạn.</p>
      <label className="adm-field">
        <span>Band IELTS</span>
        <select className="adm-select" onChange={(event) => setBand(event.target.value)} value={band}>
          <option value="">Chưa cập nhật</option>
          {BAND_OPTIONS.map((value) => <option key={value} value={value}>{value.toFixed(1)}</option>)}
        </select>
      </label>
      <label className="ex-switch">
        <input checked={accepting} onChange={(event) => setAccepting(event.target.checked)} type="checkbox" />
        <span>Đang nhận bài mới</span>
      </label>

      <fieldset className="ex-form">
        <legend>Chứng chỉ ({rows.length}/{MAX_CERTIFICATES})</legend>
        {rows.length === 0 ? <p className="adm-muted">Chưa có chứng chỉ nào.</p> : null}
        {rows.map((row, index) => (
          <div aria-label={`Chứng chỉ ${index + 1}`} className="ex-cert" key={row.key} role="group">
            <div className="ex-cert__grid">
              <label className="adm-field">
                <span>Tên chứng chỉ</span>
                <input className="adm-input" maxLength={150} onChange={(event) => change(row.key, 'name', event.target.value)} value={row.name} />
              </label>
              <label className="adm-field">
                <span>Nơi cấp</span>
                <input className="adm-input" maxLength={150} onChange={(event) => change(row.key, 'issuer', event.target.value)} value={row.issuer} />
              </label>
              <label className="adm-field">
                <span>Năm</span>
                <input className="adm-input" inputMode="numeric" max={YEAR_MAX} min={YEAR_MIN} onChange={(event) => change(row.key, 'year', event.target.value)} type="number" value={row.year} />
              </label>
              <label className="adm-field">
                <span>Điểm</span>
                <input className="adm-input" maxLength={20} onChange={(event) => change(row.key, 'score', event.target.value)} value={row.score} />
              </label>
            </div>
            <div>
              <button className="adm-btn adm-btn--small" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} type="button">
                <Trash2 aria-hidden="true" size={14} />Xóa chứng chỉ {index + 1}
              </button>
            </div>
          </div>
        ))}
        <div>
          <button
            className="adm-btn"
            disabled={rows.length >= MAX_CERTIFICATES}
            onClick={() => setRows((current) => [...current, { key: nextKey.current++, name: '', issuer: '', year: '', score: '' }])}
            type="button">
            <Plus aria-hidden="true" size={16} />Thêm chứng chỉ
          </button>
        </div>
      </fieldset>

      {message ? <p className={message.tone === 'ok' ? 'adm-alert' : 'adm-alert adm-alert--error'} role={message.tone === 'ok' ? 'status' : 'alert'}>{message.text}</p> : null}
      <div className="ex-form__actions">
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
        <Link className="adm-btn" to="/admin/examiner">Về tổng quan</Link>
      </div>
    </form>
  )
}

/** The examiner edits what learners see when choosing who grades: band, certificates, and whether new submissions are taken. */
export function ExaminerProfilePage() {
  const { userId } = useAuthSession()
  const profile = useAdminResource(`examiner-profile|${userId ?? ''}`, (signal) => getMyExaminerProfile(userId ?? '', signal))
  const [saved, setSaved] = useState<Profile | null>(null)

  return (
    <AdminPage subtitle="Thông tin học viên thấy khi chọn bạn chấm bài." title="Hồ sơ của tôi">
      {profile.status === 'loading' ? <AdminLoading /> : null}
      {profile.status === 'error' ? <AdminError message={profile.error!} onRetry={profile.reload} /> : null}
      {profile.status === 'success' && profile.data ? <ProfileForm onSaved={setSaved} profile={saved ?? profile.data} /> : null}
    </AdminPage>
  )
}
