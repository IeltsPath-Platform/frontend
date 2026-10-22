import * as THREE from 'three'
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import asteroidUrl from '../assets/asteroid.webp'
import cloudsUrl from '../assets/clouds.webp'
import earthUrl from '../assets/earth.webp'
import meteorUrl from '../assets/meteor.webp'
import owlBoostUrl from '../assets/owl-boost.webp'
import owlDizzyFrontUrl from '../assets/owl-dizzy-front.webp'
import owlRocketUrl from '../assets/owl-rocket.webp'
import planetBlueUrl from '../assets/planet-blue.webp'
import planetBrokenUrl from '../assets/planet-broken.webp'
import planetOrangeUrl from '../assets/planet-orange.webp'
import planetPurpleUrl from '../assets/planet-purple.webp'
import starUrl from '../assets/star.webp'
import { ease, lerp, Tweens } from './tween'

/**
 * 2.5D space scene: Figma raster layers on planes at different depths, seen through a perspective camera.
 * Layout uses Figma design units (frame 1440×1022, origin at centre, y up); each plane is scaled by
 * its depth so it appears at its designed size, while camera moves still give real parallax.
 */

const DESIGN_HEIGHT = 1022
const FOV = 40
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2))

type Box = { x: number; y: number; z: number; w: number; h: number }
/** `sx` squashes width only; it drives the 2.5D turn-around of the owl. */
type Offset = { x: number; y: number; s: number; sx: number; rot: number; opacity: number }

type Actor = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  base: Box
  offset: Offset
  idle: (t: number) => Partial<Offset>
}

type PlanetSlot = {
  actor: Actor
  halo: Actor
  label: CSS2DObject
  labelEl: HTMLElement
  texture: THREE.Texture
  tint: THREE.Color
}

export type RocketSceneOptions = {
  reducedMotion: boolean
  onPick: (index: number) => void
  onHover: (index: number | null) => void
}

const PLANET_LOOKS = [
  { url: planetOrangeUrl, tint: '#ffb347' },
  { url: planetPurpleUrl, tint: '#b47bff' },
  { url: planetBlueUrl, tint: '#4fc3ff' },
] as const

const freshOffset = (): Offset => ({ x: 0, y: 0, s: 1, sx: 1, rot: 0, opacity: 1 })

/**
 * Landmarks on owl-dizzy-front.webp as fractions of its width/height (from the top-left):
 * the two lenses that get spinning spiral eyes, and the centre of the star orbit above the cap.
 */
const DIZZY_EYES = [
  { u: 0.4628, v: 0.5995 },
  { u: 0.6765, v: 0.6907 },
] as const
const DIZZY_EYE_SIZE = 0.121
const DIZZY_ORBIT = { u: 0.596, v: 0.16, rx: 0.4, ry: 0.085, tilt: -0.1 }
const DIZZY_STARS = 4

