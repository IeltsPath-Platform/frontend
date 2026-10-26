import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Columns2, PanelLeft, PanelRight } from 'lucide-react'

const MIN_LEFT = 30
const MAX_LEFT = 75
const DEFAULT_LEFT = 58
const KEY_STEP = 2
const PRESETS = [
  { label: 'Mở rộng bài viết', percent: 70, icon: PanelLeft },
  { label: 'Cân bằng', percent: 50, icon: Columns2 },
  { label: 'Mở rộng chấm điểm', percent: 36, icon: PanelRight },
] as const

const clamp = (percent: number) => Math.min(MAX_LEFT, Math.max(MIN_LEFT, Math.round(percent * 10) / 10))

function remembered(key: string) {
  try {
    const saved = Number(window.localStorage.getItem(key))
    return saved >= MIN_LEFT && saved <= MAX_LEFT ? saved : DEFAULT_LEFT
  } catch {
    return DEFAULT_LEFT
  }
}

/**
 * Two panes side by side, each scrolling on its own, with a bar between them to drag so either side can take more room.
 * The bar also moves with the arrow keys (Home and End go to the limits, a double click restores the default), and three
 * buttons jump to a reading, balanced or grading layout. The width is remembered. On a narrow screen the panes stack and the
 * bar goes away.
 */
export function SplitPane({ left, right, storageKey }: { left: ReactNode; right: ReactNode; storageKey: string }) {
  const [percent, setPercent] = useState(() => remembered(storageKey))
  const root = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, String(percent)) } catch { /* The layout is a convenience: losing it is fine. */ }
  }, [percent, storageKey])

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!dragging.current || !root.current) return
    const box = root.current.getBoundingClientRect()
    setPercent(clamp(((event.clientX - box.left) / box.width) * 100))
  }

  function key(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number | undefined> = {
      ArrowLeft: percent - KEY_STEP, ArrowRight: percent + KEY_STEP, Home: MIN_LEFT, End: MAX_LEFT,
    }
    const next = moves[event.key]
    if (next === undefined) return
    event.preventDefault()
    setPercent(clamp(next))
  }

  return (
    <div className="eg-split-wrap">
      <div aria-label="Bố cục hai cột" className="eg-split-tools" role="group">
        {PRESETS.map(({ label, percent: preset, icon: Icon }) => (
          <button aria-pressed={Math.abs(percent - preset) < 3} className="adm-btn adm-btn--small" key={label} onClick={() => setPercent(preset)} type="button">
            <Icon aria-hidden="true" size={15} />{label}
          </button>
        ))}
      </div>
      <div className="eg-split" ref={root} style={{ '--eg-left': `${percent}%` } as CSSProperties}>
        <div className="eg-pane eg-pane--left">{left}</div>
        <div
          aria-label="Kéo để đổi độ rộng hai cột"
          aria-orientation="vertical"
          aria-valuemax={MAX_LEFT}
          aria-valuemin={MIN_LEFT}
          aria-valuenow={Math.round(percent)}
          className="eg-gutter"
          onDoubleClick={() => setPercent(DEFAULT_LEFT)}
          onKeyDown={key}
          onPointerCancel={() => { dragging.current = false }}
          onPointerDown={(event) => { dragging.current = true; event.currentTarget.setPointerCapture?.(event.pointerId) }}
          onPointerMove={drag}
          onPointerUp={() => { dragging.current = false }}
          role="separator"
          tabIndex={0}>
          <span aria-hidden="true" className="eg-gutter__grip" />
        </div>
        <div className="eg-pane eg-pane--right">{right}</div>
      </div>
    </div>
  )
}
