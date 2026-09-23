import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

type InteractiveDinoProps = {
  className?: string
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    child.geometry.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => material.dispose())
  })
}

export function InteractiveDino({ className }: InteractiveDinoProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 0.5, 6.4)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.enablePan = true
    controls.panSpeed = 0.35
    controls.enableZoom = false
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.15
    controls.minAzimuthAngle = -Math.PI / 3
    controls.maxAzimuthAngle = Math.PI / 3
    controls.minPolarAngle = Math.PI / 3.3
    controls.maxPolarAngle = Math.PI / 1.75
    controls.target.set(0, 0.15, 0)

    scene.add(new THREE.HemisphereLight(0xfff3d1, 0x315a63, 2.2))
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2)
    keyLight.position.set(3.5, 5, 4)
    scene.add(keyLight)
    const rimLight = new THREE.DirectionalLight(0xffb04a, 2)
    rimLight.position.set(-4, 1.5, -3)
    scene.add(rimLight)

    const dino = new THREE.Group()
    const body = new THREE.MeshStandardMaterial({ color: 0xe8a83a, roughness: 0.58, metalness: 0.03 })
    const belly = new THREE.MeshStandardMaterial({ color: 0xffd47b, roughness: 0.7 })
    const horn = new THREE.MeshStandardMaterial({ color: 0xfff1cf, roughness: 0.55 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x382319, roughness: 0.4 })
    const eye = new THREE.MeshStandardMaterial({ color: 0x24130f, roughness: 0.22, metalness: 0.08 })

    const addMesh = (geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], scale?: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...position)
      if (scale) mesh.scale.set(...scale)
      dino.add(mesh)
      return mesh
    }

    addMesh(new THREE.SphereGeometry(1, 28, 20), body, [0, -0.18, 0], [1.22, 0.78, 0.92])
    addMesh(new THREE.SphereGeometry(0.81, 28, 20), body, [0, 0.6, 0.35], [1, 0.92, 0.85])
    addMesh(new THREE.SphereGeometry(0.48, 24, 16), belly, [0, -0.12, 0.75], [1.22, 0.82, 0.32])

    ;[-0.58, 0.58].forEach((x) => {
      addMesh(new THREE.SphereGeometry(0.28, 18, 14), body, [x, -0.72, 0.38], [1, 0.72, 0.94])
    })

    const tail = addMesh(new THREE.ConeGeometry(0.34, 1.48, 16), body, [0, -0.25, -0.98], [1, 1, 1])
    tail.rotation.x = -Math.PI / 2.15

    const addHorn = (position: [number, number, number], scale: number) => {
      const mesh = addMesh(new THREE.ConeGeometry(0.15, 0.62, 16), horn, position, [scale, scale, scale])
      mesh.rotation.x = Math.PI / 2
    }
    addHorn([-0.34, 0.95, 0.92], 1)
    addHorn([0.34, 0.95, 0.92], 1)
    addHorn([0, 0.48, 1.1], 0.62)

    ;[-0.28, 0.28].forEach((x) => {
      addMesh(new THREE.SphereGeometry(0.13, 16, 12), eye, [x, 0.65, 1.02])
      const ring = addMesh(new THREE.TorusGeometry(0.24, 0.035, 10, 24), dark, [x, 0.66, 1.04])
      ring.rotation.x = 0
    })
    const bridge = addMesh(new THREE.BoxGeometry(0.18, 0.035, 0.04), dark, [0, 0.66, 1.04])
    bridge.rotation.z = 0

    ;[-0.66, -0.34, 0.34, 0.66].forEach((x, index) => {
      const spike = addMesh(new THREE.ConeGeometry(0.12, 0.36, 12), horn, [x, 0.7 - Math.abs(x) * 0.38, -0.55 + index * 0.08])
      spike.rotation.z = index < 2 ? 0.55 : -0.55
    })

    dino.rotation.y = -0.15
    scene.add(dino)

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.28, 32),
      new THREE.MeshBasicMaterial({ color: 0x6c3d1f, transparent: true, opacity: 0.16 }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -0.94
    shadow.scale.set(1.2, 0.56, 1)
    scene.add(shadow)

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let animationFrame = 0
    let isDragging = false

    const render = () => renderer.render(scene, camera)
    const animate = (time: number) => {
      if (!reducedMotion) {
        dino.position.y = Math.sin(time * 0.0016) * 0.08
        controls.autoRotate = !isDragging
        controls.update()
      }
      render()
      animationFrame = window.requestAnimationFrame(animate)
    }

    controls.addEventListener("start", () => { isDragging = true })
    controls.addEventListener("end", () => { isDragging = false })
    controls.addEventListener("change", render)

    const resize = () => {
      const { width, height } = host.getBoundingClientRect()
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      render()
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()
    if (!reducedMotion) animationFrame = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      controls.dispose()
      disposeObject(dino)
      shadow.geometry.dispose()
      ;(shadow.material as THREE.Material).dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div className={className} ref={hostRef} role="img" aria-label="Mô hình 3D linh vật khủng long. Kéo để xoay; dùng chuột phải hoặc hai ngón để di chuyển khung nhìn.">
      <span className="interactive-dino__hint" aria-hidden="true">Kéo để xoay · 2 ngón để di chuyển</span>
    </div>
  )
}
