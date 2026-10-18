import { useId } from 'react'

interface Palette {
  skyTop: string
  skyBottom: string
  sun: string
  far: string
  mid: string
  midShade: string
  near: string
  pine: string
  haze: string
  cloud: string
  stars: boolean
}

/** Time of day follows the band: low bands start at dawn, the highest end under the stars. */
const PALETTES: Record<'dawn' | 'day' | 'dusk' | 'night', Palette> = {
  dawn: { skyTop: '#a9c6ff', skyBottom: '#ffe3c8', sun: '#ff9a4d', far: '#b3c6f3', mid: '#6b8fe3', midShade: '#4f74cf', near: '#2447c0', pine: '#17338f', haze: '#ffe9d6', cloud: '#ffffff', stars: false },
  day: { skyTop: '#7fb0ff', skyBottom: '#e9f2ff', sun: '#fff0a8', far: '#93b1f2', mid: '#4d76de', midShade: '#3659c4', near: '#123ab5', pine: '#0b2a8a', haze: '#e6f0ff', cloud: '#ffffff', stars: false },
  dusk: { skyTop: '#33509f', skyBottom: '#ffae7a', sun: '#ffd9a3', far: '#6a73bd', mid: '#3a4ba0', midShade: '#2a3a86', near: '#1b2a73', pine: '#121d57', haze: '#ffc9a4', cloud: '#ffd2b8', stars: false },
  night: { skyTop: '#081340', skyBottom: '#3a4ea8', sun: '#f4f1e8', far: '#3a4ea8', mid: '#25368a', midShade: '#1a2970', near: '#0c1b4d', pine: '#070f33', haze: '#4a5fbd', cloud: '#7f90d6', stars: true },
}

function paletteFor(band: number): Palette {
  if (band < 6) return PALETTES.dawn
  if (band < 7) return PALETTES.day
  if (band < 8) return PALETTES.dusk
  return PALETTES.night
}

const STARS: Array<[number, number, number]> = [
  [34, 26, 1.6], [78, 52, 1.2], [132, 20, 1.4], [176, 44, 1.1], [212, 18, 1.5], [268, 40, 1.3], [300, 70, 1.1], [58, 84, 1],
]

/** A small pine: three stacked triangles on a trunk. `x` is the trunk centre, `y` the ground line. */
function Pine({ x, y, h, fill }: { x: number; y: number; h: number; fill: string }) {
  const w = h * 0.46
  return (
    <g fill={fill}>
      <polygon points={`${x},${y - h} ${x + w * 0.5},${y - h * 0.52} ${x - w * 0.5},${y - h * 0.52}`} />
      <polygon points={`${x},${y - h * 0.72} ${x + w * 0.65},${y - h * 0.2} ${x - w * 0.65},${y - h * 0.2}`} />
      <rect height={h * 0.2} width={h * 0.07} x={x - h * 0.035} y={y - h * 0.2} />
    </g>
  )
}

/**
 * Decorative mountain scene. The summit rises with the band (4.0 low, 9.0 high) and carries a flag.
 * `wide` lays the scene out for a banner: the summit moves right and the left is open sky for text.
 */
