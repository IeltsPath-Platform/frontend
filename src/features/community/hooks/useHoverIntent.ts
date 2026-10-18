import { useCallback, useEffect, useRef, useState } from 'react'

interface UseHoverIntentOptions {
  openDelay?: number
  closeDelay?: number
  longPressDelay?: number
}

interface UseHoverIntentReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  setIsOpen: (open: boolean) => void
  handleMouseEnter: () => void
  handleMouseLeave: () => void
  handleTouchStart: (e: React.TouchEvent | TouchEvent) => void
  handleTouchEnd: () => void
  handleTouchMove: () => void
}

/**
 * Hook quản lý đóng mở popup cảm xúc với:
 * - Độ trễ hover mở (300-400ms) để tránh mở nhầm khi rê chuột qua nhanh
 * - Độ trễ hover đóng (200ms) để người dùng di chuột từ nút vào popup không bị mất
 * - Long-press (400ms) trên màn hình cảm ứng để mở popup
 */
export function useHoverIntent(options: UseHoverIntentOptions = {}): UseHoverIntentReturn {
  const { openDelay = 350, closeDelay = 200, longPressDelay = 400 } = options
  const [isOpen, setIsOpen] = useState(false)
  const openTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)
  const touchTimer = useRef<number | undefined>(undefined)
  const isTouchLongPress = useRef(false)

  const clearAllTimers = useCallback(() => {
    if (openTimer.current !== undefined) {
      window.clearTimeout(openTimer.current)
      openTimer.current = undefined
    }
    if (closeTimer.current !== undefined) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = undefined
    }
    if (touchTimer.current !== undefined) {
      window.clearTimeout(touchTimer.current)
      touchTimer.current = undefined
    }
  }, [])

  useEffect(() => {
    return () => clearAllTimers()
  }, [clearAllTimers])

  const open = useCallback(() => {
    clearAllTimers()
    setIsOpen(true)
  }, [clearAllTimers])

  const close = useCallback(() => {
    clearAllTimers()
    setIsOpen(false)
  }, [clearAllTimers])

  const toggle = useCallback(() => {
    clearAllTimers()
    setIsOpen((prev) => !prev)
  }, [clearAllTimers])

  const handleMouseEnter = useCallback(() => {
    if (closeTimer.current !== undefined) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = undefined
    }
    if (openTimer.current === undefined && !isOpen) {
      openTimer.current = window.setTimeout(() => {
        setIsOpen(true)
        openTimer.current = undefined
      }, openDelay)
    }
  }, [openDelay, isOpen])

  const handleMouseLeave = useCallback(() => {
    if (openTimer.current !== undefined) {
      window.clearTimeout(openTimer.current)
      openTimer.current = undefined
    }
    if (closeTimer.current === undefined && isOpen) {
      closeTimer.current = window.setTimeout(() => {
        setIsOpen(false)
        closeTimer.current = undefined
      }, closeDelay)
    }
  }, [closeDelay, isOpen])

  const handleTouchStart = useCallback(() => {
    isTouchLongPress.current = false
    if (touchTimer.current !== undefined) {
      window.clearTimeout(touchTimer.current)
    }
    touchTimer.current = window.setTimeout(() => {
      isTouchLongPress.current = true
      setIsOpen(true)
    }, longPressDelay)
  }, [longPressDelay])

  const handleTouchEnd = useCallback(() => {
    if (touchTimer.current !== undefined) {
      window.clearTimeout(touchTimer.current)
      touchTimer.current = undefined
    }
  }, [])

  const handleTouchMove = useCallback(() => {
    if (touchTimer.current !== undefined) {
      window.clearTimeout(touchTimer.current)
      touchTimer.current = undefined
    }
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
  }
}
