import { GameNoticeDialog } from './GameNoticeDialog'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { gameApi } from '../api/gameApi'
import type { CreateRoomInput, GameRoom } from '../types/game'
import { GameSettingsForm } from './GameSettingsForm'

type RoomSettingsDialogProps = {
  room: GameRoom
  onClose: () => void
  onSaved: (room: GameRoom) => void
}

export function RoomSettingsDialog({
  room,
  onClose,
  onSaved,
}: RoomSettingsDialogProps) {
  const [value, setValue] = useState<CreateRoomInput>({
    playerMode: room.playerMode,
    initialLives: room.settings?.initialLives ?? 4,
    playMode: room.settings?.playMode ?? 'FINITE',
    wordLimit: room.settings?.wordLimit ?? null,
    timeEnabled: room.settings?.timeEnabled ?? true,
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving.current) onClose()
      }}
    >
      <DialogContent className="game-settings-dialog">
        <DialogHeader>
          <DialogTitle>Chỉnh cấu hình phòng</DialogTitle>
          <DialogDescription>
            Lưu thay đổi sẽ hủy sẵn sàng của mọi người. Người chơi và chế độ
            chơi được giữ nguyên.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="game-form"
          aria-busy={pending}
          onSubmit={async (event) => {
            event.preventDefault()
            if (saving.current) return
            if (
              value.playMode === 'FINITE' &&
              (!Number.isInteger(value.wordLimit) ||
                (value.wordLimit ?? 0) < 5 ||
                (value.wordLimit ?? 0) > 2147483647)
            ) {
              setError(
                (value.wordLimit ?? 0) > 2147483647
                  ? 'Số từ vượt quá giới hạn cho phép.'
                  : 'Vui lòng nhập số từ là số nguyên từ 5 trở lên.',
              )
              return
            }
            saving.current = true
            setPending(true)
            setError('')
            try {
              onSaved(
                await gameApi.settings(room.id, {
                  initialLives: value.initialLives,
                  wordLimit: value.wordLimit,
                  timeEnabled: value.timeEnabled,
                }),
              )
              onClose()
            } catch {
              setError(
                'Không lưu được cấu hình. Phòng có thể đã bắt đầu hoặc kết nối bị gián đoạn. Vui lòng tải lại phòng và thử lại.',
              )
            } finally {
              saving.current = false
              setPending(false)
            }
          }}
        >
          <GameSettingsForm
            value={value}
            onChange={setValue}
            disabled={pending}
            editing
          />
          <GameNoticeDialog message={error} onClose={() => setError('')} />
          <div className="game-actions">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
