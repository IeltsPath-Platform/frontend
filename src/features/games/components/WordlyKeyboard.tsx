import { Delete, CornerDownLeft } from 'lucide-react'
import type { LetterStatus } from '../types/game'
type WordlyKeyboardProps = {
  pressed?: { key: string; id: number } | null
  keyboard: Record<string, LetterStatus>
  disabled: boolean
  press: (key: string) => void
}

export function WordlyKeyboard({
  keyboard,
  disabled,
  press,
  pressed,
}: WordlyKeyboardProps) {
  return (
    <div className="wordly-keyboard" aria-label="Bàn phím chữ cái">
      {['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((row, index) => (
        <div className="wordly-key-row" key={row}>
          {index === 2 && (
            <button
              type="button"
              className="wordly-key wordly-action-key"
              disabled={disabled}
              onClick={() => press('Enter')}
              aria-label="Gửi từ"
            >
              <CornerDownLeft size={18} />
            </button>
          )}
          {[...row].map((letter) => (
            <button
              type="button"
              className={`wordly-key ${keyboard[letter] ?? ''} ${pressed?.key === letter ? (pressed.id % 2 ? 'wordly-key-pop' : 'wordly-key-pop-alt') : ''}`}
              key={letter}
              disabled={disabled}
              onClick={() => press(letter)}
              aria-label={`${letter}${keyboard[letter] ? `: ${keyboard[letter]}` : ''}`}
            >
              {letter}
            </button>
          ))}
          {index === 2 && (
            <button
              type="button"
              className="wordly-key wordly-action-key"
              disabled={disabled}
              onClick={() => press('Backspace')}
              aria-label="Xóa chữ"
            >
              <Delete size={18} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
