import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { KeyDto } from '../data/types'
import { copyText } from './copy-text'
import { formatDate, formatDateTime } from './format'
import { SaleStatusBadge } from './StatusBadge'

function Body({ keyRecord, saleName, reveal }: {
  keyRecord: KeyDto
  saleName: string | null
  reveal: (keyId: string) => Promise<string>
}) {
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const rows: [string, string | null][] = [
    ['Sản phẩm', keyRecord.productName],
    ['Đợt', keyRecord.batchCode],
    ['Sale', saleName],
    ['Cấp lúc', keyRecord.issuedAt ? formatDateTime(keyRecord.issuedAt) : null],
    ['Kích hoạt lúc', keyRecord.activatedAt ? formatDateTime(keyRecord.activatedAt) : null],
    ['Thu hồi lúc', keyRecord.revokedAt ? formatDateTime(keyRecord.revokedAt) : null],
    ['Hạn dùng', keyRecord.expiresAt ? formatDate(keyRecord.expiresAt) : null],
    ['Ghi chú', keyRecord.note],
  ]

  async function showCode() {
    setPending(true)
    setError('')
    try {
      setCode(await reveal(keyRecord.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa xem được mã. Vui lòng thử lại.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="adm-theme pm-dialog">
      <DialogHeader>
        <DialogTitle>Chi tiết key</DialogTitle>
        <DialogDescription>Mỗi lần xem mã đầy đủ được ghi vào nhật ký.</DialogDescription>
      </DialogHeader>
      <div className="pm-keybox pm-keybox--small">{code ?? keyRecord.maskedCode}</div>
      <div className="pm-dialog__actions pm-dialog__actions--start">
        {code === null ? (
          keyRecord.codeStored ? (
            <button className="adm-btn adm-btn--small" disabled={pending} onClick={() => void showCode()} type="button">
              {pending ? 'Đang tải…' : 'Hiện mã đầy đủ'}
            </button>
          ) : null
        ) : (
          <>
            <button className="adm-btn adm-btn--small" onClick={() => setCode(null)} type="button">Ẩn mã</button>
            <button className="adm-btn adm-btn--small" onClick={() => void copyText(code).then(setCopied)} type="button">
              {copied ? 'Đã sao chép' : 'Sao chép mã'}
            </button>
          </>
        )}
        <SaleStatusBadge status={keyRecord.state} />
      </div>
      {error ? <p className="adm-field__error" role="alert">{error}</p> : null}
      <dl className="pm-dl">
        {rows.filter(([, value]) => value).map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </div>
  )
}

/** A key's details. The full code is fetched only when someone asks for it, and each fetch is logged on the server. */
export function KeyDetailDialog({ keyRecord, saleName, reveal, onClose }: {
  keyRecord: KeyDto | null
  saleName: string | null
  reveal: (keyId: string) => Promise<string>
  onClose: () => void
}) {
  return (
    <Dialog onOpenChange={(open) => { if (!open) onClose() }} open={keyRecord !== null}>
      <DialogContent>
        {keyRecord ? <Body key={keyRecord.id} keyRecord={keyRecord} saleName={saleName} reveal={reveal} /> : null}
      </DialogContent>
    </Dialog>
  )
}
