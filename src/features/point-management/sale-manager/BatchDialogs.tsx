import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { managerApi } from '../api/pointApi'
import { splitEvenly } from '../data/selectors'
import type { BatchDto, SaleDto } from '../data/types'
import { formatNumber } from '../shared/format'

function digitsOf(text: string): number {
  return Number(text.replace(/\D/g, ''))
}

/** The message a refused action shows inside its dialog: the server's own Vietnamese sentence. */
function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback
}

function AllocateBody({ batch, onClose, onDone }: {
  batch: BatchDto
  onClose: () => void
  onDone: (message: string) => void
}) {
  const sales = useAdminResource('point-sales', (signal) => managerApi.sales(signal))
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const active = (sales.data ?? []).filter((sale) => sale.active)
  const pool = batch.pool
  const added = active.map((sale) => digitsOf(amounts[sale.id] ?? ''))
  const total = added.reduce((sum, value) => sum + value, 0)
  const over = total > pool

  function splitAll() {
    const parts = splitEvenly(pool, active.length)
    setAmounts(Object.fromEntries(active.map((sale, index) => [sale.id, String(parts[index])])))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      await managerApi.allocate(batch.code, active
        .map((sale, index) => ({ saleId: sale.id, quantity: added[index] }))
        .filter((line) => line.quantity > 0))
      onDone(`Đã phân bổ ${formatNumber(total)} key cho sale.`)
      onClose()
    } catch (cause) {
      setError(messageOf(cause, 'Chưa phân bổ được key. Vui lòng thử lại.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-theme pm-dialog">
      <DialogHeader>
        <DialogTitle>Phân bổ key cho sale</DialogTitle>
        <DialogDescription>
          Đợt {batch.code} · còn <strong>{formatNumber(pool)} key</strong> chưa phân bổ
        </DialogDescription>
      </DialogHeader>
      {sales.status === 'loading' ? <p role="status">Đang tải danh sách sale…</p> : null}
      {sales.status === 'error' ? <p className="adm-field__error" role="alert">{sales.error}</p> : null}
      {sales.status === 'success' ? (
        <div className="adm-table-wrap">
          <table className="adm-table pm-table">
            <thead>
              <tr><th scope="col">Nhân viên sale</th><th scope="col">Đang giữ</th><th scope="col">Thêm</th><th scope="col">Sau phân bổ</th></tr>
            </thead>
            <tbody>
              {active.map((sale: SaleDto, index) => (
                <tr key={sale.id}>
                  <td className="pm-strong">{sale.displayName}</td>
                  <td>{formatNumber(sale.held)}</td>
                  <td>
                    <input
                      aria-label={`Thêm cho ${sale.displayName}`}
                      className="adm-input pm-qty"
                      inputMode="numeric"
                      onChange={(event) => setAmounts({ ...amounts, [sale.id]: event.target.value.replace(/\D/g, '') })}
                      value={amounts[sale.id] ?? ''}
                    />
                  </td>
                  <td className="pm-strong">{formatNumber(sale.held + added[index])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className={`pm-total${over ? ' is-over' : ''}`} role="status">
        Đã chọn {formatNumber(total)} / {formatNumber(pool)} key chưa phân bổ ·{' '}
        {over ? `Vượt ${formatNumber(total - pool)} key` : `Còn lại ${formatNumber(pool - total)}`}
      </p>
      {error ? <p className="adm-field__error" role="alert">{error}</p> : null}
      <div className="pm-dialog__actions pm-dialog__actions--split">
        <button className="adm-btn" disabled={pool === 0 || active.length === 0} onClick={splitAll} type="button">Chia đều</button>
        <span className="pm-inline">
          <button className="adm-btn" disabled={saving} onClick={onClose} type="button">Hủy</button>
          <button className="adm-btn adm-btn--primary" disabled={total === 0 || over || saving} onClick={() => void save()} type="button">
            {saving ? 'Đang lưu…' : 'Lưu phân bổ'}
          </button>
        </span>
      </div>
    </div>
  )
}

export function AllocateDialog({ batch, open, onClose, onDone }: {
  batch: BatchDto
  open: boolean
  onClose: () => void
  onDone: (message: string) => void
}) {
  return (
    <Dialog onOpenChange={(next) => { if (!next) onClose() }} open={open}>
      <DialogContent className="max-w-2xl">
        {open ? <AllocateBody batch={batch} onClose={onClose} onDone={onDone} /> : null}
      </DialogContent>
    </Dialog>
  )
}

/** Asks before keys are taken back; a key already activated is never touched. */
export function ConfirmRevokeDialog({ count, open, onConfirm, onClose }: {
  count: number
  open: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function confirm() {
    setSaving(true)
    setError('')
    try {
      await onConfirm()
    } catch (cause) {
      setError(messageOf(cause, 'Chưa thu hồi được key. Vui lòng thử lại.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog onOpenChange={(next) => { if (!next) onClose() }} open={open}>
      <DialogContent>
        <div className="adm-theme pm-dialog">
          <DialogHeader>
            <DialogTitle>Thu hồi {formatNumber(count)} key?</DialogTitle>
            <DialogDescription>
              Key đã kích hoạt không bị ảnh hưởng. Key đã thu hồi không dùng lại được và việc này ghi vào nhật ký.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="adm-field__error" role="alert">{error}</p> : null}
          <div className="pm-dialog__actions">
            <button className="adm-btn" disabled={saving} onClick={onClose} type="button">Hủy</button>
            <button className="adm-btn adm-btn--primary" disabled={count === 0 || saving} onClick={() => void confirm()} type="button">
              Thu hồi {formatNumber(count)} key
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReassignBody({ count, onConfirm, onClose }: {
  count: number
  onConfirm: (saleId: string) => Promise<void>
  onClose: () => void
}) {
  const sales = useAdminResource('point-sales', (signal) => managerApi.sales(signal))
  const active = (sales.data ?? []).filter((sale) => sale.active)
  const [saleId, setSaleId] = useState('')
  const chosen = saleId || active[0]?.id || ''
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function confirm() {
    setSaving(true)
    setError('')
    try {
      await onConfirm(chosen)
    } catch (cause) {
      setError(messageOf(cause, 'Chưa chuyển được key. Vui lòng thử lại.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-theme pm-dialog">
      <DialogHeader>
        <DialogTitle>Cân lại sale</DialogTitle>
        <DialogDescription>Chuyển {formatNumber(count)} key Sẵn sàng đã chọn sang một sale khác.</DialogDescription>
      </DialogHeader>
      <label className="adm-field">
        <span>Chuyển cho</span>
        <select className="adm-select" onChange={(event) => setSaleId(event.target.value)} value={chosen}>
          {active.map((sale) => <option key={sale.id} value={sale.id}>{sale.displayName}</option>)}
        </select>
      </label>
      {error ? <p className="adm-field__error" role="alert">{error}</p> : null}
      <div className="pm-dialog__actions">
        <button className="adm-btn" disabled={saving} onClick={onClose} type="button">Hủy</button>
        <button className="adm-btn adm-btn--primary" disabled={count === 0 || !chosen || saving} onClick={() => void confirm()} type="button">
          Chuyển key
        </button>
      </div>
    </div>
  )
}

export function ReassignDialog({ count, open, onConfirm, onClose }: {
  count: number
  open: boolean
  onConfirm: (saleId: string) => Promise<void>
  onClose: () => void
}) {
  return (
    <Dialog onOpenChange={(next) => { if (!next) onClose() }} open={open}>
      <DialogContent>
        {open ? <ReassignBody count={count} onClose={onClose} onConfirm={onConfirm} /> : null}
      </DialogContent>
    </Dialog>
  )
}
