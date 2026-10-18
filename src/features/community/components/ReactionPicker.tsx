import { useCallback, useEffect, useRef, useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import { ReactionIcon } from './ReactionIcons'
import {
  REACTION_LIST,
  REACTION_META,
  type ReactionType,
} from '../utils/communityFormat'
import { useHoverIntent } from '../hooks/useHoverIntent'
import './ReactionPicker.css'

export interface ReactionPickerProps {
  postId: string
  myReaction?: string | null
  onSelectReaction: (type: ReactionType) => void
  disabled?: boolean
}

interface BurstParticle {
  id: number
  x: number
  y: number
  color: string
}

export function ReactionPicker({
  myReaction,
  onSelectReaction,
  disabled = false,
}: ReactionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [particles, setParticles] = useState<BurstParticle[]>([])
  const particleIdRef = useRef(0)

  const activeReaction = (myReaction && myReaction in REACTION_META)
    ? (myReaction as ReactionType)
    : null

  const {
    isOpen,
    open,
    close,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
  } = useHoverIntent({
    openDelay: 350,
    closeDelay: 200,
    longPressDelay: 400,
  })

  // Đóng popup khi click ra ngoài trên thiết bị cảm ứng hoặc chuột
  useEffect(() => {
    if (!isOpen) return

    function handlePointerDownOutside(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close()
      }
    }

    document.addEventListener('mousedown', handlePointerDownOutside)
    document.addEventListener('touchstart', handlePointerDownOutside)
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside)
      document.removeEventListener('touchstart', handlePointerDownOutside)
    }
  }, [isOpen, close])

  // Trả focus về nút chính khi popup đóng (nếu người dùng dùng bàn phím)
  const handleCloseAndFocus = useCallback(() => {
    close()
    setFocusedIndex(-1)
    buttonRef.current?.focus()
  }, [close])

  // Kích hoạt hiệu ứng hạt nảy (Burst Particles)
  const triggerBurst = useCallback((type: ReactionType) => {
    const meta = REACTION_META[type]
    const colors = [meta.color, '#FFD700', '#FF69B4', '#00E5FF']
    const newParticles: BurstParticle[] = []

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8 + (Math.random() * 0.3 - 0.15)
      const distance = 26 + Math.random() * 18
      newParticles.push({
        id: ++particleIdRef.current,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 8,
        color: colors[i % colors.length] ?? meta.color,
      })
    }

    setParticles(newParticles)
    window.setTimeout(() => setParticles([]), 550)
  }, [])

  // Xử lý chọn cảm xúc từ popup
  const handleSelect = useCallback(
    (type: ReactionType) => {
      triggerBurst(type)
      onSelectReaction(type)
      close()
      setFocusedIndex(-1)
      buttonRef.current?.focus()
    },
    [close, onSelectReaction, triggerBurst]
  )

  // Bấm nhanh vào nút chính:
  // - Nếu chưa chọn gì: bật LIKE
  // - Nếu đang chọn LIKE: tắt LIKE (về null)
  // - Nếu đang chọn cảm xúc khác (vd LOVE): bấm lại để bỏ reaction đó (về null)
  const handleQuickClick = useCallback(() => {
    if (disabled) return
    if (!activeReaction) {
      triggerBurst('LIKE')
      onSelectReaction('LIKE')
    } else {
      onSelectReaction(activeReaction)
    }
  }, [activeReaction, disabled, onSelectReaction, triggerBurst])

  // Xử lý phím trên nút chính
  const handleButtonKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        open()
        setFocusedIndex(0)
      } else if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        handleCloseAndFocus()
      }
    },
    [disabled, handleCloseAndFocus, isOpen, open]
  )

  // Xử lý phím khi đang trong popup (di chuyển Trái/Phải, Enter/Space chọn, Escape đóng)
  const handlePopupKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleCloseAndFocus()
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % REACTION_LIST.length)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setFocusedIndex((prev) => (prev - 1 + REACTION_LIST.length) % REACTION_LIST.length)
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const selectedType = REACTION_LIST[focusedIndex]
        if (selectedType) {
          handleSelect(selectedType)
        }
      }
    },
    [focusedIndex, handleCloseAndFocus, handleSelect]
  )

  // Tự động focus nút con trong popup khi focusedIndex thay đổi bằng phím
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && popupRef.current) {
      const buttons = popupRef.current.querySelectorAll<HTMLButtonElement>('.reaction-item-btn')
      buttons[focusedIndex]?.focus()
    }
  }, [isOpen, focusedIndex])

  // Nhãn và icon hiển thị của nút chính
  const buttonMeta = activeReaction ? REACTION_META[activeReaction] : null
  const activeClass = activeReaction
    ? `is-active is-active-${activeReaction.toLowerCase()}`
    : ''

  return (
    <div
      ref={containerRef}
      className="reaction-picker-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Nút hành động chính */}
      <button
        ref={buttonRef}
        type="button"
        className={`reaction-main-button ${activeClass}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={buttonMeta ? `${buttonMeta.label}` : 'Thích'}
        aria-pressed={Boolean(activeReaction)}
        disabled={disabled}
        onClick={handleQuickClick}
        onKeyDown={handleButtonKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <span className="reaction-main-icon" aria-hidden="true">
          {activeReaction ? (
            <ReactionIcon type={activeReaction} size={20} />
          ) : (
            <ThumbsUp size={19} />
          )}
        </span>
        <span className="reaction-main-text">
          {buttonMeta ? buttonMeta.label : 'Thích'}
        </span>
      </button>

      {/* Hiệu ứng hạt nổ khi chọn cảm xúc */}
      {particles.length > 0 && (
        <div className="reaction-burst-container" aria-hidden="true">
          {particles.map((p) => (
            <span
              key={p.id}
              className="reaction-burst-particle"
              style={{
                backgroundColor: p.color,
                ['--burst-x' as string]: `${p.x}px`,
                ['--burst-y' as string]: `${p.y}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Popup nổi 4 cảm xúc */}
      {isOpen && (
        <div
          ref={popupRef}
          className="reaction-popup"
          role="menu"
          aria-label="Chọn cảm xúc"
          onKeyDown={handlePopupKeyDown}
        >
          {REACTION_LIST.map((type, index) => {
            const meta = REACTION_META[type]
            const isSelected = activeReaction === type
            return (
              <button
                key={type}
                type="button"
                role="menuitem"
                tabIndex={focusedIndex === index ? 0 : -1}
                className={`reaction-item-btn ${isSelected ? 'is-active' : ''}`}
                style={{ ['--active-ring-color' as string]: meta.color }}
                aria-label={meta.label}
                aria-pressed={isSelected}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect(type)
                }}
              >
                {/* SVG minh họa nội tuyến đẹp mắt */}
                <ReactionIcon type={type} size={30} />
                {/* Tooltip hiển thị nhãn khi hover/focus */}
                <span className="reaction-item-label" aria-hidden="true">
                  {meta.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