export class RocketScene {
  private readonly host: HTMLElement
  private readonly options: RocketSceneOptions
  private readonly renderer: THREE.WebGLRenderer
  private readonly labels: CSS2DRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 1, 8000)
  private readonly tweens = new Tweens()
  private readonly clock = new THREE.Clock()
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2(0, 0)
  private readonly textures = new Map<string, THREE.Texture>()
  private readonly actors: Actor[] = []
  private readonly planets: PlanetSlot[] = []
  private readonly resizeObserver: ResizeObserver
  private frame = 0
  private distance = 1400
  private viewW = 1440
  private viewH = DESIGN_HEIGHT
  private portrait = false
  private hostHeight = DESIGN_HEIGHT
  /** Bottom edge of the DOM HUD in CSS px; planets and their labels stay below it. */
  private safeTopPx = 0
  private shake = 0
  private hovered: number | null = null
  private interactive = false
  private disposed = false
  private sky!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private stars!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>
  private debris!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private debrisVelocity = new Float32Array(0)
  private debrisLife = 0
  private owl!: Actor
  private flame!: Actor
  private flash!: Actor
  private meteor!: Actor
  private nextMeteorAt = 2
  private dizzy = { active: false, alpha: 0 }
  private dizzyEyes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = []
  private dizzyStars: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = []
  private layoutFns: Array<() => void> = []

  private constructor(host: HTMLElement, options: RocketSceneOptions) {
    this.host = host
    this.options = options
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.className = 'rocket-canvas'
    this.renderer.domElement.setAttribute('aria-hidden', 'true')
    host.appendChild(this.renderer.domElement)

    this.labels = new CSS2DRenderer()
    this.labels.domElement.className = 'rocket-labels'
    host.appendChild(this.labels.domElement)

    this.tweens.speed = options.reducedMotion ? 0.45 : 1
    this.resizeObserver = new ResizeObserver(() => this.resize())
  }

  /** Throws when WebGL is unavailable so the caller can fall back to the static background. */
  static async create(host: HTMLElement, options: RocketSceneOptions) {
    const scene = new RocketScene(host, options)
    try {
      await scene.load()
    } catch (error) {
      scene.dispose()
      throw error
    }
    if (scene.disposed) return scene
    scene.build()
    scene.resize()
    scene.resizeObserver.observe(host)
    host.addEventListener('pointermove', scene.handlePointerMove)
    host.addEventListener('pointerleave', scene.handlePointerLeave)
    host.addEventListener('click', scene.handleClick)
    document.addEventListener('visibilitychange', scene.handleVisibility)
    scene.clock.start()
    scene.loop()
    return scene
  }

  private async load() {
    const loader = new THREE.TextureLoader()
    const urls = [
      asteroidUrl, cloudsUrl, earthUrl, meteorUrl, owlBoostUrl, owlDizzyFrontUrl, owlRocketUrl,
      planetBlueUrl, planetBrokenUrl, planetOrangeUrl, planetPurpleUrl, starUrl,
    ]
    await Promise.all(
      urls.map(async (url) => {
        const texture = await loader.loadAsync(url)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 4
        this.textures.set(url, texture)
      }),
    )
  }

  private tex(url: string) {
    const texture = this.textures.get(url)
    if (!texture) throw new Error(`Missing texture ${url}`)
    return texture
  }

  private aspectOf(url: string) {
    const image = this.tex(url).image as { width: number; height: number }
    return image.height / image.width
  }

  // ---------- construction ----------

  private plane(map: THREE.Texture | null, order: number, additive = false) {
    const material = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
    mesh.renderOrder = order
    this.scene.add(mesh)
    return mesh
  }

  private actor(map: THREE.Texture | null, order: number, layout: () => Box, idle: Actor['idle'] = () => ({}), additive = false) {
    const actor: Actor = { mesh: this.plane(map, order, additive), base: layout(), offset: freshOffset(), idle }
    this.layoutFns.push(() => {
      actor.base = layout()
    })
    this.actors.push(actor)
    return actor
  }

  private build() {
    this.buildSky()
    this.buildStars()
    const top = (fromTop: number) => this.viewH / 2 - fromTop
    const bottom = (fromBottom: number) => -this.viewH / 2 + fromBottom
    const right = (fromRight: number) => this.viewW / 2 - fromRight

    this.meteor = this.actor(this.tex(meteorUrl), 3, () => ({ x: -this.viewW / 2 + 160, y: top(215), z: -900, w: 323, h: 323 * this.aspectOf(meteorUrl) }), undefined, true)
    this.meteor.offset.opacity = 0

    const earthRatio = this.aspectOf(earthUrl)
    this.actor(this.tex(earthUrl), 4, () => {
      const w = this.portrait ? 620 : 892
      return { x: this.portrait ? right(-60) : right(-135), y: this.portrait ? top(this.viewH * 0.62) : top(668), z: -500, w, h: w * earthRatio }
    }, (t) => ({ rot: t * 0.012 }))

    const glow = this.actor(radialTexture('rgba(90,150,255,0.9)'), 5, () => ({ x: 0, y: bottom(160), z: -60, w: this.portrait ? 900 : 1042, h: 700 }), undefined, true)
    glow.offset.opacity = 0.42

    this.actor(this.tex(asteroidUrl), 6, () => ({ x: this.portrait ? -330 : -220, y: bottom(285), z: -150, w: 72, h: 72 * this.aspectOf(asteroidUrl) }),
      (t) => ({ y: Math.sin(t * 0.9) * 8, rot: t * 0.25 }))
    this.actor(this.tex(starUrl), 6, () => ({ x: this.portrait ? 380 : 408, y: bottom(299), z: -100, w: 69, h: 69 }),
      (t) => ({ s: 1 + Math.sin(t * 2.1) * 0.08, rot: Math.sin(t * 0.7) * 0.15 }))
    this.actor(this.tex(starUrl), 6, () => ({ x: this.portrait ? -420 : -558, y: bottom(416), z: -100, w: 36, h: 36 }),
      (t) => ({ s: 1 + Math.sin(t * 2.7 + 1) * 0.12 }))

    PLANET_LOOKS.forEach((look, index) => this.buildPlanet(index, look.url, look.tint))

    this.flame = this.actor(radialTexture('rgba(255,190,80,1)'), 19, () => ({ ...this.owlBox(), y: this.owlBox().y - this.owlBox().h * 0.44, w: 150, h: 230 }),
      (t) => ({ s: 1 + Math.sin(t * 31) * 0.06 + Math.sin(t * 17) * 0.05 }), true)
    this.flame.offset.opacity = 0.75
    this.owl = this.actor(this.tex(owlRocketUrl), 20, () => this.owlBox(),
      (t) => ({ y: Math.sin(t * 2.2) * 7, rot: Math.sin(t * 1.3) * 0.02 }))

    const cloudsRatio = this.aspectOf(cloudsUrl)
    this.actor(this.tex(cloudsUrl), 30, () => {
      const w = Math.max(1468, this.viewW * 1.08)
      const h = w * cloudsRatio
      return { x: 14, y: bottom(h / 2 - 8), z: 120, w, h }
    }, (t) => ({ x: Math.sin(t * 0.15) * 12 }))
    const front = this.actor(this.tex(cloudsUrl), 31, () => {
      const w = Math.max(1600, this.viewW * 1.2)
      const h = w * cloudsRatio * 0.7
      return { x: -40, y: bottom(h / 2 - 90), z: 220, w: -w, h }
    }, (t) => ({ x: Math.sin(t * 0.11 + 2) * 18 }))
    front.offset.opacity = 0.55

    this.flash = this.actor(radialTexture('rgba(255,255,255,1)'), 40, () => ({ x: 0, y: 0, z: 10, w: 600, h: 600 }), undefined, true)
    this.flash.offset.opacity = 0
    this.buildDebris()
    this.buildDizzy()
  }

  private owlBox(): Box {
    const h = this.portrait ? 470 : 430
    return { x: 0, y: -this.viewH / 2 + 52 + h / 2, z: 60, w: h / this.aspectOf(owlRocketUrl), h }
  }

  private planetBox(index: number): Box {
    const ratio = this.aspectOf(PLANET_LOOKS[index].url)
    const unitsPerPx = this.viewH / this.hostHeight
    const w = this.portrait ? [330, 320, 360][index] : [392, 368, 460][index]
    const x = this.portrait ? [-330, 0, 330][index] : [-442, 0, 529][index]
    const h = w * ratio
    // The middle planet sits a little higher, as in Figma; side planets drop below the HUD with room for their labels.
    const stagger = index === 1 ? 0 : 60
    const belowHud = this.safeTopPx * unitsPerPx + 78 * unitsPerPx + h * 0.44 + stagger
    const designed = this.portrait ? this.viewH * [0.43, 0.37, 0.43][index] : [442, 375, 449][index]
    const fromTop = Math.max(designed, belowHud)
    return { x, y: this.viewH / 2 - fromTop, z: 0, w, h }
  }

  setSafeTop(px: number) {
    if (Math.abs(px - this.safeTopPx) < 1) return
    this.safeTopPx = px
    this.resize()
  }

  private buildPlanet(index: number, url: string, tint: string) {
    const color = new THREE.Color(tint)
    const halo = this.actor(radialTexture(tint), 9, () => {
      const box = this.planetBox(index)
      return { ...box, z: -5, w: box.w * 1.15, h: box.w * 1.15 }
    }, undefined, true)
    halo.offset.opacity = 0
    const actor = this.actor(this.tex(url), 10 + index, () => this.planetBox(index),
      (t) => ({ y: Math.sin(t * 1.1 + index * 2) * 7, rot: Math.sin(t * 0.45 + index) * 0.025 }))
    actor.mesh.userData.planetIndex = index

    const labelEl = document.createElement('div')
    labelEl.className = 'rocket-planet-label'
    labelEl.setAttribute('aria-hidden', 'true')
    labelEl.addEventListener('click', (event) => {
      event.stopPropagation()
      if (this.interactive) this.options.onPick(index)
    })
    labelEl.addEventListener('pointerenter', () => this.setHovered(index))
    labelEl.addEventListener('pointerleave', () => this.setHovered(null))
    const label = new CSS2DObject(labelEl)
    label.center.set(0.5, 1)
    this.scene.add(label)
    this.planets.push({ actor, halo, label, labelEl, texture: this.tex(url), tint: color })
  }

  private buildSky() {
    const material = new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec3 top = vec3(0.012,0.075,0.30);
          vec3 mid = vec3(0.024,0.137,0.50);
          vec3 low = vec3(0.10,0.30,0.86);
          float y = vUv.y;
          vec3 col = mix(low, mid, smoothstep(0.05, 0.55, y));
          col = mix(col, top, smoothstep(0.55, 1.0, y));
          float n = noise(vUv * vec2(3.0, 2.0) + vec2(uTime * 0.01, 0.0)) * noise(vUv * 6.0 - uTime * 0.008);
          col += vec3(0.25, 0.12, 0.45) * n * 0.35 * smoothstep(0.2, 0.8, y);
          col += vec3(0.12, 0.25, 0.65) * pow(1.0 - distance(vUv, vec2(0.5, 0.0)), 3.0) * 0.6;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    })
    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
    this.sky.renderOrder = 0
    this.scene.add(this.sky)
  }

  private buildStars() {
    const count = 650
    const position = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const phase = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      position[i * 3] = (Math.random() - 0.5) * 2
      position[i * 3 + 1] = (Math.random() - 0.5) * 2
      position[i * 3 + 2] = -1500 + Math.random() * 1200
      size[i] = Math.random() < 0.06 ? 7 + Math.random() * 6 : 1.2 + Math.random() * 2.4
      phase[i] = Math.random() * Math.PI * 2
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uSpan: { value: new THREE.Vector2(1600, 1200) },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
      },
      vertexShader: `
        attribute float aSize; attribute float aPhase;
        uniform float uTime; uniform float uScroll; uniform vec2 uSpan; uniform float uPixelRatio;
        varying float vTwinkle; varying float vBig;
        void main(){
          vec3 p = position;
          float depth = 1.0 + (-p.z) / 1400.0;
          p.x *= uSpan.x * 0.5 * depth;
          float spanY = uSpan.y * depth;
          p.y = mod(p.y * 0.5 * spanY - uScroll * (1.6 - depth * 0.5) + spanY * 0.5, spanY) - spanY * 0.5;
          vTwinkle = 0.55 + 0.45 * sin(uTime * (1.2 + fract(aPhase) * 2.0) + aPhase);
          vBig = step(6.0, aSize);
          gl_PointSize = aSize * uPixelRatio * (vBig > 0.5 ? (0.8 + 0.4 * vTwinkle) : 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        varying float vTwinkle; varying float vBig;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float core = smoothstep(0.5, 0.0, d);
          float cross = vBig * (smoothstep(0.06, 0.0, abs(c.x)) + smoothstep(0.06, 0.0, abs(c.y))) * smoothstep(0.5, 0.1, d);
          float a = (core * core + cross * 0.8) * vTwinkle;
          gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), a);
        }`,
    })
    this.stars = new THREE.Points(geometry, material)
    this.stars.renderOrder = 1
    this.scene.add(this.stars)
  }

  private buildDebris() {
    const count = 70
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    const material = new THREE.PointsMaterial({
      size: 16,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      map: radialTexture('rgba(255,255,255,1)'),
      blending: THREE.AdditiveBlending,
    })
    this.debris = new THREE.Points(geometry, material)
    this.debris.renderOrder = 39
    this.debrisVelocity = new Float32Array(count * 3)
    this.scene.add(this.debris)
  }

  // ---------- layout & loop ----------

  private resize() {
    if (this.disposed) return
    const width = Math.max(1, this.host.clientWidth)
    const height = Math.max(1, this.host.clientHeight)
    const aspect = width / height
    this.hostHeight = height
    this.portrait = aspect < 0.95
    const minWidth = this.portrait ? 1080 : 1440
    this.viewH = Math.max(DESIGN_HEIGHT, minWidth / aspect)
    this.viewW = this.viewH * aspect
    this.distance = this.viewH / 2 / TAN
    this.camera.aspect = aspect
    this.camera.position.set(0, 0, this.distance)
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    this.labels.setSize(width, height)
    this.layoutFns.forEach((fn) => fn())

    const skyDepth = 2600
    const k = (this.distance + skyDepth) / this.distance
    this.sky.position.set(0, 0, -skyDepth)
    this.sky.scale.set(this.viewW * k * 1.2, this.viewH * k * 1.2, 1)
    this.stars.material.uniforms.uSpan.value.set(this.viewW * 1.3, this.viewH * 1.3)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
  }

  private loop = () => {
    if (this.disposed) return
    this.frame = requestAnimationFrame(this.loop)
    if (document.hidden) return
    const t = this.clock.getElapsedTime()
    this.tweens.tick(t)
    this.sky.material.uniforms.uTime.value = t
    this.stars.material.uniforms.uTime.value = t

    const motion = this.options.reducedMotion ? 0.3 : 1
    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 26 : 0
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 18 : 0
    this.camera.position.x = lerp(this.camera.position.x, this.pointer.x * 28 * motion, 0.05) + shakeX
    this.camera.position.y = lerp(this.camera.position.y, this.pointer.y * 16 * motion, 0.05) + shakeY

    for (const actor of this.actors) this.apply(actor, t, motion)
    this.updateLabels()
    this.updateMeteor(t)
    this.updateDizzy(t)
    this.updateDebris()

    this.renderer.render(this.scene, this.camera)
    this.labels.render(this.scene, this.camera)
  }

  private apply(actor: Actor, t: number, motion: number) {
    const idle = actor.idle(t)
    const k = (this.distance - actor.base.z) / this.distance
    const s = actor.offset.s * (1 + ((idle.s ?? 1) - 1) * motion)
    actor.mesh.position.set(
      (actor.base.x + actor.offset.x + (idle.x ?? 0) * motion) * k,
      (actor.base.y + actor.offset.y + (idle.y ?? 0) * motion) * k,
      actor.base.z,
    )
    actor.mesh.scale.set(actor.base.w * k * s * actor.offset.sx, actor.base.h * k * s, 1)
    actor.mesh.rotation.z = actor.offset.rot + (idle.rot ?? 0) * motion
    actor.mesh.material.opacity = actor.offset.opacity
    actor.mesh.visible = actor.offset.opacity > 0.002
  }

  private updateLabels() {
    this.planets.forEach((planet) => {
      const { mesh } = planet.actor
      planet.label.position.set(mesh.position.x, mesh.position.y + Math.abs(mesh.scale.y) * 0.44, mesh.position.z + 1)
      planet.labelEl.style.opacity = String(planet.actor.offset.opacity ** 2)
    })
  }

  private updateMeteor(t: number) {
    if (t < this.nextMeteorAt) return
    this.nextMeteorAt = t + 6 + Math.random() * 6
    const meteor = this.meteor
    const startX = Math.random() * 240
    void this.tweens.run(1400, (p) => {
      meteor.offset.x = startX - p * 420
      meteor.offset.y = -p * 230
      meteor.offset.opacity = Math.sin(p * Math.PI) * 0.9
    }, ease.linear)
  }

  private updateDebris() {
    if (this.debrisLife <= 0) return
    this.debrisLife -= 1 / 60
    const attr = this.debris.geometry.getAttribute('position') as THREE.BufferAttribute
    const array = attr.array as Float32Array
    for (let i = 0; i < array.length; i += 3) {
      array[i] += this.debrisVelocity[i]
      array[i + 1] += this.debrisVelocity[i + 1]
      this.debrisVelocity[i] *= 0.97
      this.debrisVelocity[i + 1] = this.debrisVelocity[i + 1] * 0.97 - 0.12
    }
    attr.needsUpdate = true
    this.debris.material.opacity = Math.max(0, Math.min(1, this.debrisLife * 1.4))
  }

  // ---------- input ----------

  private handlePointerMove = (event: PointerEvent) => {
    const rect = this.host.getBoundingClientRect()
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1))
    if (!this.interactive || (event.target instanceof HTMLElement && event.target.closest('.rocket-planet-label'))) return
    this.setHovered(this.pick())
  }

  private handlePointerLeave = () => {
    this.pointer.set(0, 0)
    this.setHovered(null)
  }

  private handleClick = (event: MouseEvent) => {
    if (!this.interactive || !(event.target instanceof HTMLCanvasElement || (event.target as HTMLElement)?.classList?.contains('rocket-labels'))) return
    const index = this.pick()
    if (index !== null) this.options.onPick(index)
  }

  private handleVisibility = () => {
    if (!document.hidden) this.clock.getDelta()
  }

  private pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const meshes = this.planets.map((planet) => planet.actor.mesh)
    const hit = this.raycaster.intersectObjects(meshes, false)[0]
    if (!hit) return null
    const index = hit.object.userData.planetIndex as number | undefined
    return typeof index === 'number' ? index : null
  }

  private setHovered(index: number | null) {
    if (!this.interactive && index !== null) return
    if (this.hovered === index) return
    this.hovered = index
    this.host.style.cursor = index === null ? '' : 'pointer'
    this.options.onHover(index)
  }

  // ---------- public choreography ----------

  /** Highlight from the HUD (keyboard focus or button hover) or the scene's own pointer. */
  highlight(index: number | null) {
    this.planets.forEach((planet, i) => {
      const on = i === index
      planet.labelEl.classList.toggle('is-hover', on)
      void this.tweens.run(200, (p) => {
        planet.halo.offset.opacity = lerp(planet.halo.offset.opacity, on ? 0.55 : 0, p)
        planet.actor.offset.s = lerp(planet.actor.offset.s, on ? 1.07 : 1, p)
      }, ease.outCubic)
    })
    const target = index === null ? 0 : (this.planets[index].actor.base.x - this.owl.base.x) / 900
    void this.tweens.run(260, (p) => {
      this.owl.offset.rot = lerp(this.owl.offset.rot, -target * 0.5, p)
    }, ease.outCubic)
  }

  async showRound(words: string[]) {
    this.tweens.finishAll()
    this.interactive = false
    this.resetOwl()
    this.planets.forEach((planet, i) => {
      planet.labelEl.textContent = words[i] ?? ''
      planet.labelEl.className = 'rocket-planet-label'
      planet.actor.mesh.material.map = planet.texture
      planet.actor.mesh.material.needsUpdate = true
      planet.actor.base = this.planetBox(i)
      Object.assign(planet.actor.offset, { x: 0, y: 520, s: 0.6, rot: 0, opacity: 0 })
      planet.halo.offset.opacity = 0
    })
    await Promise.all(
      this.planets.map((planet, i) =>
        this.tweens.wait(i * 110).then(() =>
          this.tweens.run(720, (p) => {
            planet.actor.offset.y = lerp(520, 0, p)
            planet.actor.offset.s = lerp(0.6, 1, p)
            planet.actor.offset.opacity = Math.min(1, p * 1.6)
          }, ease.outBack),
        ),
      ),
    )
    this.interactive = true
  }

  /** Owl flies toward the chosen planet and hovers there until the server answers. */
  async launch(index: number) {
    this.interactive = false
    this.setHovered(null)
    this.planets.forEach((planet, i) => planet.labelEl.classList.toggle('is-chosen', i === index))
    const planet = this.planets[index].actor
    const dx = planet.base.x - this.owl.base.x
    const dy = planet.base.y - this.owl.base.y - planet.base.h * 0.15
    const tilt = -Math.atan2(dx, Math.max(200, dy)) * 0.9
    const startRot = this.owl.offset.rot
    await this.tweens.run(650, (p) => {
      this.owl.offset.x = dx * p
      this.owl.offset.y = dy * p
      this.owl.offset.s = lerp(1, 0.78, p)
      this.owl.offset.rot = lerp(startRot, tilt, Math.sin(p * Math.PI * 0.9))
      this.flame.offset.x = this.owl.offset.x
      this.flame.offset.y = this.owl.offset.y
      this.flame.offset.s = lerp(1, 1.5, p)
      this.flame.offset.opacity = 0.95
    }, ease.inOutCubic)
  }

  async revealCorrect(index: number) {
    const slot = this.planets[index]
    const planet = slot.actor
    slot.labelEl.classList.add('is-correct')
    this.planets.forEach((other, i) => {
      if (i !== index) void this.tweens.run(300, (p) => { other.actor.offset.opacity = lerp(1, 0.35, p) })
    })
    planet.mesh.material.map = this.tex(planetBrokenUrl)
    planet.mesh.material.needsUpdate = true
    const brokenRatio = this.aspectOf(planetBrokenUrl)
    const baseW = planet.base.w
    planet.base = { ...planet.base, w: baseW * 1.35, h: baseW * 1.35 * brokenRatio }
    this.burst(planet, slot.tint)
    this.owl.mesh.material.map = this.tex(owlBoostUrl)
    this.owl.mesh.material.needsUpdate = true
    const boostRatio = this.aspectOf(owlBoostUrl)
    this.owl.base = { ...this.owl.base, w: this.owl.base.h * 1.25, h: this.owl.base.h * 1.25 * boostRatio }
    this.flame.offset.opacity = 0
    const startY = this.owl.offset.y
    const startX = this.owl.offset.x
    await Promise.all([
      this.tweens.run(900, (p) => {
        planet.offset.s = lerp(1.15, 1.3, p)
        planet.offset.opacity = 1 - ease.inCubic(p) * 0.6
      }, ease.outCubic),
      this.tweens.run(1100, (p) => {
        this.owl.offset.x = startX + p * 160
        this.owl.offset.y = startY + p * 520
        this.owl.offset.s = lerp(0.95, 0.55, p)
        this.owl.offset.rot = 0
        this.owl.offset.opacity = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3
      }, ease.inCubic),
    ])
  }

  /**
   * Wrong pick (or `chosen` null for a timeout): the owl bonks into the chosen planet, which swells into
   * view, then turns round to face the player — dizzy, spiral eyes spinning, stars circling its head.
   */
  async revealWrong(chosen: number | null, correct: number) {
    this.planets[correct].labelEl.classList.add('is-answer')
    void this.tweens.run(400, (p) => { this.planets[correct].halo.offset.opacity = p * 0.7 })
    this.flame.offset.opacity = 0
    this.planets.forEach((other, i) => {
      if (i !== chosen && i !== correct) void this.tweens.run(300, (p) => { other.actor.offset.opacity = lerp(1, 0.4, p) })
    })
    if (chosen === null) {
      this.kick(0.6)
      await this.tweens.run(320, (p) => { this.owl.offset.y = Math.sin(p * Math.PI) * -30 }, ease.outCubic)
      await this.turnToPlayer()
      await this.tweens.wait(450)
      return
    }
    this.planets[chosen].labelEl.classList.add('is-wrong')
    const planet = this.planets[chosen].actor
    const ox = this.owl.offset.x
    const oy = this.owl.offset.y
    this.kick(1)
    await Promise.all([
      this.tweens.run(700, (p) => {
        planet.offset.s = lerp(1, 1.55, p)
        planet.offset.x = lerp(0, -planet.base.x * 0.55, p)
        planet.offset.y = lerp(0, -40, p)
      }, ease.outCubic),
      this.tweens.run(700, (p) => {
        const bounce = Math.sin(p * Math.PI) * 60
        this.owl.offset.x = lerp(ox, ox - planet.base.x * 0.55, p)
        this.owl.offset.y = oy - bounce - p * 90
        this.owl.offset.s = lerp(0.78, 0.9, p)
        this.owl.offset.rot = Math.sin(p * Math.PI * 4) * 0.12 * (1 - p)
      }, ease.outCubic),
      this.tweens.wait(330).then(() => this.turnToPlayer()),
    ])
    // Let the dizzy spell play before the HUD moves on.
    await this.tweens.wait(800)
  }

  /** Squash the rear-view owl to a sliver, swap in the front-facing dizzy owl, and spring it back open. */
  private async turnToPlayer() {
    await this.tweens.run(150, (p) => { this.owl.offset.sx = 1 - p }, ease.inCubic)
    this.owl.mesh.material.map = this.tex(owlDizzyFrontUrl)
    this.owl.mesh.material.needsUpdate = true
    const w = this.owlBox().h * 1.3
    this.owl.base = { ...this.owl.base, w, h: w * this.aspectOf(owlDizzyFrontUrl) }
    this.dizzy.active = true
    void this.tweens.run(300, (p) => { this.dizzy.alpha = p }, ease.outCubic)
    await this.tweens.run(420, (p) => { this.owl.offset.sx = p }, ease.outBack)
  }

  /** Clear the round: planets drift up and out, stars stream past, owl returns to the launch pad. */
  async travel() {
    this.interactive = false
    this.planets.forEach((planet) => planet.labelEl.classList.remove('is-hover'))
    const starsStart = this.stars.material.uniforms.uScroll.value as number
    await Promise.all([
      ...this.planets.map((planet) => {
        const y = planet.actor.offset.y
        const o = planet.actor.offset.opacity
        return this.tweens.run(650, (p) => {
          planet.actor.offset.y = y - p * 700
          planet.actor.offset.opacity = o * (1 - p)
          planet.halo.offset.opacity *= 1 - p
        }, ease.inCubic)
      }),
      this.tweens.run(1000, (p) => {
        this.stars.material.uniforms.uScroll.value = starsStart + p * 900
      }, ease.inOutCubic),
      this.tweens.run(500, (p) => { this.owl.offset.opacity = Math.min(this.owl.offset.opacity, 1 - p) }),
    ])
    this.resetOwl()
    this.owl.offset.y = -420
    this.flame.offset.y = -420
    this.owl.offset.opacity = 1
    await this.tweens.run(500, (p) => {
      this.owl.offset.y = lerp(-420, 0, p)
      this.flame.offset.y = this.owl.offset.y
    }, ease.outCubic)
  }

  /** Planets leave and the owl idles; used behind the setup card and the end screens. */
  async idle() {
    this.interactive = false
    this.planets.forEach((planet) => {
      void this.tweens.run(400, (p) => { planet.actor.offset.opacity *= 1 - p })
    })
    this.resetOwl()
  }

  private resetOwl() {
    this.dizzy.active = false
    this.dizzy.alpha = 0
    this.owl.mesh.material.map = this.tex(owlRocketUrl)
    this.owl.mesh.material.needsUpdate = true
    this.owl.base = this.owlBox()
    Object.assign(this.owl.offset, freshOffset())
    Object.assign(this.flame.offset, { ...freshOffset(), opacity: 0.75 })
  }

  private kick(strength: number) {
    if (this.options.reducedMotion) return
    void this.tweens.run(450, (p) => { this.shake = strength * (1 - p) }, ease.linear).then(() => { this.shake = 0 })
  }

  private burst(planet: Actor, tint: THREE.Color) {
    const attr = this.debris.geometry.getAttribute('position') as THREE.BufferAttribute
    const array = attr.array as Float32Array
    const k = (this.distance - planet.base.z) / this.distance
    for (let i = 0; i < array.length; i += 3) {
      array[i] = (planet.base.x + planet.offset.x) * k
      array[i + 1] = (planet.base.y + planet.offset.y) * k
      array[i + 2] = 20
      const angle = Math.random() * Math.PI * 2
      const speed = 6 + Math.random() * 14
      this.debrisVelocity[i] = Math.cos(angle) * speed
      this.debrisVelocity[i + 1] = Math.sin(angle) * speed + 2
    }
    attr.needsUpdate = true
    this.debris.material.color.copy(tint).lerp(new THREE.Color('#ffffff'), 0.35)
    this.debrisLife = 1.3
    this.flash.base = { x: planet.base.x + planet.offset.x, y: planet.base.y + planet.offset.y, z: 10, w: planet.base.w * 1.4, h: planet.base.w * 1.4 }
    void this.tweens.run(450, (p) => {
      this.flash.offset.s = lerp(0.3, 1.6, p)
      this.flash.offset.opacity = (1 - p) * 0.95
    }, ease.outCubic)
    this.kick(0.5)
  }

  private buildDizzy() {
    const eyeTexture = spiralTexture()
    this.dizzyEyes = DIZZY_EYES.map(() => {
      const mesh = this.plane(eyeTexture, 21)
      mesh.visible = false
      return mesh
    })
    this.dizzyStars = Array.from({ length: DIZZY_STARS }, () => {
      const mesh = this.plane(this.tex(starUrl), 22)
      mesh.visible = false
      return mesh
    })
  }

  /** Place the spiral eyes and orbiting stars on the front-facing owl, following its live transform. */
  private updateDizzy(t: number) {
    const alpha = this.dizzy.active ? this.dizzy.alpha * this.owl.offset.opacity : 0
    const show = alpha > 0.01
    for (const mesh of [...this.dizzyEyes, ...this.dizzyStars]) mesh.visible = show
    if (!show) return
    if (!this.options.reducedMotion) this.owl.offset.rot = Math.sin(t * 2.4) * 0.06
    const { position, scale, rotation } = this.owl.mesh
    const width = Math.abs(scale.x)
    const cos = Math.cos(rotation.z)
    const sin = Math.sin(rotation.z)
    const toWorld = (u: number, v: number, out: THREE.Vector3) => {
      const lx = (u - 0.5) * scale.x
      const ly = (0.5 - v) * scale.y
      return out.set(position.x + lx * cos - ly * sin, position.y + lx * sin + ly * cos, position.z + 1)
    }
    const spin = this.options.reducedMotion ? 2 : 7
    this.dizzyEyes.forEach((mesh, i) => {
      toWorld(DIZZY_EYES[i].u, DIZZY_EYES[i].v, mesh.position)
      const size = DIZZY_EYE_SIZE * this.owl.base.w * (scale.y / this.owl.base.h)
      mesh.scale.set(size * this.owl.offset.sx, size, 1)
      mesh.rotation.z = -t * spin * (i === 0 ? 1 : 1.15)
      mesh.material.opacity = alpha
    })
    const centre = toWorld(DIZZY_ORBIT.u, DIZZY_ORBIT.v, new THREE.Vector3())
    const tilt = rotation.z + DIZZY_ORBIT.tilt
    const speed = this.options.reducedMotion ? 0.8 : 2.6
    this.dizzyStars.forEach((mesh, i) => {
      const angle = t * speed + (i / DIZZY_STARS) * Math.PI * 2
      const ex = Math.cos(angle) * DIZZY_ORBIT.rx * width
      const ey = Math.sin(angle) * DIZZY_ORBIT.ry * width
      // The lower half of the ellipse is nearer the viewer: draw it over the head, bigger and brighter.
      const front = Math.sin(angle) < 0
      const depth = front ? 1 : 0.7
      mesh.position.set(
        centre.x + ex * Math.cos(tilt) - ey * Math.sin(tilt),
        centre.y + ex * Math.sin(tilt) + ey * Math.cos(tilt),
        centre.z + (front ? 2 : -2),
      )
      const size = 0.09 * width * depth * (1 + Math.sin(t * 6 + i) * 0.08)
      mesh.scale.set(size, size, 1)
      mesh.rotation.z = t * 3 + i
      mesh.renderOrder = front ? 23 : 19
      mesh.material.opacity = alpha * (front ? 1 : 0.75)
    })
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.host.removeEventListener('pointermove', this.handlePointerMove)
    this.host.removeEventListener('pointerleave', this.handlePointerLeave)
    this.host.removeEventListener('click', this.handleClick)
    document.removeEventListener('visibilitychange', this.handleVisibility)
    this.host.style.cursor = ''
    // Image textures are disposed below; the small shared glow canvases stay cached for the next mount.
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      mesh.geometry?.dispose()
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      for (const item of Array.isArray(material) ? material : material ? [material] : []) item.dispose()
    })
    this.textures.forEach((texture) => texture.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.labels.domElement.remove()
  }
}

