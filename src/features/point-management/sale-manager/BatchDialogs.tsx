import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { managerStatusOf } from '../data/selectors'
import { allocateKeys, splitEvenly, usePointState } from '../data/store'
import type { Batch } from '../data/types'
import { formatNumber } from '../shared/format'

function digitsOf(text: string): number {
  return Number(text.replace(/\D/g, ''))
}

function AllocateBody({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const { keys, sales } = usePointState()
  const activeSales = sales.filter((sale) => sale.active)
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const stock = useMemo(() => {
    let pool = 0
    const held = new Map<string, number>()
    for (const key of keys) {
      if (key.batch !== batch.code) continue
      if (managerStatusOf(key) === 'READY') pool += 1
      if (key.saleId && key.status !== 'REVOKED') held.set(key.saleId, (held.get(key.saleId) ?? 0) + 1)
    }
    return { pool, held }
  }, [keys, batch.code])

  const added = activeSales.map((sale) => digitsOf(amounts[sale.id] ?? ''))
  const total = added.reduce((sum, value) => sum + value, 0)
  const over = total > stock.pool

  function splitAll() {
    const parts = splitEvenly(stock.pool, activeSales.length)
    setAmounts(Object.fromEntries(activeSales.map((sale, index) => [sale.id, String(parts[index])])))
  }

  function save() {
    allocateKeys(batch.code, Object.fromEntries(activeSales.map((sale, index) => [sale.id, added[index]])))
    onClose()
  }

  return (
    <div className="adm-theme pm-dialog">
      <DialogHeader>
        <DialogTitle>Phân bổ key cho sale</DialogTitle>
        <DialogDescription>
          Đợt {batch.code} · còn <strong>{formatNumber(stock.pool)} key</strong> sẵn sàng chưa phân bổ
        </DialogDescription>
      </DialogHeader>
      <div className="adm-table-wrap">
        <table className="adm-table pm-table">
          <thead>
            <tr><th scope="col">Nhân viên sale</th><th scope="col">Đang giữ</th><th scope="col">Thêm</th><th scope="col">Sau phân bổ</th></tr>
          </thead>
          <tbody>
            {activeSales.map((sale, index) => {
              const holding = stock.held.get(sale.id) ?? 0
              return (
                <tr key={sale.id}>
                  <td className="pm-strong">{sale.name}</td>
                  <td>{formatNumber(holding)}</td>
                  <td>
                    <input
                      aria-label={`Thêm cho ${sale.name}`}
                      className="adm-input pm-qty"
                      inputMode="numeric"
                      onChange={(event) => setAmounts({ ...amounts, [sale.id]: event.target.value.replace(/\D/g, '') })}
                      value={amounts[sale.id] ?? ''}
                    />
                  </td>
                  <td className="pm-strong">{formatNumber(holding + added[index])}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className={`pm-total${over ? ' is-over' : ''}`} role="status">
        Đã chọn {formatNumber(total)} / {formatNumber(stock.pool)} key chưa phân bổ ·{' '}
        {over ? `Vượt ${formatNumber(total - stock.pool)} key` : `Còn lại ${formatNumber(stock.pool - total)}`}
      </p>
      <p className="pm-note">
        Key được lấy theo thứ tự tạo. Chỉ phân bổ được key Sẵn sàng. Rút key đã phân bổ về kho chung chỉ được khi sale chưa cấp key đó.
      </p>
      <div className="pm-dialog__actions pm-dialog__actions--split">
        <button className="adm-btn" disabled={stock.pool === 0} onClick={splitAll} type="button">Chia đều</button>
        <span className="pm-inline">
          <button className="adm-btn" onClick={onClose} type="button">Hủy</button>
          <button className="adm-btn adm-btn--primary" disabled={total === 0 || over} onClick={save} type="button">Lưu phân bổ</button>
        </span>
      </div>
    </div>
  )
}

export function AllocateDialog({ batch, open, onClose }: { batch: Batch; open: boolean; onClose: () => void }) {
  return (
    <Dialog onOpenChange={(next) => { if (!next) onClose() }} open={open}>
      <DialogContent className="max-w-2xl">
        {open ? <AllocateBody batch={batch} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  )
}

/** Asks before keys are taken back; a key already activated is never touched. */
export function ConfirmRevokeDialog({ count, open, onConfirm, onClose }: {
  count: number
  open: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog onOpenChange={(next) => { if (!next) onClose() }} open={open}>
      <DialogContent>
        <div className="adm-theme pm-dialog">
          <DialogHeader>
            <DialogTitle>Thu hồi {formatNumber(count)} key?</DialogTitle>
            <DialogDescription>
              Key đã kích hoạt không bị ảnh hưởng. Key đã thu hồi không dùng lại được và việc này ghi vào Nhật ký.
            </DialogDescription>
          </DialogHeader>
          <div className="pm-dialog__actions">
            <button className="adm-btn" onClick={onClose} type="button">Hủy</button>
            <button className="adm-btn adm-btn--primary" disabled={count === 0} onClick={onConfirm} type="button">Thu hồi {formatNumber(count)} key</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReassignBody({ count, onConfirm, onClose }: { count: number; onConfirm: (saleId: string) => void; onClose: () => void }) {
  const { sales } = usePointState()
  const activeSales = sales.filter((sale) => sale.active)
  const [saleId, setSaleId] = useState(activeSales[0]?.id ?? '')
  return (
    <div className="adm-theme pm-dialog">
      <DialogHeader>
        <DialogTitle>Cân lại sale</DialogTitle>
        <DialogDescription>Chuyển {formatNumber(count)} key Sẵn sàng đã chọn sang một sale khác.</DialogDescription>
      </DialogHeader>
      <label className="adm-field">
        <span>Chuyển cho</span>
        <select className="adm-select" onChange={(event) => setSaleId(event.target.value)} value={saleId}>
          {activeSales.map((sale) => <option key={sale.id} value={sale.id}>{sale.name}</option>)}
        </select>
      </label>
      <div className="pm-dialog__actions">
        <button className="adm-btn" onClick={onClose} type="button">Hủy</button>
        <button className="adm-btn adm-btn--primary" disabled={count === 0 || !saleId} onClick={() => onConfirm(saleId)} type="button">Chuyển key</button>
      </div>
    </div>
  )
}

export function ReassignDialog({ count, open, onConfirm, onClose }: {
  count: number
  open: boolean
  onConfirm: (saleId: string) => void
  onClose: () => void
}) {
  return (
    <Dialog onOpenChange={(next) => { if (!next) onClose() }} open={open}>
      <DialogContent>{open ? <ReassignBody count={count} onClose={onClose} onConfirm={onConfirm} /> : null}</DialogContent>
    </Dialog>
  )
}
