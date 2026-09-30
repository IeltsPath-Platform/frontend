import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

export function clampPosition(x: number, y: number, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  return { x: Math.max(8, Math.min(x, viewportWidth - width - 8)), y: Math.max(8, Math.min(y, viewportHeight - height - 8)) }
}

export function useFloatingPosition() {
  const ref = useRef<HTMLElement>(null)
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const [position, setPosition] = useState(() => ({ x: typeof window === 'undefined' ? 8 : Math.max(8, window.innerWidth - 376), y: 140 }))
  const move = (x: number, y: number) => {
    const rect = ref.current?.getBoundingClientRect()
    setPosition(clampPosition(x, y, rect?.width ?? 360, rect?.height ?? 48, window.innerWidth, window.innerHeight))
  }
  useEffect(() => {
    const clamp = () => {
      const rect = ref.current?.getBoundingClientRect()
      if (rect) setPosition((previous) => clampPosition(previous.x, previous.y, rect.width, rect.height, window.innerWidth, window.innerHeight))
    }
    const observer = new ResizeObserver(clamp)
    if (ref.current) observer.observe(ref.current)
    window.addEventListener('resize', clamp)
    return () => { observer.disconnect(); window.removeEventListener('resize', clamp) }
  }, [])

  return {
    ref, position,
    dock: (side: 'left' | 'right') => move(side === 'left' ? 8 : window.innerWidth, position.y),
    handlePointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      drag.current = { pointerId: event.pointerId, x: event.clientX - position.x, y: event.clientY - position.y }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    handlePointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      if (drag.current?.pointerId === event.pointerId) move(event.clientX - drag.current.x, event.clientY - drag.current.y)
    },
    handlePointerEnd: () => { drag.current = null },
    handleKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      const delta = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[event.key]
      if (delta) { event.preventDefault(); move(position.x + delta[0], position.y + delta[1]) }
    },
  }
}
