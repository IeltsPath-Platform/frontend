import { DoorOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ActiveGame } from '../types/game'

type ActiveGameDialogProps = {
  game: ActiveGame | null
  busy: boolean
  error: string
  replaceLabel: string
  onRejoin: () => void
  onReplace: () => void
  onClose: () => void
}

function describe(game: ActiveGame) {
  const solo = game.playerMode === 'SOLO'
  if (game.roomStatus === 'WAITING')
    return {
      current: `Bạn đang ở sảnh chờ của phòng ${game.roomCode}.`,
      consequence: 'Nếu tiếp tục, bạn sẽ rời phòng này.',
    }
  if (game.playerStatus === 'ACTIVE' || game.playerStatus === 'DISCONNECTED')
    return solo
      ? {
          current: `Bạn còn một lượt chơi đơn ${game.gameType === 'ROCKET' ? 'Tên lửa' : 'Wordly'} chưa kết thúc.`,
          consequence:
            'Nếu tiếp tục, lượt chơi cũ sẽ kết thúc và giữ nguyên số điểm đã đạt.',
        }
      : {
          current: `Trận đấu ở phòng ${game.roomCode} vẫn đang diễn ra.`,
          consequence:
            'Nếu tiếp tục, bạn sẽ bị tính là rời trận và chỉ còn xem được bảng xếp hạng.',
        }
  return {
    current: `Bạn vẫn đang theo dõi trận đấu ở phòng ${game.roomCode}.`,
    consequence: 'Nếu tiếp tục, bạn sẽ rời phòng này.',
  }
}

export function ActiveGameDialog({
  game,
  busy,
  error,
  replaceLabel,
  onRejoin,
  onReplace,
  onClose,
}: ActiveGameDialogProps) {
  const text = game ? describe(game) : null
  return (
    <Dialog
      open={Boolean(game)}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="gap-6 p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle>Bạn đang ở trong phòng chơi</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {text?.current} Bạn có muốn tham gia lại không?
          </DialogDescription>
        </DialogHeader>
        <p className="games-muted">{text?.consequence}</p>
        {error && (
          <p className="game-error" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="min-h-12 w-full rounded-xl px-5 text-base sm:w-auto"
            disabled={busy}
            onClick={onReplace}
          >
            <Plus aria-hidden="true" />
            {busy ? 'Đang rời phòng cũ…' : replaceLabel}
          </Button>
          <Button
            className="min-h-12 w-full rounded-xl px-5 text-base font-semibold sm:w-auto"
            disabled={busy}
            onClick={onRejoin}
          >
            <DoorOpen aria-hidden="true" />
            Tham gia lại phòng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
