import { useEffect, useRef, useState } from 'react'

export interface EmojiPopoverProps {
  isOpen: boolean
  onSelectEmoji: (emoji: string) => void
  onClose: () => void
}

interface EmojiCategory {
  id: string
  label: string
  emojis: string[]
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Cảm xúc',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😎', '🥳', '😏', '🤔', '🤫', '🤗', '😴', '😌'],
  },
  {
    id: 'gestures',
    label: 'Cử chỉ',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '👈', '👉', '👆', '👇', '✋', '👋', '💪', '🙏', '✨', '🔥', '🎉'],
  },
  {
    id: 'study',
    label: 'Học tập',
    emojis: ['📚', '📖', '📝', '✍️', '🎓', '💡', '🧠', '🎯', '💯', '📈', '📊', '📌', '🏷️', '🗣️', '🎧', '💻', '⏰', '📅', '🏆', '⭐', '🌟', '🚀'],
  },
  {
    id: 'symbols',
    label: 'Trái tim',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💗', '💓', '💞', '💕', '💌', '❣️', '💔', '❤️‍🔥', '💬', '💭', '🗨️', '✅', '❗'],
  },
]

export function EmojiPopover({ isOpen, onSelectEmoji, onClose }: EmojiPopoverProps) {
  const [activeTab, setActiveTab] = useState<string>('smileys')
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const currentCategory = EMOJI_CATEGORIES.find((cat) => cat.id === activeTab) ?? EMOJI_CATEGORIES[0]

  return (
    <div
      ref={popoverRef}
      className="composer-emoji-popover"
      role="dialog"
      aria-label="Chọn biểu tượng cảm xúc"
      aria-modal="false"
    >
      <div className="composer-emoji-tabs" role="tablist">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeTab === cat.id}
            aria-label={cat.label}
            className={`composer-emoji-tab ${activeTab === cat.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(cat.id)}
          >
            {cat.emojis[0]}
          </button>
        ))}
      </div>

      <div className="composer-emoji-grid" role="region" aria-label={currentCategory.label}>
        {currentCategory.emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="composer-emoji-btn"
            onClick={() => onSelectEmoji(emoji)}
            aria-label={`Chèn ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
