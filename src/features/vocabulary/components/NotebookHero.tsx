import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, BookMarked, Flame, GraduationCap, Sparkles, TrendingUp } from 'lucide-react'
import { OwlHero } from '@/components/OwlHero'
import type { NotebookSummaryResponse } from '../api/notebookApi'

interface NotebookHeroProps {
  summary: NotebookSummaryResponse | null
  loading?: boolean
}

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

export function NotebookHero({ summary, loading }: NotebookHeroProps) {
  const total = useCountUp(summary?.total ?? 0, !loading)
  const mastered = summary?.byLevel.MASTERED ?? 0
  const inProgress = (summary?.byLevel.LEARNING ?? 0) + (summary?.byLevel.FAMILIAR ?? 0)
  const dueNow = summary?.dueNow ?? 0
  const addedWeek = summary?.addedLast7Days ?? 0
  const show = (value: number) => (loading ? '—' : value)

  const stats = [
    { key: 'total', icon: BookMarked, label: 'Tổng số từ', value: loading ? '—' : total, tone: 'blue' },
    { key: 'mastered', icon: GraduationCap, label: 'Đã nhớ', value: show(mastered), tone: 'green' },
    { key: 'learning', icon: TrendingUp, label: 'Đang học', value: show(inProgress), tone: 'violet' },
    { key: 'due', icon: Flame, label: 'Cần ôn ngay', value: show(dueNow), tone: dueNow > 0 ? 'orange' : 'slate' },
  ]

  return (
    <section className="nb-hero" aria-label="Thống kê sổ từ vựng">
      <div className="nb-hero__copy">
        <p className="nb-eyebrow"><Sparkles size={14} aria-hidden="true" />SỔ TAY THÔNG MINH</p>
        <h1>Sổ tay từ vựng của bạn</h1>
        <p className="nb-hero__lead">
          Lưu từ từ điển, đặt mức hiểu, ghi chú riêng và ôn đúng lúc sắp quên theo lịch lặp lại ngắt quãng.
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
        <Link
          to="/vocabulary/notebook/review"
          className={`nb-cta${dueNow > 0 ? ' has-pulse' : ''}`}
          aria-label={dueNow > 0 ? `Ôn ${dueNow} từ cần nhớ` : 'Vào phòng ôn tập'}
        >
          {dueNow > 0 ? <AlertCircle size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
          {dueNow > 0 ? `Ôn ${dueNow} từ cần nhớ` : 'Vào phiên ôn tập'}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
      <div className="nb-hero__owl" aria-hidden="true">
        <OwlHero pose={dueNow > 0 ? 'idea' : 'cheer'} frames={['idea', 'cheer']} size="md" celebrateKey={!loading && dueNow === 0 && (summary?.total ?? 0) > 0 ? 'all-reviewed' : null} />
      </div>
    </section>
  )
}
