export interface Particle {
  anchorX: number
  anchorY: number
  phase: number
  orbitRadius: number
  orbitSpeed: number
  depth: number
  length: number
  width: number
  alpha: number
  colorIndex: number
  isDot: boolean
  offsetX: number
  offsetY: number
  velocityX: number
  velocityY: number
  x: number
  y: number
  angle: number
}

export interface ParticlePointer {
  x: number
  y: number
  active: boolean
}

const FULL_TURN = Math.PI * 2
const GOLDEN_STEP = (Math.sqrt(5) - 1) / 2
const MAX_FRAME_SECONDS = 0.05
const MAX_STEP_SECONDS = 1 / 120
const SPRING = 18
const DAMPING = 8
const REPULSION = 2400

export function createParticles(count: number): Particle[] {
  const shiftX = Math.random()
  const shiftY = Math.random()

  return Array.from({ length: count }, (_, index) => {
    const phase = Math.random() * FULL_TURN

    return {
      // Even coverage survives resizing because anchors stay normalized.
      anchorX: ((index + 0.5) / count + shiftX) % 1,
      anchorY: (index * GOLDEN_STEP + shiftY) % 1,
      phase,
      orbitRadius: 5 + Math.random() * 11,
      orbitSpeed: (0.08 + Math.random() * 0.1) * (Math.random() < 0.5 ? -1 : 1),
      depth: 0.4 + Math.random() * 0.6,
      length: 2 + Math.random() * 5,
      width: 0.9 + Math.random() * 1.1,
      alpha: 0.5 + Math.random() * 0.45,
      colorIndex: Math.floor(Math.random() * 4),
      isDot: Math.random() < 0.4,
      offsetX: 0,
      offsetY: 0,
      velocityX: 0,
      velocityY: 0,
      x: 0,
      y: 0,
      angle: phase,
    }
  })
}

export function updateParticles(
  particles: Particle[],
  width: number,
  height: number,
  timeSeconds: number,
  deltaSeconds: number,
  pointer: ParticlePointer,
  interactionRadius: number,
  parallaxX: number,
  parallaxY: number,
): void {
  // Resume without integrating an entire hidden tab's elapsed time.
  const delta = Number.isFinite(deltaSeconds) ? Math.min(Math.max(deltaSeconds, 0), MAX_FRAME_SECONDS) : 0
  const steps = Math.ceil(delta / MAX_STEP_SECONDS)
  const step = steps > 0 ? delta / steps : 0

  for (const particle of particles) {
    const anchorX = particle.anchorX * width + parallaxX * particle.depth
    const anchorY = particle.anchorY * height + parallaxY * particle.depth

    for (let index = 0; index < steps; index += 1) {
      const angle = particle.phase + (timeSeconds - delta + (index + 1) * step) * particle.orbitSpeed
      const baseX = anchorX + Math.cos(angle) * particle.orbitRadius
      const baseY = anchorY + Math.sin(angle) * particle.orbitRadius * 0.7
      let forceX = -particle.offsetX * SPRING - particle.velocityX * DAMPING
      let forceY = -particle.offsetY * SPRING - particle.velocityY * DAMPING

      if (pointer.active && interactionRadius > 0) {
        // Hit testing uses the displayed position, including depth parallax.
        const dx = baseX + particle.offsetX - pointer.x
        const dy = baseY + particle.offsetY - pointer.y
        const distance = Math.hypot(dx, dy)

        if (distance < interactionRadius) {
          const falloff = 1 - distance / interactionRadius
          const force = REPULSION * falloff * falloff
          // An exact overlap has no direction; phase provides a finite one.
          forceX += (distance > 0.001 ? dx / distance : Math.cos(particle.phase)) * force
          forceY += (distance > 0.001 ? dy / distance : Math.sin(particle.phase)) * force
        }
      }

      particle.velocityX += forceX * step
      particle.velocityY += forceY * step
      particle.offsetX += particle.velocityX * step
      particle.offsetY += particle.velocityY * step
    }

    const angle = particle.phase + timeSeconds * particle.orbitSpeed
    particle.x = anchorX + Math.cos(angle) * particle.orbitRadius + particle.offsetX
    particle.y = anchorY + Math.sin(angle) * particle.orbitRadius * 0.7 + particle.offsetY
    particle.angle = angle
  }
}
