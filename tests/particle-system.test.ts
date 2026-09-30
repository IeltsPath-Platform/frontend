import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createParticles, updateParticles, type Particle, type ParticlePointer } from '../src/components/interactive-canvas/particleSystem.ts'

const inactivePointer: ParticlePointer = { x: 0, y: 0, active: false }

function stationaryParticle(overrides: Partial<Particle> = {}): Particle {
  return {
    anchorX: 0.5, anchorY: 0.5, phase: 0, orbitRadius: 0, orbitSpeed: 0,
    depth: 0.5, length: 4, width: 1, alpha: 0.8, colorIndex: 0, isDot: false,
    offsetX: 0, offsetY: 0, velocityX: 0, velocityY: 0, x: 500, y: 400, angle: 0,
    ...overrides,
  }
}

function simulate(particle: Particle, pointer: ParticlePointer, seconds: number, fps = 60) {
  for (let frame = 1; frame <= Math.round(seconds * fps); frame += 1) {
    updateParticles([particle], 1000, 800, frame / fps, 1 / fps, pointer, 150, 0, 0)
  }
}

test('particle anchors cover the canvas with bounded sizes and valid palette indices', () => {
  const particles = createParticles(160)
  const quadrantCounts = [0, 0, 0, 0]

  assert.equal(particles.length, 160)
  assert.deepEqual(createParticles(0), [])
  for (const particle of particles) {
    assert.ok(particle.anchorX >= 0 && particle.anchorX < 1)
    assert.ok(particle.anchorY >= 0 && particle.anchorY < 1)
    assert.ok(particle.orbitRadius >= 5 && particle.orbitRadius <= 16)
    assert.ok(particle.depth >= 0.4 && particle.depth <= 1)
    assert.ok(particle.length >= 2 && particle.length <= 7)
    assert.ok(Number.isInteger(particle.colorIndex) && particle.colorIndex >= 0 && particle.colorIndex < 4)
    quadrantCounts[Number(particle.anchorX >= 0.5) + Number(particle.anchorY >= 0.5) * 2] += 1
  }
  assert.ok(quadrantCounts.every((count) => count >= 35 && count <= 45))
})

test('zero elapsed time positions a static frame and resize without advancing the spring', () => {
  const particle = stationaryParticle({ orbitRadius: 10, offsetX: 3, velocityX: 5 })
  updateParticles([particle], 600, 400, 0, 0, { x: 323, y: 195, active: true }, 150, 20, -10)
  assert.equal(particle.x, 323)
  assert.equal(particle.y, 195)
  assert.equal(particle.offsetX, 3)
  assert.equal(particle.velocityX, 5)

  updateParticles([particle], 1000, 800, 0, 0, inactivePointer, 150, 20, -10)
  assert.equal(particle.x, 523)
  assert.equal(particle.y, 395)
})

test('exact cursor overlap repels without producing non-finite coordinates', () => {
  const particle = stationaryParticle()
  simulate(particle, { x: 500, y: 400, active: true }, 2)
  assert.ok(particle.x > 525)
  for (const value of [particle.x, particle.y, particle.offsetX, particle.offsetY, particle.velocityX, particle.velocityY]) {
    assert.ok(Number.isFinite(value))
  }
})

test('repelled particles spring back to their orbit after the cursor leaves', () => {
  const particle = stationaryParticle()
  simulate(particle, { x: 480, y: 400, active: true }, 1)
  assert.ok(particle.offsetX > 30)
  simulate(particle, inactivePointer, 4)
  assert.ok(Math.abs(particle.offsetX) < 0.01)
  assert.ok(Math.abs(particle.velocityX) < 0.01)
  assert.equal(particle.y, 400)
})

test('particles at or outside the cursor radius receive no repulsion', () => {
  for (const distance of [150, 151, 500]) {
    const particle = stationaryParticle()
    simulate(particle, { x: 500 - distance, y: 400, active: true }, 1)
    assert.equal(particle.offsetX, 0)
    assert.equal(particle.offsetY, 0)
  }
})

test('cursor interaction follows the displayed position including depth parallax', () => {
  const particle = stationaryParticle()
  updateParticles([particle], 1000, 800, 1 / 60, 1 / 60, { x: 800, y: 400, active: true }, 150, 600, 0)
  assert.ok(particle.offsetX > 0)
  assert.ok(particle.x > 800)
})

test('orbit and spring response agree across common display refresh rates', () => {
  const particles = [30, 60, 120, 144].map((fps) => {
    const particle = stationaryParticle({ phase: 0.6, orbitRadius: 12, orbitSpeed: 0.15 })
    simulate(particle, { x: 495, y: 397, active: true }, 1, fps)
    return particle
  })

  for (const particle of particles.slice(1)) {
    assert.ok(Math.abs(particle.x - particles[0].x) < 1)
    assert.ok(Math.abs(particle.y - particles[0].y) < 1)
    assert.ok(Math.abs(particle.velocityX - particles[0].velocityX) < 1)
    assert.ok(Math.abs(particle.velocityY - particles[0].velocityY) < 1)
  }
})

test('a long frame cannot explode the spring or cause an unbounded jump', () => {
  const particle = stationaryParticle({ offsetX: 80, offsetY: -40, velocityX: 100, velocityY: -100 })
  updateParticles([particle], 1000, 800, 60, 60, inactivePointer, 150, 0, 0)
  assert.ok(Number.isFinite(particle.x) && Number.isFinite(particle.y))
  assert.ok(Math.abs(particle.offsetX) < 100 && Math.abs(particle.offsetY) < 100)
  simulate(particle, inactivePointer, 4)
  assert.ok(Math.hypot(particle.offsetX, particle.offsetY) < 0.01)
})
