import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type GameNoticeDialogProps = {
  message: string
  onClose: () => void
}

export function GameNoticeDialog({ message, onClose }: GameNoticeDialogProps) {
  return (
    <Dialog
      open={Boolean(message)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thông báo</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <Button type="button" onClick={onClose}>
          Đã hiểu
        </Button>
      </DialogContent>
    </Dialog>
  )
}
