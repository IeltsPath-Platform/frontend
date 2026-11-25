import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { copyText } from '../shared/copy-text'

/** The code of the key just handed out, with the pack it belongs to. */
export interface IssuedCode {
  code: string
  productName: string
}

function Body({ issued, onClose }: { issued: IssuedCode; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="adm-theme pm-dialog">
      <DialogHeader>
        <DialogTitle>✓ Đã phát hành key</DialogTitle>
        <DialogDescription>
          {issued.productName}. Gửi mã này cho học viên qua Zalo. Mã đầy đủ chỉ hiện ở bước này và trong Chi tiết key.
        </DialogDescription>
      </DialogHeader>
      <div className="pm-keybox">{issued.code}</div>
      <button className="adm-btn adm-btn--primary" onClick={() => void copyText(issued.code).then(setCopied)} type="button">
        {copied ? 'Đã sao chép' : 'Sao chép mã'}
      </button>
      <div className="pm-dialog__actions">
        <button className="adm-btn adm-btn--primary" onClick={onClose} type="button">Xong</button>
      </div>
    </div>
  )
}

/** Shows the full code the moment a key is issued, so the sale can copy it straight to the student. */
export function IssuedKeyDialog({ issued, onClose }: { issued: IssuedCode | null; onClose: () => void }) {
  return (
    <Dialog onOpenChange={(open) => { if (!open) onClose() }} open={issued !== null}>
      <DialogContent>
        {issued ? <Body key={issued.code} issued={issued} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  )
}
