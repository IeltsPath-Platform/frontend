import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookMarked, Flame, GraduationCap, Info, Sparkles, TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OwlHero } from '@/components/OwlHero'
import type { NotebookSummaryResponse } from '../api/notebookApi'

interface NotebookHeroProps {
  summary: NotebookSummaryResponse | null
  loading?: boolean
  dueTotal: number | null
}

const LOCAL_STORAGE_TIP_KEY = 'ieltspath_notebook_flashcard_tip_dismissed'

/** Counts up to `target` in about 600 ms; jumps straight there under reduced motion. */
function useCountUp(target: number, enabled: boolean) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let frame = 0
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!enabled || reduce || target === 0) {
      frame = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(frame)
    }
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / 600, 1)
      setValue(Math.round((1 - (1 - progress) ** 3) * target))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, enabled])
  return value
}

export function NotebookHero({ summary, loading, dueTotal }: NotebookHeroProps) {
  const navigate = useNavigate()
  const total = useCountUp(summary?.total ?? 0, !loading)
  const mastered = summary?.byLevel.MASTERED ?? 0
  const inProgress = (summary?.byLevel.LEARNING ?? 0) + (summary?.byLevel.FAMILIAR ?? 0)
  const dueNow = summary?.dueNow ?? 0
  const addedWeek = summary?.addedLast7Days ?? 0
  const show = (value: number) => (loading ? '—' : value)
  const n = dueTotal ?? 0

  const [tipDismissed, setTipDismissed] = useState(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_TIP_KEY) === 'true'
    } catch {
      return false
    }
  })

  const dismissTip = () => {
    setTipDismissed(true)
    try {
      localStorage.setItem(LOCAL_STORAGE_TIP_KEY, 'true')
    } catch {
      // Ignore
    }
  }

  const stats = [
    { key: 'total', icon: BookMarked, label: 'Tổng số từ', value: loading ? '—' : total, tone: 'blue' },
    { key: 'mastered', icon: GraduationCap, label: 'Đã nhớ', value: show(mastered), tone: 'green' },
    { key: 'learning', icon: TrendingUp, label: 'Đang học', value: show(inProgress), tone: 'violet' },
    { key: 'due', icon: Flame, label: 'Cần ôn ngay', value: show(dueNow), tone: dueNow > 0 ? 'orange' : 'slate' },
  ]

  return (
    <section className="nb-hero" aria-label="Thống kê sổ từ vựng">
      <div className="nb-hero__copy">
        <p className="nb-eyebrow"><Sparkles size={14} aria-hidden="true" />SỔ TAY & FLASHCARD</p>
        <h1>Sổ tay từ vựng của bạn</h1>
        <p className="nb-hero__lead">
          Lưu từ từ điển, đặt mức hiểu, tạo bộ thẻ và ôn đúng lúc sắp quên theo lịch lặp lại ngắt quãng.
          {addedWeek > 0 && <> Tuần này bạn đã thêm <b>+{addedWeek}</b> từ!</>}
        </p>
        <ul className="nb-stats">
          {stats.map(({ key, icon: Icon, label, value, tone }, index) => (
            <li key={key} className={`is-${tone}`} style={{ animationDelay: `${120 + index * 70}ms` }}>
              <Icon size={18} aria-hidden="true" />
              <strong>{value}</strong>
              <span>{label}</span>
            </li>
          ))}
        </ul>

        {/* Single primary review action: Ôn ngay (N) */}
        <Button
          type="button"
          disabled={n === 0}
          onClick={() => navigate('/flashcards/study')}
          className={`nb-cta${n > 0 ? ' has-pulse' : ''}`}
          aria-label={`Ôn ngay (${n})`}
        >
          {n > 0 ? <Flame size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
          Ôn ngay ({n})
          <ArrowRight size={17} aria-hidden="true" />
        </Button>

        {/* Dismissible explanation banner */}
        {!tipDismissed && (
          <aside className="nb-hero__tip" role="note" aria-label="Lưu ý về Sổ tay và Flashcard">
            <Info size={16} aria-hidden="true" />
            <span>Từ lưu từ Từ điển nằm trong Sổ tay và có thể thêm vào bộ thẻ; ôn ở đâu cũng tính chung một lịch.</span>
            <button type="button" onClick={dismissTip} aria-label="Đóng ghi chú" className="nb-hero__tip-close">
              <X size={15} aria-hidden="true" />
            </button>
          </aside>
        )}
      </div>
      <div className="nb-hero__owl" aria-hidden="true">
        <OwlHero
          pose={n > 0 ? 'idea' : 'cheer'}
          frames={['idea', 'cheer']}
          size="md"
          celebrateKey={!loading && n === 0 && (summary?.total ?? 0) > 0 ? 'all-reviewed' : null}
        />
      </div>
    </section>
  )
}