const radialCache = new Map<string, THREE.Texture>()

/** Soft round gradient used for glows, halos, flame and debris. */
function radialTexture(color: string) {
  const cached = radialCache.get(color)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  radialCache.set(color, texture)
  return texture
}

let spiralCache: THREE.Texture | null = null

/** A spiral on a soft lens-coloured disc, spun over the owl's glasses. */
function spiralTexture() {
  if (spiralCache) return spiralCache
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const c = size / 2
    const disc = ctx.createRadialGradient(c, c, 0, c, c, c)
    disc.addColorStop(0, 'rgba(250,246,255,1)')
    disc.addColorStop(0.8, 'rgba(250,246,255,1)')
    disc.addColorStop(1, 'rgba(250,246,255,0)')
    ctx.fillStyle = disc
    ctx.fillRect(0, 0, size, size)
    const r = c / 1.22
    ctx.strokeStyle = '#1a1f4a'
    ctx.lineWidth = r * 0.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    const turns = 2.6
    for (let i = 0; i <= 240; i += 1) {
      const step = i / 240
      const angle = step * turns * Math.PI * 2
      const radius = r * (0.12 + 0.88 * step)
      const x = c + radius * Math.cos(angle)
      const y = c + radius * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.fillStyle = '#1a1f4a'
    ctx.beginPath()
    ctx.arc(c, c, r * 0.16, 0, Math.PI * 2)
    ctx.fill()
  }
  spiralCache = new THREE.CanvasTexture(canvas)
  spiralCache.colorSpace = THREE.SRGBColorSpace
  return spiralCache
}
