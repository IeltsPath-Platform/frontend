import { Columns2, Monitor, Rows2 } from 'lucide-react'
import { PLAYER_LAYOUTS, type PlayerLayout } from '../lib/playerLayout'

const ICONS = { compact: Columns2, theater: Monitor, stacked: Rows2 } as const

interface LayoutSwitcherProps {
  value: PlayerLayout
  onChange: (layout: PlayerLayout) => void
}

/** Segmented control that picks how the video and the answer card are laid out. */
export function LayoutSwitcher({ value, onChange }: LayoutSwitcherProps) {
  return (
    <div className="vdp-layouts" role="group" aria-label="Bố cục màn hình">
      {PLAYER_LAYOUTS.map(({ value: option, label, hint }) => {
        const Icon = ICONS[option]
        return (
          <button key={option} type="button" className="vdp-layouts__option" aria-pressed={value === option} aria-label={label} title={hint}
            onClick={() => onChange(option)}>
            <Icon aria-hidden="true" size={16} />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
