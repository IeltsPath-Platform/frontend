import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePointState } from '../data/store'
import type { KeyRecord } from '../data/types'
import { copyText } from '../shared/copy-text'
import { productGrant } from '../shared/product-text'

function Body({ keyRecord, onClose }: { keyRecord: KeyRecord; onClose: () => void }) {
  const { products } = usePointState()
  const product = products.find((item) => item.id === keyRecord.productId)
  const [copied, setCopied] = useState(false)
  return (
    <div className="adm-theme pm-dialog">
      <DialogHeader>
        <DialogTitle>✓ Đã phát hành key</DialogTitle>
        <DialogDescription>
          {product ? `${product.name} · cộng ${productGrant(product)}. ` : ''}Gửi mã này cho học viên qua Zalo. Mã đầy đủ chỉ hiện ở bước này và trong Chi tiết key.
        </DialogDescription>
      </DialogHeader>
      <div className="pm-keybox">{keyRecord.code}</div>
      <button className="adm-btn adm-btn--primary" onClick={() => void copyText(keyRecord.code).then(setCopied)} type="button">
        {copied ? 'Đã sao chép' : 'Sao chép mã'}
      </button>
      <div className="pm-dialog__actions">
        <button className="adm-btn adm-btn--primary" onClick={onClose} type="button">Xong</button>
      </div>
    </div>
  )
}

/** Shows the full code the moment a key is issued, so the sale can copy it straight to the student. */
export function IssuedKeyDialog({ keyRecord, onClose }: { keyRecord: KeyRecord | null; onClose: () => void }) {
  return (
    <Dialog onOpenChange={(open) => { if (!open) onClose() }} open={keyRecord !== null}>
      <DialogContent>
        {keyRecord ? <Body key={keyRecord.id} keyRecord={keyRecord} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  )
}
