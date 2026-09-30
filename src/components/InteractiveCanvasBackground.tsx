import { useEffect, useRef } from 'react'
import { createParticles, updateParticles } from './interactive-canvas/particleSystem'
import styles from './InteractiveCanvasBackground.module.css'

interface InteractiveCanvasBackgroundProps {
  /** Start at 160; try 400–500 after profiling on your target devices. */
  particleCount?: number
  /** Repulsion radius in CSS pixels, independent of device pixel ratio. */
  interactionRadius?: number
  className?: string
}

const DEFAULT_PARTICLE_COUNT = 160
const DEFAULT_INTERACTION_RADIUS = 150
const MAX_PIXEL_RATIO = 2
const PARALLAX_DISTANCE = 12
const COLOR_TOKENS = ['--particle-blue', '--particle-pink', '--particle-orange', '--particle-yellow']

/** Decorative background. Its positioned parent must establish an isolated stacking context. */
export function InteractiveCanvasBackground({
  particleCount = DEFAULT_PARTICLE_COUNT,
  interactionRadius = DEFAULT_INTERACTION_RADIUS,
  className,
}: InteractiveCanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    const context = canvas?.getContext('2d')
    if (!canvas || !container || !context) return

    const count = Number.isFinite(particleCount) ? Math.max(0, Math.floor(particleCount)) : DEFAULT_PARTICLE_COUNT
    const radius = Number.isFinite(interactionRadius) ? Math.max(0, interactionRadius) : DEFAULT_INTERACTION_RADIUS
    const particles = createParticles(count)
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const computedStyle = getComputedStyle(canvas)
    const colors = COLOR_TOKENS.map((token) => computedStyle.getPropertyValue(token).trim() || computedStyle.color)
    const pointer = { x: 0, y: 0, active: false }
    let clientX = 0
    let clientY = 0
    let hovering = false
    let reducedMotion = motionPreference.matches
    let frameId: number | null = null
    let previousTime: number | null = null
    let elapsed = 0
    let width = 0
    let height = 0
    let pixelRatio = 1
    let parallaxX = 0
    let parallaxY = 0
    let bounds = canvas.getBoundingClientRect()
    let needsMeasure = true
    let disposed = false

    function scheduleFrame() {
      if (!disposed && !document.hidden && frameId === null) {
        frameId = window.requestAnimationFrame(render)
      }
    }

    function measure() {
      if (!canvas || !context) return
      bounds = canvas.getBoundingClientRect()
      width = bounds.width
      height = bounds.height
      pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
      const pixelWidth = Math.round(width * pixelRatio)
      const pixelHeight = Math.round(height * pixelRatio)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }
      if (width > 0 && height > 0) {
        context.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0)
        context.lineCap = 'round'
      }
      needsMeasure = false
    }

    function render(timestamp: number) {
      frameId = null
      if (disposed || document.hidden || !context) return
      if (needsMeasure || pixelRatio !== Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)) measure()
      if (width <= 0 || height <= 0) {
        previousTime = null
        return
      }

      // Bound elapsed time after a stalled frame so spring forces cannot explode.
      const delta = previousTime === null || reducedMotion ? 0 : Math.min((timestamp - previousTime) / 1000, 0.05)
      previousTime = timestamp
      elapsed += delta
      pointer.x = clientX - bounds.left
      pointer.y = clientY - bounds.top
      pointer.active = !reducedMotion && hovering && pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height

      const targetX = pointer.active ? (0.5 - pointer.x / width) * PARALLAX_DISTANCE * 2 : 0
      const targetY = pointer.active ? (0.5 - pointer.y / height) * PARALLAX_DISTANCE * 2 : 0
      const easing = 1 - Math.exp(-4 * delta)
      parallaxX += (targetX - parallaxX) * easing
      parallaxY += (targetY - parallaxY) * easing
      updateParticles(particles, width, height, elapsed, delta, pointer, radius, parallaxX, parallaxY)

      context.clearRect(0, 0, width, height)
      for (const particle of particles) {
        if (particle.x < -12 || particle.x > width + 12 || particle.y < -12 || particle.y > height + 12) continue
        const color = colors[particle.colorIndex]
        context.globalAlpha = particle.alpha
        context.beginPath()
        if (particle.isDot) {
          context.fillStyle = color
          context.arc(particle.x, particle.y, particle.width, 0, Math.PI * 2)
          context.fill()
        } else {
          const halfX = Math.cos(particle.angle) * particle.length / 2
          const halfY = Math.sin(particle.angle) * particle.length / 2
          context.strokeStyle = color
          context.lineWidth = particle.width
          context.moveTo(particle.x - halfX, particle.y - halfY)
          context.lineTo(particle.x + halfX, particle.y + halfY)
          context.stroke()
        }
      }
      context.globalAlpha = 1
      // Reduced motion renders a still composition with no idle animation loop.
      if (!reducedMotion && count > 0) scheduleFrame()
    }

    function handlePointerMove(event: PointerEvent) {
      if (reducedMotion || event.pointerType === 'touch') return
      clientX = event.clientX
      clientY = event.clientY
      hovering = true
    }

    function resetPointer() {
      hovering = false
      pointer.active = false
    }

    function handleLayoutChange() {
      needsMeasure = true
      scheduleFrame()
    }

    function stopFrame() {
      if (frameId !== null) window.cancelAnimationFrame(frameId)
      frameId = null
      previousTime = null
    }

    function handleVisibilityChange() {
      resetPointer()
      stopFrame()
      if (!document.hidden) handleLayoutChange()
    }

    function handleMotionChange() {
      reducedMotion = motionPreference.matches
      resetPointer()
      stopFrame()
      parallaxX = 0
      parallaxY = 0
      for (const particle of particles) {
        particle.offsetX = 0
        particle.offsetY = 0
        particle.velocityX = 0
        particle.velocityY = 0
      }
      scheduleFrame()
    }

    // The canvas never receives input: listen on its parent, including over the form.
    container.addEventListener('pointermove', handlePointerMove, { passive: true })
    container.addEventListener('pointerleave', resetPointer)
    container.addEventListener('pointercancel', resetPointer)
    window.addEventListener('blur', resetPointer)
    window.addEventListener('resize', handleLayoutChange, { passive: true })
    window.addEventListener('scroll', handleLayoutChange, { passive: true, capture: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)
    motionPreference.addEventListener('change', handleMotionChange)
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleLayoutChange)
    resizeObserver?.observe(container)
    scheduleFrame()

    return () => {
      disposed = true
      stopFrame()
      resizeObserver?.disconnect()
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerleave', resetPointer)
      container.removeEventListener('pointercancel', resetPointer)
      window.removeEventListener('blur', resetPointer)
      window.removeEventListener('resize', handleLayoutChange)
      window.removeEventListener('scroll', handleLayoutChange, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      motionPreference.removeEventListener('change', handleMotionChange)
      canvas.width = 0
      canvas.height = 0
    }
  }, [particleCount, interactionRadius])

  return <canvas ref={canvasRef} className={`${styles.canvas}${className ? ` ${className}` : ''}`} aria-hidden="true" />
}
