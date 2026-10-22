import { Link } from 'react-router-dom'
import { PartyPopper, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DictationSegment } from '../api/videoDictationApi'
import type { SegmentStat } from '../hooks/useDictationSession'
import { averageAccuracy, totalAttempts } from '../lib/dictationStats'

interface CompletionSummaryProps {
  title: string
  segments: DictationSegment[]
  stats: Record<string, SegmentStat>
  onRedoSegment: (index: number) => void
  onRestart: () => void
}

type RowState = 'passed' | 'todo' | 'none'

function rowState(stat: SegmentStat | undefined): RowState {
  if (!stat || stat.attempts === 0) return 'none'
  return stat.passed ? 'passed' : 'todo'
}

function rowNote(stat: SegmentStat | undefined) {
  const state = rowState(stat)
  if (state === 'none' || !stat) return 'Chưa làm'
  const best = stat.bestAccuracyPercent === null ? '' : ` · tốt nhất ${stat.bestAccuracyPercent}%`
  return `${state === 'passed' ? 'Đạt · ' : 'Chưa qua · '}${stat.attempts} lần gõ${best}`
}

/** Shown when every sentence has been through: totals and the result of each sentence, with a way to redo it. */
export function CompletionSummary({ title, segments, stats, onRedoSegment, onRestart }: CompletionSummaryProps) {
  const passed = segments.filter((segment) => stats[segment.id]?.passed).length
  const average = averageAccuracy(segments, stats)

  return (
    <section className="vdp-done" aria-labelledby="vdp-done-title">
      <PartyPopper aria-hidden="true" className="vdp-done__icon" size={40} />
      <h1 id="vdp-done-title">Hoàn thành video</h1>
      <p className="vdp-done__title">{title} · {segments.length} câu</p>

      <dl className="vdp-done__tiles">
        <div><dd>{passed} / {segments.length}</dd><dt>Câu đạt</dt></div>
        <div><dd>{average === null ? '—' : `${average}%`}</dd><dt>Độ chính xác TB cả video</dt></div>
        <div><dd>{totalAttempts(stats)}</dd><dt>Số lần gõ</dt></div>
      </dl>
      <p className="vdp-note">
        Độ chính xác lấy điểm cao nhất của từng câu rồi lấy trung bình trên cả {segments.length} câu; câu chưa gõ tính 0%.
      </p>

      <h2>Kết quả từng câu</h2>
      {/* Scrolls inside when the video has many sentences, so the buttons underneath stay in view. */}
      <ul className="vdp-done__list" aria-label="Kết quả từng câu" tabIndex={0}>
        {segments.map((segment, index) => (
          <li key={segment.id}>
            <strong>Câu {segment.sequenceNo}</strong>
            <span className="vdp-done__text">{segment.transcript}</span>
            <span className="vdp-done__note" data-state={rowState(stats[segment.id])}>{rowNote(stats[segment.id])}</span>
            <Button type="button" variant="outline" size="sm" className="vdp-done__redo"
              aria-label={`Làm lại câu ${segment.sequenceNo}`} onClick={() => onRedoSegment(index)}>
              <RotateCcw aria-hidden="true" size={14} />Làm lại câu
            </Button>
          </li>
        ))}
      </ul>

      <div className="vdp-done__actions">
        <Button type="button" variant="outline" className="vdp-done__restart" onClick={onRestart}>
          <RotateCcw aria-hidden="true" size={16} />Làm lại video
        </Button>
        <Link className="vd-continue__cta" to="/video-dictation">Về thư viện</Link>
      </div>
    </section>
  )
}
