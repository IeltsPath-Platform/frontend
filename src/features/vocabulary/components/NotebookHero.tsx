import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, AlertCircle, ArrowRight } from 'lucide-react'
import type { NotebookSummaryResponse } from '../api/notebookApi'

interface NotebookHeroProps {
  summary: NotebookSummaryResponse | null
  loading?: boolean
}

export function NotebookHero({ summary, loading }: NotebookHeroProps) {
  const [displayCount, setDisplayCount] = useState(0)
  const targetTotal = summary?.total ?? 0

  useEffect(() => {
    let frameId: number
    if (loading || targetTotal === 0) {
      frameId = requestAnimationFrame(() => setDisplayCount(targetTotal))
      return () => cancelAnimationFrame(frameId)
    }

    const durationMs = 600
    const start = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const current = Math.round(progress * targetTotal)
      setDisplayCount(current)
      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [targetTotal, loading])

  const mastered = summary?.byLevel.MASTERED ?? 0
  const inProgress = (summary?.byLevel.LEARNING ?? 0) + (summary?.byLevel.FAMILIAR ?? 0)
  const dueNow = summary?.dueNow ?? 0
  const addedWeek = summary?.addedLast7Days ?? 0

  return (
    <div className="vocab-hero" role="region" aria-label="Thống kê sổ từ vựng">
      <div className="vocab-hero__grid">
        <div>
          <h1 className="vocab-hero__title">Sổ tay từ vựng của bạn</h1>
          <p className="vocab-hero__subtitle">
            Học và củng cố vốn từ vựng học thuật theo phương pháp lặp lại ngắt quãng (Spaced Repetition).
          </p>

          <div className="vocab-hero__stats-row">
            <div className="vocab-hero__stat-chip">
              <span className="vocab-hero__stat-val">{loading ? '—' : displayCount}</span>
              <span className="vocab-hero__stat-lbl">Tổng số từ</span>
            </div>
            <div className="vocab-hero__stat-chip">
              <span className="vocab-hero__stat-val">{loading ? '—' : mastered}</span>
              <span className="vocab-hero__stat-lbl">Đã nhớ</span>
            </div>
            <div className="vocab-hero__stat-chip">
              <span className="vocab-hero__stat-val">{loading ? '—' : inProgress}</span>
              <span className="vocab-hero__stat-lbl">Đang học</span>
            </div>
            <div className="vocab-hero__stat-chip">
              <span className="vocab-hero__stat-val" style={{ color: dueNow > 0 ? '#ffb076' : 'white' }}>
                {loading ? '—' : dueNow}
              </span>
              <span className="vocab-hero__stat-lbl">Cần ôn ngay</span>
            </div>
            {addedWeek > 0 && (
              <div className="vocab-hero__stat-chip">
                <span className="vocab-hero__stat-val" style={{ color: '#86efac' }}>
                  +{addedWeek}
                </span>
                <span className="vocab-hero__stat-lbl">Tuần này</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <Link
            to="/vocabulary/notebook/review"
            className={`vocab-hero__cta ${dueNow > 0 ? 'has-pulse' : ''}`}
            aria-label={dueNow > 0 ? `Ôn ${dueNow} từ cần nhớ` : 'Vào phòng ôn tập'}
          >
            {dueNow > 0 ? (
              <>
                <AlertCircle size={20} aria-hidden="true" />
                Ôn {dueNow} từ cần nhớ
              </>
            ) : (
              <>
                <Sparkles size={20} aria-hidden="true" />
                Vào phiên ôn tập
              </>
            )}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
