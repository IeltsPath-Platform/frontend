import { useEffect, useRef } from 'react'
import { ConfirmPopup } from '@/components/ui/confirm-dialog'

interface SkipConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Asks before leaving a review session; answers already given stay saved either way. */
export function SkipConfirmDialog({ isOpen, onConfirm, onCancel }: SkipConfirmDialogProps) {
  // The popup reports the button press and then its own closing; only the first answer counts.
  const answered = useRef(false)
  useEffect(() => {
    if (isOpen) answered.current = false
  }, [isOpen])
  if (!isOpen) return null

  return (
    <ConfirmPopup
      title="Tạm dừng phiên ôn tập?"
      message="Các câu trả lời bạn đã hoàn thành sẽ được lưu lại. Bạn có chắc muốn quay lại Sổ tay không?"
      confirmLabel="Thoát phiên"
      cancelLabel="Tiếp tục học"
      tone="danger"
      onAnswer={(leave) => {
        if (answered.current) return
        answered.current = true
        if (leave) onConfirm()
        else onCancel()
      }}
    />
  )
}
