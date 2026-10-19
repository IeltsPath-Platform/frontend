import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreateRoomInput } from '../types/game'

type GameSettingsFormProps = {
  value: CreateRoomInput
  onChange: (value: CreateRoomInput) => void
  disabled?: boolean
  editing?: boolean
}

export function GameSettingsForm({
  value,
  onChange,
  disabled = false,
  editing = false,
}: GameSettingsFormProps) {
  return (
    <div className="game-settings-fields">
      <div className="game-field">
        <label htmlFor="game-lives">
          {value.playerMode === 'SOLO'
            ? 'Số mạng của tôi'
            : 'Số mạng cho mỗi người'}
        </label>
        <Select
          value={String(value.initialLives)}
          onValueChange={(v) => onChange({ ...value, initialLives: Number(v) })}
          disabled={disabled}
        >
          <SelectTrigger
            id="game-lives"
            className="min-h-12 w-full rounded-xl bg-background px-4 text-base"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            position="popper"
            side="bottom"
            align="start"
            sideOffset={6}
            avoidCollisions={false}
            className="z-[90] w-[var(--radix-select-trigger-width)] rounded-xl border border-border bg-popover p-1.5 shadow-lg"
          >
            {[3, 4, 5, 6].map((lives) => (
              <SelectItem
                key={lives}
                value={String(lives)}
                className="min-h-11 cursor-pointer rounded-lg px-3 text-base focus:bg-primary/10 focus:text-primary data-[state=checked]:bg-primary/10 data-[state=checked]:font-semibold data-[state=checked]:text-primary"
              >
                {lives} mạng
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p>Chọn từ 3 đến 6 mạng.</p>
      </div>
      {!editing && (
        <fieldset className="game-field">
          <legend>Số từ trong lượt chơi</legend>
          <RadioGroup
            className="game-radio-options"
            value={value.playMode}
            disabled={disabled}
            onValueChange={(v) =>
              onChange({
                ...value,
                playMode: v === 'ENDLESS' ? 'ENDLESS' : 'FINITE',
                wordLimit: v === 'ENDLESS' ? null : 10,
              })
            }
          >
            <label>
              <RadioGroupItem value="FINITE" /> Hữu hạn
            </label>
            <label>
              <RadioGroupItem value="ENDLESS" /> Vô hạn
            </label>
          </RadioGroup>
        </fieldset>
      )}
      {value.playMode === 'FINITE' ? (
        <div className="game-field">
          <label htmlFor="game-word-limit">Số từ · Tối thiểu 5</label>
          <Input
            id="game-word-limit"
            type="number"
            min={5}
            max={2147483647}
            step={1}
            required
            value={value.wordLimit ?? ''}
            disabled={disabled}
            className="min-h-11"
            onChange={(e) =>
              onChange({
                ...value,
                wordLimit:
                  e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
        </div>
      ) : (
        <p className="game-note">
          Không giới hạn số từ. Chơi đến khi hết mạng hoặc chủ động dừng.
        </p>
      )}
      {value.playerMode === 'SOLO' ? (
        <fieldset className="game-field">
          <legend>Thời gian mỗi từ</legend>
          <RadioGroup
            className="game-radio-options"
            value={value.timeEnabled ? 'yes' : 'no'}
            disabled={disabled}
            onValueChange={(v) =>
              onChange({ ...value, timeEnabled: v === 'yes' })
            }
          >
            <label>
              <RadioGroupItem value="yes" /> 180 giây
            </label>
            <label>
              <RadioGroupItem value="no" /> Không giới hạn
            </label>
          </RadioGroup>
        </fieldset>
      ) : (
        <p className="game-note">Thời gian mỗi từ: 180 giây · Cố định</p>
      )}
    </div>
  )
}
