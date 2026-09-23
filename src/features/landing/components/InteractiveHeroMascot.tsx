import { useEffect, useRef, useState, useCallback } from "react"
import heroMascotImage from "@/assets/ielts-hero-mascot.jpg"
import dinoIrisImage from "@/assets/dino-iris.png"

type EyeLayout = {
  leftEye: { left: number; top: number; width: number; height: number }
  rightEye: { left: number; top: number; width: number; height: number }
  irisSize: number
  maxShift: number
}

export function InteractiveHeroMascot() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<EyeLayout | null>(null)
  const [isBlinking, setIsBlinking] = useState(false)
  const [isWinking, setIsWinking] = useState(false)

  // Motion refs for smooth 60fps RAF loop without React re-renders
  const mouseRef = useRef({ x: window.innerWidth * 0.4, y: window.innerHeight * 0.5 })
  const tiltRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const pupilLeftRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const pupilRightRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })

  const leftPupilElRef = useRef<HTMLDivElement>(null)
  const rightPupilElRef = useRef<HTMLDivElement>(null)
  const sceneParallaxElRef = useRef<HTMLDivElement>(null)
  const glassSheenElRef = useRef<HTMLDivElement>(null)

  // Calculate pixel-perfect eye coordinates based on rendered image with object-fit: cover
  const updateLayout = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const { width: W, height: H } = container.getBoundingClientRect()
    if (!W || !H) return

    const imgAspect = 1376 / 768 // 1.7916667
    const contAspect = W / H

    let renderedW = 0
    let renderedH = 0
    let offsetX = 0
    let offsetY = 0

    if (contAspect > imgAspect) {
      renderedW = W
      renderedH = W / imgAspect
      offsetX = 0
      offsetY = (H - renderedH) * 0.5
    } else {
      renderedH = H
      renderedW = H * imgAspect
      offsetY = 0
      offsetX = (W - renderedW) * 0.85 // 85% horizontal anchor matching object-position
    }

    const eyeW = renderedW * 0.052
    const eyeH = renderedH * 0.104
    const irisSize = renderedW * 0.042
    const maxShift = renderedW * 0.009

    setLayout({
      leftEye: {
        left: offsetX + renderedW * 0.601 - eyeW / 2,
        top: offsetY + renderedH * 0.432 - eyeH / 2,
        width: eyeW,
        height: eyeH,
      },
      rightEye: {
        left: offsetX + renderedW * 0.720 - eyeW / 2,
        top: offsetY + renderedH * 0.432 - eyeH / 2,
        width: eyeW,
        height: eyeH,
      },
      irisSize,
      maxShift,
    })
  }, [])

  // Window resize observer
  useEffect(() => {
    updateLayout()
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => updateLayout())
    observer.observe(container)
    window.addEventListener("resize", updateLayout)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateLayout)
    }
  }, [updateLayout])

  // Mouse move listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // Animation frame loop for smooth pupil tracking and 3D parallax tilt
  useEffect(() => {
    let animId = 0
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const tick = () => {
      const container = containerRef.current
      if (container && !prefersReducedMotion) {
        const rect = container.getBoundingClientRect()
        const mouseX = mouseRef.current.x
        const mouseY = mouseRef.current.y

        // 3D Parallax tilt calculations
        const centerX = rect.left + rect.width * 0.5
        const centerY = rect.top + rect.height * 0.5
        const normX = Math.max(-1, Math.min(1, (mouseX - centerX) / (rect.width * 0.5)))
        const normY = Math.max(-1, Math.min(1, (mouseY - centerY) / (rect.height * 0.5)))

        tiltRef.current.targetX = normX * 4.5 // degrees rotateY
        tiltRef.current.targetY = -normY * 3.5 // degrees rotateX

        tiltRef.current.x += (tiltRef.current.targetX - tiltRef.current.x) * 0.08
        tiltRef.current.y += (tiltRef.current.targetY - tiltRef.current.y) * 0.08

        if (sceneParallaxElRef.current) {
          sceneParallaxElRef.current.style.transform = `perspective(1200px) rotateY(${tiltRef.current.x.toFixed(2)}deg) rotateX(${tiltRef.current.y.toFixed(2)}deg) translate3d(0, 0, 0)`
        }

        // Left Eye Tracking
        if (layout && leftPupilElRef.current && rightPupilElRef.current) {
          const leftEyeScreenX = rect.left + layout.leftEye.left + layout.leftEye.width * 0.5
          const leftEyeScreenY = rect.top + layout.leftEye.top + layout.leftEye.height * 0.5

          const dxLeft = mouseX - leftEyeScreenX
          const dyLeft = mouseY - leftEyeScreenY
          const angleLeft = Math.atan2(dyLeft, dxLeft)
          const distLeft = Math.hypot(dxLeft, dyLeft)
          const normDistLeft = Math.min(distLeft / 450, 1)

          pupilLeftRef.current.targetX = Math.cos(angleLeft) * layout.maxShift * normDistLeft
          pupilLeftRef.current.targetY = Math.sin(angleLeft) * layout.maxShift * normDistLeft

          pupilLeftRef.current.x += (pupilLeftRef.current.targetX - pupilLeftRef.current.x) * 0.15
          pupilLeftRef.current.y += (pupilLeftRef.current.targetY - pupilLeftRef.current.y) * 0.15

          leftPupilElRef.current.style.transform = `translate(${pupilLeftRef.current.x.toFixed(2)}px, ${pupilLeftRef.current.y.toFixed(2)}px)`

          // Right Eye Tracking
          const rightEyeScreenX = rect.left + layout.rightEye.left + layout.rightEye.width * 0.5
          const rightEyeScreenY = rect.top + layout.rightEye.top + layout.rightEye.height * 0.5

          const dxRight = mouseX - rightEyeScreenX
          const dyRight = mouseY - rightEyeScreenY
          const angleRight = Math.atan2(dyRight, dxRight)
          const distRight = Math.hypot(dxRight, dyRight)
          const normDistRight = Math.min(distRight / 450, 1)

          pupilRightRef.current.targetX = Math.cos(angleRight) * layout.maxShift * normDistRight
          pupilRightRef.current.targetY = Math.sin(angleRight) * layout.maxShift * normDistRight

          pupilRightRef.current.x += (pupilRightRef.current.targetX - pupilRightRef.current.x) * 0.15
          pupilRightRef.current.y += (pupilRightRef.current.targetY - pupilRightRef.current.y) * 0.15

          rightPupilElRef.current.style.transform = `translate(${pupilRightRef.current.x.toFixed(2)}px, ${pupilRightRef.current.y.toFixed(2)}px)`

          // Dynamic Glasses Sheen highlight moving opposite to light
          if (glassSheenElRef.current) {
            const sheenX = -normX * 18
            const sheenY = -normY * 12
            glassSheenElRef.current.style.transform = `translate(${sheenX.toFixed(1)}px, ${sheenY.toFixed(1)}px)`
          }
        }
      }

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [layout])

  // Natural Blinking Loop (every 3.8s to 6s)
  useEffect(() => {
    let timer: number
    const scheduleNextBlink = () => {
      const interval = 3800 + Math.random() * 2400
      timer = window.setTimeout(() => {
        setIsBlinking(true)
        window.setTimeout(() => {
          setIsBlinking(false)
          scheduleNextBlink()
        }, 140)
      }, interval)
    }

    scheduleNextBlink()
    return () => window.clearTimeout(timer)
  }, [])

  // Click on mascot triggers cute wink
  const handleMascotClick = () => {
    if (isWinking) return
    setIsWinking(true)
    window.setTimeout(() => {
      setIsWinking(false)
    }, 450)
  }

  return (
    <div
      className="hero-interactive-scene"
      ref={containerRef}
      onClick={handleMascotClick}
      title="Khủng long IELTSPath — Di chuột để bé nhìn theo bạn! Nhấp chuột để bé nháy mắt chào bạn."
      aria-hidden="true"
    >
      <div className="hero-mascot-parallax" ref={sceneParallaxElRef}>
        {/* Crisp 4K 3D Render Image */}
        <img
          src={heroMascotImage}
          alt="Mascot chú khủng long vàng 3D học IELTS với ánh nhìn theo chuột"
          className="hero-bg-image"
          fetchPriority="high"
          onLoad={updateLayout}
        />

        {/* Dynamic Interactive Eye-Tracking Sockets */}
        {layout && (
          <div className="dino-eye-layer">
            {/* Left Eye Socket */}
            <div
              className={`dino-eye-socket dino-eye-socket--left ${isBlinking || isWinking ? "is-blinking" : ""}`}
              style={{
                left: `${layout.leftEye.left}px`,
                top: `${layout.leftEye.top}px`,
                width: `${layout.leftEye.width}px`,
                height: `${layout.leftEye.height}px`,
              }}
            >
              <div className="dino-sclera" />
              <div
                className="dino-pupil-container"
                ref={leftPupilElRef}
                style={{
                  width: `${layout.irisSize}px`,
                  height: `${layout.irisSize}px`,
                }}
              >
                <img
                  src={dinoIrisImage}
                  alt=""
                  className="dino-iris-texture"
                  draggable={false}
                />
              </div>
              <div className="dino-eyelid" />
            </div>

            {/* Right Eye Socket */}
            <div
              className={`dino-eye-socket dino-eye-socket--right ${isBlinking ? "is-blinking" : ""}`}
              style={{
                left: `${layout.rightEye.left}px`,
                top: `${layout.rightEye.top}px`,
                width: `${layout.rightEye.width}px`,
                height: `${layout.rightEye.height}px`,
              }}
            >
              <div className="dino-sclera" />
              <div
                className="dino-pupil-container"
                ref={rightPupilElRef}
                style={{
                  width: `${layout.irisSize}px`,
                  height: `${layout.irisSize}px`,
                }}
              >
                <img
                  src={dinoIrisImage}
                  alt=""
                  className="dino-iris-texture"
                  draggable={false}
                />
              </div>
              <div className="dino-eyelid" />
            </div>

            {/* Glasses Optical Sheen */}
            <div
              className="dino-glasses-sheen"
              ref={glassSheenElRef}
              style={{
                left: `${layout.leftEye.left - 10}px`,
                top: `${layout.leftEye.top - 10}px`,
                width: `${layout.rightEye.left - layout.leftEye.left + layout.rightEye.width + 20}px`,
                height: `${layout.leftEye.height + 20}px`,
              }}
            />
          </div>
        )}

        {/* Ambient Tablet Glow on Wooden Desk */}
        <div className="dino-tablet-glow" />
      </div>

      {/* Smooth multi-stop gradient overlay for crisp text readability */}
      <div className="hero-bg-overlay" />
    </div>
  )
}

