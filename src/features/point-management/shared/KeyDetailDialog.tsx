import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePointState } from '../data/store'
import type { KeyRecord } from '../data/types'
import { copyText } from './copy-text'
import { formatDate, formatDateTime, maskCode } from './format'
import { SaleStatusBadge } from './StatusBadge'

function Body({ keyRecord }: { keyRecord: KeyRecord }) {
  const { products, sales } = usePointState()
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const product = products.find((item) => item.id === keyRecord.productId)
  const sale = sales.find((item) => item.id === keyRecord.saleId)
  const rows: [string, string | null][] = [
    ['Sản phẩm', product?.name ?? keyRecord.productId],
    ['Đợt', keyRecord.batch],
    ['Sale', sale?.name ?? 'Kho chung của Quản lý'],
    ['Cấp lúc', keyRecord.issuedAt ? formatDateTime(keyRecord.issuedAt) : null],
    ['Kích hoạt lúc', keyRecord.activatedAt ? formatDateTime(keyRecord.activatedAt) : null],
    ['Hạn dùng', formatDate(keyRecord.expiresAt)],
    ['Ghi chú', keyRecord.note],
  ]

  async function copy() {
    setCopied(await copyText(keyRecord.code))
  }

  return (
    <div className="adm-theme pm-dialog">
      <DialogHeader>
        <DialogTitle>Chi tiết key</DialogTitle>
        <DialogDescription>Mỗi lần xem mã đầy đủ sẽ được ghi vào Nhật ký.</DialogDescription>
      </DialogHeader>
      <div className="pm-keybox pm-keybox--small">{revealed ? keyRecord.code : maskCode(keyRecord.code)}</div>
      <div className="pm-dialog__actions pm-dialog__actions--start">
        <button className="adm-btn adm-btn--small" onClick={() => setRevealed((current) => !current)} type="button">
          {revealed ? 'Ẩn mã' : 'Hiện mã đầy đủ'}
        </button>
        {revealed ? (
          <button className="adm-btn adm-btn--small" onClick={() => void copy()} type="button">{copied ? 'Đã sao chép' : 'Sao chép mã'}</button>
        ) : null}
        <SaleStatusBadge status={keyRecord.status} />
      </div>
      <dl className="pm-dl">
        {rows.filter(([, value]) => value).map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </div>
  )
}

export function KeyDetailDialog({ keyRecord, onClose }: { keyRecord: KeyRecord | null; onClose: () => void }) {
  return (
    <Dialog onOpenChange={(open) => { if (!open) onClose() }} open={keyRecord !== null}>
      <DialogContent>
        {keyRecord ? <Body key={keyRecord.id} keyRecord={keyRecord} /> : null}
      </DialogContent>
    </Dialog>
  )
}