export function CourseArt({ band, wide = false }: { band: number; wide?: boolean }) {
  const uid = useId().replace(/:/g, '')
  const p = paletteFor(band)
  const tier = Math.min(Math.max((band - 4) / 5, 0), 1)
  const W = wide ? 640 : 320
  const apexY = Math.round(112 - tier * 62)
  const apexX = wide ? 478 : 172
  const sideApexY = apexY + 34
  const sideApexX = wide ? 340 : 66
  const baseL = wide ? 250 : 170
  const baseR = wide ? 170 : 150
  const sunX = wide ? 400 : 48
  const sunY = wide ? 60 : 104
  const trail = `M ${apexX - 80} 208 C ${apexX - 58} 192, ${apexX - 60} 178, ${apexX - 38} 170 S ${apexX - 20} 150, ${apexX - 8} ${apexY + 24} S ${apexX - 4} ${apexY + 8}, ${apexX} ${apexY + 2}`
  const nearHill = wide
    ? 'M -10 200 C 90 168, 200 176, 300 192 C 400 176, 540 170, 660 190 L 660 210 L -10 210 Z'
    : 'M -10 200 C 40 168, 100 176, 150 192 C 200 176, 270 170, 330 190 L 330 210 L -10 210 Z'
  const starScale = W / 320

  return (
    <svg
      aria-hidden="true"
      className="lp-art"
      focusable="false"
      preserveAspectRatio={wide ? 'xMaxYMid slice' : 'xMidYMid slice'}
      viewBox={`0 0 ${W} 200`}
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="1" stopColor={p.skyBottom} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={p.sun} stopOpacity=".55" />
          <stop offset="1" stopColor={p.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-haze`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={p.haze} stopOpacity="0" />
          <stop offset="1" stopColor={p.haze} stopOpacity=".7" />
        </linearGradient>
      </defs>

      <rect fill={`url(#${uid}-sky)`} height="200" width={W} />

      {p.stars
        ? STARS.map(([x, y, r]) => <circle cx={x * starScale} cy={y} fill="#fff" key={`${x}-${y}`} opacity=".85" r={r} />)
        : null}

      <circle cx={sunX} cy={sunY} fill={`url(#${uid}-glow)`} r="62" />
      <circle cx={sunX} cy={sunY} fill={p.sun} r="19" />

      <g fill={p.cloud} opacity={p.stars ? 0.3 : 0.85}>
        <ellipse cx={wide ? 556 : 236} cy="84" rx="26" ry="6.5" />
        <ellipse cx={wide ? 576 : 256} cy="78" rx="16" ry="6.5" />
        <ellipse cx={wide ? 352 : 108} cy="100" rx="20" ry="5" />
        {wide ? <ellipse cx="600" cy="34" rx="22" ry="5.5" /> : null}
      </g>

      <g fill="none" opacity={p.stars ? 0.5 : 0.55} stroke={p.stars ? '#dfe6ff' : '#2c3f95'} strokeLinecap="round" strokeWidth="1.4">
        <path d={`M ${wide ? 452 : 206} ${wide ? 40 : 66} q 4 -5 8 0 q 4 -5 8 0`} />
        <path d={`M ${wide ? 512 : 230} ${wide ? 30 : 56} q 3 -4 6 0 q 3 -4 6 0`} />
      </g>

      <polygon fill={p.far} points={`-40,200 ${sideApexX},${sideApexY} ${sideApexX + 110},200`} />
      {wide ? <polygon fill={p.far} opacity=".6" points={`40,200 150,${sideApexY + 30} 260,200`} /> : null}
      <polygon fill={p.far} opacity=".7" points={`${W - 84},200 ${W - 36},${sideApexY + 26} ${W + 24},200`} />
      <rect fill={`url(#${uid}-haze)`} height="70" width={W} y="130" />

      <polygon fill={p.mid} points={`${apexX - baseL},200 ${apexX},${apexY} ${apexX + baseR},200`} />
      <path d={`M ${apexX} ${apexY} L ${apexX + baseR} 200 L ${apexX + 20} 200 Z`} fill={p.midShade} />
      {tier > 0.25 ? (
        <>
          <polygon fill="#fff" points={`${apexX},${apexY} ${apexX - 17},${apexY + 24} ${apexX - 7},${apexY + 20} ${apexX},${apexY + 28} ${apexX + 8},${apexY + 20} ${apexX + 17},${apexY + 24}`} />
          <polygon fill="#cdd9ff" opacity=".85" points={`${apexX},${apexY} ${apexX + 17},${apexY + 24} ${apexX + 8},${apexY + 20} ${apexX},${apexY + 28}`} />
        </>
      ) : null}

      <path d={trail} fill="none" opacity=".9" stroke="#fff" strokeDasharray="2 7" strokeLinecap="round" strokeWidth="2.4" />

      <path d={nearHill} fill={p.near} />
      <Pine fill={p.pine} h={30} x={wide ? 46 : 26} y={192} />
      <Pine fill={p.pine} h={22} x={wide ? 68 : 46} y={196} />
      <Pine fill={p.pine} h={26} x={W - 34} y={190} />
      <Pine fill={p.pine} h={18} x={W - 16} y={194} />
      {wide ? <Pine fill={p.pine} h={20} x={236} y={196} /> : null}

      <g>
        <line stroke="#fff" strokeLinecap="round" strokeWidth="2.2" x1={apexX} x2={apexX} y1={apexY} y2={apexY - 24} />
        <polygon fill="#ff7624" points={`${apexX},${apexY - 24} ${apexX + 17},${apexY - 18} ${apexX},${apexY - 12}`} />
      </g>
    </svg>
  )
}
