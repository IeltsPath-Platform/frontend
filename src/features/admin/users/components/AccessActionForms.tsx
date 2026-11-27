import { useState, type FormEvent } from 'react'
import { adminErrorMessage } from '../../lib/adminErrors'
import { accessAdminApi } from '../api/accessAdminApi'
import type { User } from '../types'

const REASON_MAX = 500

interface FormProps {
  user: User
  onCancel: () => void
  onDone: (message: string) => void
}

/**
 * Adds or removes points by hand, with a reason kept in the ledger. The key is made when the form opens, so sending
 * again after a timeout repeats the same request instead of moving the points twice.
 */
export function AdjustPointsForm({ user, onCancel, onDone }: FormProps) {
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const amount = Number(delta)
    if (!Number.isInteger(amount) || amount === 0) return setError('Nhập số điểm là số nguyên khác 0, số âm để trừ điểm.')
    if (!reason.trim()) return setError('Nhập lý do điều chỉnh để lưu vào lịch sử điểm.')
    setSaving(true)
    setError('')
    try {
      const result = await accessAdminApi.adjustPoints({ userId: user.id, delta: amount, reason: reason.trim(), idempotencyKey })
      onDone(`Đã ${amount > 0 ? 'cộng' : 'trừ'} ${Math.abs(amount)} điểm. Số dư mới: ${result.balanceAfter}.`)
    } catch (reasonError) {
      setError(adminErrorMessage(reasonError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="um-form" noValidate onSubmit={submit}>
      {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
      <label className="adm-field">
        <span>Số điểm (âm để trừ)</span>
        <input className="adm-input" inputMode="numeric" onChange={(event) => setDelta(event.target.value)} placeholder="Ví dụ: 50 hoặc -20" value={delta} />
      </label>
      <label className="adm-field">
        <span>Lý do</span>
        <textarea className="adm-input" maxLength={REASON_MAX} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Hoàn điểm do lỗi chấm bài ngày 25/11" rows={3} value={reason} />
      </label>
      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Hủy</button>
        <button className="adm-btn adm-btn--primary" disabled={saving} type="submit">{saving ? 'Đang lưu…' : 'Điều chỉnh điểm'}</button>
      </div>
    </form>
  )
}
