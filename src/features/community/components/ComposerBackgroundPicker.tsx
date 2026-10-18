import { useRef } from 'react'
import {
  COMPOSER_BACKGROUND_KEYS,
  COMPOSER_BACKGROUNDS,
  type ComposerBackgroundKey,
} from './composerBackgrounds'

export interface ComposerBackgroundPickerProps {
  selectedKey: ComposerBackgroundKey | null
  onSelectKey: (key: ComposerBackgroundKey | null) => void
  disabled?: boolean
  disabledReason?: string
}

export function ComposerBackgroundPicker({
  selectedKey,
  onSelectKey,
  disabled = false,
  disabledReason,
}: ComposerBackgroundPickerProps) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (disabled) return
    const total = COMPOSER_BACKGROUND_KEYS.length + 1 // +1 for "none"
    let nextIndex = index

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      nextIndex = (index + 1) % total
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      nextIndex = (index - 1 + total) % total
    } else {
      return
    }

    buttonsRef.current[nextIndex]?.focus()
    if (nextIndex === 0) {
      onSelectKey(null)
    } else {
      onSelectKey(COMPOSER_BACKGROUND_KEYS[nextIndex - 1])
    }
  }

  return (
    <div className="composer-bg-picker-container">
      <div
        className={`composer-bg-picker ${disabled ? 'is-disabled' : ''}`}
        role="radiogroup"
        aria-label="Chọn màu nền bài viết"
        aria-disabled={disabled}
        title={disabled && disabledReason ? disabledReason : undefined}
      >
        {/* Nút bỏ nền */}
        <button
          type="button"
          ref={(el) => {
            buttonsRef.current[0] = el
          }}
          role="radio"
          aria-checked={selectedKey === null}
          aria-label="Không dùng màu nền"
          className={`composer-bg-swatch composer-bg-none ${selectedKey === null ? 'is-active' : ''}`}
          disabled={disabled}
          onClick={() => onSelectKey(null)}
          onKeyDown={(e) => handleKeyDown(e, 0)}
          tabIndex={selectedKey === null ? 0 : -1}
        >
          <span className="composer-bg-none-icon" aria-hidden="true" />
        </button>

        {/* 8 màu nền */}
        {COMPOSER_BACKGROUND_KEYS.map((key, i) => {
          const bg = COMPOSER_BACKGROUNDS[key]
          const isSelected = selectedKey === key
          const buttonIndex = i + 1

          return (
            <button
              key={key}
              type="button"
              ref={(el) => {
                buttonsRef.current[buttonIndex] = el
              }}
              role="radio"
              aria-checked={isSelected}
              aria-label={bg.label}
              title={bg.label}
              className={`composer-bg-swatch ${isSelected ? 'is-active' : ''}`}
              style={{ background: bg.swatchGradient }}
              disabled={disabled}
              onClick={() => onSelectKey(key)}
              onKeyDown={(e) => handleKeyDown(e, buttonIndex)}
              tabIndex={isSelected ? 0 : -1}
            />
          )
        })}
      </div>

      {disabled && disabledReason && (
        <span className="composer-bg-disabled-hint" role="status">
          {disabledReason}
        </span>
      )}
    </div>
  )
}
