import { useState, type FormEvent } from 'react'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminResource } from '../../lib/useAdminResource'
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

/** Gives a learner a Premium plan for a number of days, optionally with examiner grading credits. */
export function GrantPremiumForm({ user, onCancel, onDone }: FormProps) {
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const plans = useAdminResource('access-plans', (signal) => accessAdminApi.listPlans(signal))
  const activePlans = (plans.data ?? []).filter((plan) => plan.status === 'ACTIVE')
  const [planId, setPlanId] = useState('')
  const [days, setDays] = useState('30')
  const [credits, setCredits] = useState('0')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const chosenPlan = planId || activePlans[0]?.id || ''

  async function submit(event: FormEvent) {
    event.preventDefault()
    const durationDays = Number(days)
    const humanGradingCredits = Number(credits)
    if (!chosenPlan) return setError('Chọn gói cần cấp.')
    if (!Number.isInteger(durationDays) || durationDays < 1) return setError('Thời hạn phải là số ngày, tối thiểu 1.')
    if (!Number.isInteger(humanGradingCredits) || humanGradingCredits < 0) return setError('Số lượt chấm bởi giám khảo không được âm.')
    setSaving(true)
    setError('')
    try {
      const result = await accessAdminApi.grantSubscription({ userId: user.id, planId: chosenPlan, durationDays, humanGradingCredits }, idempotencyKey)
      onDone(`Đã cấp ${result.planName}${result.endsAt ? ` đến ${new Date(result.endsAt).toLocaleDateString('vi-VN')}` : ''}.`)
    } catch (reasonError) {
      setError(adminErrorMessage(reasonError))
    } finally {
      setSaving(false)
    }
  }

  if (plans.status === 'loading') return <AdminLoading label="Đang tải danh sách gói…" />
  if (plans.status === 'error') return <AdminError message={plans.error ?? 'Không tải được danh sách gói.'} onRetry={plans.reload} />

  return (
    <form className="um-form" noValidate onSubmit={submit}>
      {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
      <label className="adm-field">
        <span>Gói</span>
        <select className="adm-select" onChange={(event) => setPlanId(event.target.value)} value={chosenPlan}>
          {activePlans.length === 0 ? <option value="">Chưa có gói nào đang bán</option> : null}
          {activePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
        </select>
      </label>
      <label className="adm-field">
        <span>Thời hạn (ngày)</span>
        <input className="adm-input" inputMode="numeric" onChange={(event) => setDays(event.target.value)} value={days} />
      </label>
      <label className="adm-field">
        <span>Lượt chấm bởi giám khảo</span>
        <input className="adm-input" inputMode="numeric" onChange={(event) => setCredits(event.target.value)} value={credits} />
      </label>
      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onCancel} type="button">Hủy</button>
        <button className="adm-btn adm-btn--primary" disabled={saving || !chosenPlan} type="submit">{saving ? 'Đang cấp…' : 'Cấp gói'}</button>
      </div>
    </form>
  )
}
