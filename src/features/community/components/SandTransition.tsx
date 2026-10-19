import { useEffect, useRef } from 'react'
import './SandTransition.css'

interface SandTransitionProps {
  onComplete: () => void
}

interface SandParticle {
  x: number
  y: number
  radius: number
  drift: number
  phase: number
  opacity: number
}

const TRANSITION_DURATION = 1900

export function SandTransition({ onComplete }: SandTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onComplete()
      return
    }

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      onComplete()
      return
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    context.scale(pixelRatio, pixelRatio)

    const particleCount = Math.max(65, Math.min(220, Math.round((width * height) / 6000)))
    const particles: SandParticle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.55 + Math.random() * 1.7,
      drift: 10 + Math.random() * 38,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.28 + Math.random() * 0.55,
    }))

    const startedAt = performance.now()
    let frame = 0
    const timer = window.setTimeout(onComplete, TRANSITION_DURATION)

    const draw = (time: number) => {
      const elapsed = time - startedAt
      const progress = Math.min(elapsed / TRANSITION_DURATION, 1)
      context.clearRect(0, 0, width, height)
      for (const particle of particles) {
        const x = (particle.x + particle.drift * (elapsed / 1000)) % (width + 20)
        const y = particle.y - elapsed * 0.006 + Math.sin(elapsed * 0.0018 + particle.phase) * 5
        context.globalAlpha = particle.opacity * (1 - progress) * Math.min(1, progress * 5 + 0.2)
        context.fillStyle = particle.phase > Math.PI ? '#f6d99b' : '#fff4dc'
        context.beginPath()
        context.arc(x - 10, y, particle.radius, 0, Math.PI * 2)
        context.fill()
      }
      context.globalAlpha = 1
      if (progress < 1) frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [onComplete])

  return <canvas aria-hidden="true" className="community-sand-transition" data-testid="community-sand-transition" ref={canvasRef} style={{ pointerEvents: 'none' }} />
}
