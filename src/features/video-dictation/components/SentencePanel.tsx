import { memo, useEffect, useMemo, useRef } from 'react'
import { Check } from 'lucide-react'
import type { DictationSegment } from '../api/videoDictationApi'
import type { SegmentStat } from '../hooks/useDictationSession'
import { sentenceWords } from '../lib/dictationMatch'
import { averageAccuracy, totalAttempts } from '../lib/dictationStats'

interface SentencePanelProps {
  segments: DictationSegment[]
  stats: Record<string, SegmentStat>
  current: number
  passed: number
  onGoTo: (index: number) => void
}

/**
 * Column beside the exercise (theater layout): progress on top, then every sentence of the video. A sentence that is
 * passed shows its text; the others show one bar per word, so the learner sees how long each one is, not what it says.
 */
export const SentencePanel = memo(function SentencePanel({ segments, stats, current, passed, onGoTo }: SentencePanelProps) {
  const total = segments.length
  const percent = total > 0 ? Math.round((passed / total) * 100) : 0
  const average = averageAccuracy(segments, stats)
  const currentRef = useRef<HTMLButtonElement>(null)
  // A video can have a couple of hundred sentences: split each into words once, not on every keystroke.
  const wordsOf = useMemo(() => segments.map((segment) => sentenceWords(segment.transcript)), [segments])

  // Keep the sentence being worked on in view when the list is longer than the column.
  useEffect(() => { currentRef.current?.scrollIntoView?.({ block: 'nearest' }) }, [current])

  return (
    <aside className="vdp-sentences" aria-label="Tiến độ video">
      <div className="vdp-sentences__head">
        <p className="vdp-sentences__total"><strong>{passed} / {total} câu</strong><span>{percent}%</span></p>
        <div className="vd-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Tiến độ video">
          <span style={{ width: `${percent}%` }} />
        </div>
        <dl className="vdp-sentences__stats">
          <div><dt>Chính xác TB</dt><dd>{average === null ? '—' : `${average}%`}</dd></div>
          <div><dt>Lần đã gõ</dt><dd>{totalAttempts(stats)}</dd></div>
        </dl>
      </div>

      <ol className="vdp-sentences__list">
        {segments.map((segment, position) => {
          const done = stats[segment.id]?.passed === true
          const isCurrent = position === current
          const words = wordsOf[position]
          return (
            <li key={segment.id}>
              <button
                ref={isCurrent ? currentRef : undefined}
                type="button"
                className="vdp-sentence"
                data-state={isCurrent ? 'current' : done ? 'done' : 'todo'}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Câu ${segment.sequenceNo}${done ? ', đã qua' : ', chưa qua'}${isCurrent ? ', đang làm' : ''}`}
                onClick={() => onGoTo(position)}
              >
                <span className="vdp-sentence__icon" aria-hidden="true">{done ? <Check size={14} /> : null}</span>
                <span className="vdp-sentence__meta" aria-hidden="true">
                  <b>#{segment.sequenceNo}</b>
                  <span>{words.length} từ</span>
                  {isCurrent ? <em>Đang học</em> : null}
                </span>
                <span className="vdp-sentence__text" aria-hidden="true">
                  {done
                    ? segment.transcript
                    : words.map((word, wordPosition) => (
                      <span key={`${wordPosition}-${word}`} className="vdp-sentence__mask" style={{ width: `${Math.max(word.length, 2) * 0.55}em` }} />
                    ))}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
})
