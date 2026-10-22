import { useEffect, useEffectEvent, useRef } from 'react'
import { RocketScene } from '../scene/RocketScene'

type RocketCanvasProps = {
  onReady: (scene: RocketScene | null) => void
  onPick: (index: number) => void
  onHover: (index: number | null) => void
}

/** Mounts the three.js scene; reports null when WebGL or textures fail so the page can fall back. */
export function RocketCanvas({ onReady, onPick, onHover }: RocketCanvasProps) {
  const host = useRef<HTMLDivElement>(null)
  const ready = useEffectEvent(onReady)
  const pick = useEffectEvent(onPick)
  const hover = useEffectEvent(onHover)

  useEffect(() => {
    const element = host.current
    if (!element) return
    let scene: RocketScene | null = null
    let cancelled = false
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    RocketScene.create(element, {
      reducedMotion,
      onPick: (index) => pick(index),
      onHover: (index) => hover(index),
    })
      .then((created) => {
        if (cancelled) {
          created.dispose()
          return
        }
        scene = created
        ready(created)
      })
      .catch((error: unknown) => {
        console.error('Rocket scene unavailable, using static background.', error)
        if (!cancelled) ready(null)
      })
    return () => {
      cancelled = true
      scene?.dispose()
    }
  }, [])

  return <div ref={host} className="rocket-stage" />
}
