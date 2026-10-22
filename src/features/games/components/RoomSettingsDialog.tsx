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
import { GameSettingsForm, RocketSettingsForm } from './GameSettingsForm'
import { toGameType } from '../lib/gameRoutes'
import {
  ROCKET_ROOM_DEFAULTS,
  rocketQuestionCountError,
  type RocketRoomSettings,
} from '../lib/rocketRoomSettings'

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
  const rocket = toGameType(room.gameType) === 'ROCKET'
  const [rocketValue, setRocketValue] = useState<RocketRoomSettings>({
    initialLives: room.settings?.initialLives ?? ROCKET_ROOM_DEFAULTS.initialLives,
    questionCount:
      room.settings?.questionCount ?? ROCKET_ROOM_DEFAULTS.questionCount,
    secondsPerQuestion:
      room.settings?.secondsPerQuestion ??
      ROCKET_ROOM_DEFAULTS.secondsPerQuestion,
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
            const countError = rocket
              ? rocketQuestionCountError(rocketValue.questionCount)
              : null
            if (countError) {
              setError(countError)
              return
            }
            if (
              !rocket &&
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
                await gameApi.settings(
                  room.id,
                  rocket
                    ? rocketValue
                    : {
                        initialLives: value.initialLives,
                        wordLimit: value.wordLimit,
                        timeEnabled: value.timeEnabled,
                      },
                ),
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
          {rocket ? (
            <RocketSettingsForm
              value={rocketValue}
              onChange={setRocketValue}
              disabled={pending}
            />
          ) : (
            <GameSettingsForm
              value={value}
              onChange={setValue}
              disabled={pending}
              editing
            />
          )}
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
