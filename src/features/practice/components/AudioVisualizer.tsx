interface AudioVisualizerProps {
  levels: readonly number[]
  isActive: boolean
}

export function AudioVisualizer({ levels, isActive }: AudioVisualizerProps) {
  return (
    <div className={`audio-visualizer${isActive ? ' is-active' : ''}`} role="img" aria-label={isActive ? 'Biểu đồ âm lượng micro đang hoạt động' : 'Biểu đồ âm lượng micro đang chờ'}>
      {levels.map((level, index) => <span key={index} style={{ transform: `scaleY(${Math.max(.12, level)})` }} />)}
    </div>
  )
}
