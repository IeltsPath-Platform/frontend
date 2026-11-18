import { ArrowRight, CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlacementOptions, PlacementPool } from '~types/learningPath'
import { PLACEMENT_POOLS } from './placementPools'

interface Props {
  options: PlacementOptions
  selectedPool: PlacementPool | null
  onSelect: (pool: PlacementPool) => void
  onStart: () => void
  starting?: boolean
  error?: string | null
}

function nextRetakeLabel(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export function PlacementPoolPicker({ options, selectedPool, onSelect, onStart, starting = false, error = null }: Props) {
  const activePool = selectedPool
  const selected = PLACEMENT_POOLS.find((pool) => pool.pool === activePool)
  const selectedCount = options.pools.find((item) => item.pool === activePool)?.examCount ?? 0
  const nextRetakeAt = nextRetakeLabel(options.nextRetakeAt)
  const currentBand = options.currentBand
  const canReuseOpenAssignment = options.openAssignment?.pool === selectedPool
  const limited = options.retakesLeft <= 0 && !canReuseOpenAssignment

  return (
    <section className="pl-pools" aria-labelledby="pl-pools-title">
      <header className="pl-pools__intro">
        <p className="lp-eyebrow">Bước tiếp theo</p>
        <h1 id="pl-pools-title">Chọn kho đề đầu vào</h1>
        <p>Chọn mức đề phù hợp với bạn. Bạn có thể chọn kho khác khi làm lại.</p>
      </header>

      {limited ? (
        <div className="pl-pools__limit" role="status">
          <CircleAlert aria-hidden="true" size={20} />
          <span>Bạn đã dùng hết lượt làm lại trong 24 giờ.{nextRetakeAt ? ` Có thể làm lại từ ${nextRetakeAt}.` : ''}</span>
        </div>
      ) : null}

      <div className="pl-pools__cards" role="group" aria-label="Chọn kho đề">
        {PLACEMENT_POOLS.map((pool) => {
          const examCount = options.pools.find((item) => item.pool === pool.pool)?.examCount ?? 0
          const empty = examCount === 0
          const belowBand = currentBand !== null && pool.ceiling < currentBand && pool.ceiling !== 9
          return (
            <button
              aria-pressed={activePool === pool.pool}
              className="pl-pool-card"
              data-selected={activePool === pool.pool}
              disabled={empty || starting || (options.retakesLeft <= 0 && options.openAssignment?.pool !== pool.pool)}
              key={pool.pool}
              onClick={() => onSelect(pool.pool)}
              type="button"
            >
              <span className="pl-pool-card__title">{pool.label}</span>
              <span className="pl-pool-card__description">{pool.description}</span>
              <span className="pl-pool-card__count">{empty ? 'Chưa có đề' : `${examCount} đề`}</span>
              {belowBand && currentBand !== null ? <span className="pl-pool-card__warning">Kho này tối đa {pool.ceiling.toFixed(1)}, thấp hơn band hiện tại {currentBand.toFixed(1)}; kết quả mới sẽ thay thế.</span> : null}
            </button>
          )
        })}
      </div>

      <p className="pl-pools__hint">Không chắc thì chọn 3–5.</p>
      {selected ? <p className="pl-pools__confirm" aria-live="polite">Bạn đã chọn {selected.label}{selectedCount ? ` · ${selectedCount} đề có sẵn` : ''}.</p> : null}
      {error ? <p className="lp-error" role="alert">{error}</p> : null}
      <Button className="pl-btn pl-btn--accent pl-pools__start" disabled={!selectedPool || selectedCount === 0 || starting || limited} onClick={onStart} type="button">
        {starting ? 'Đang mở đề…' : 'Bắt đầu làm bài'}<ArrowRight aria-hidden="true" size={18} />
      </Button>
    </section>
  )
}
