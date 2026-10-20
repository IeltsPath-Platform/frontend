import { useEffect, useMemo, useRef } from 'react'
import { Check, Flag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DictationSegment } from '../api/videoDictationApi'
import type { Phase } from '../hooks/useDictationSession'
import { MAX_ATTEMPTS, sentenceWords, type DictationMatch } from '../lib/dictationMatch'
import { WordHints } from './WordHints'

interface DictationCardProps {
  phase: Phase
  /** Moving on from this sentence ends the exercise, so the button says "Hoàn thành" instead of "Câu tiếp". */
  finishes: boolean
  segment: DictationSegment
  text: string
  tries: number
  match: DictationMatch | null
  revealed: ReadonlySet<number>
  meaningVisible: boolean
  busy: boolean
  notice: string | null
  onText: (value: string) => void
  onReplay: () => void
  onCheck: () => void
  onRetry: () => void
  onNext: () => void
  onSkip: () => void
  onToggleWord: (position: number) => void
  onToggleAllWords: () => void
  onToggleMeaning: () => void
}

function Result({ phase, segment, match, tries }: { phase: Phase; segment: DictationSegment; match: DictationMatch; tries: number }) {
  const passed = phase === 'correct'
  return (
    <div className="vdp-result" aria-live="polite">
      <p className={`vdp-banner ${passed ? 'vdp-banner--ok' : 'vdp-banner--bad'}`}>
        {passed ? <Check aria-hidden="true" size={18} /> : <X aria-hidden="true" size={18} />}
        {passed
          ? ` Chính xác · ${match.accuracyPercent}%`
          : ` Chưa đúng · ${match.accuracyPercent}% (đúng ${match.matchedWords} / ${match.referenceWords} từ)`}
      </p>
      {passed || phase === 'revealed' ? (
        <>
          <p className="vdp-answer">{segment.transcript}</p>
          {segment.translationVi ? <p className="vdp-translation">{segment.translationVi}</p> : null}
          {phase === 'revealed' ? <p className="vdp-note">Đã hết {MAX_ATTEMPTS} lần thử nên đáp án được hiện. Câu này chưa tính là đã qua.</p> : null}
        </>
      ) : (
        <>
          <p className="vdp-typed" aria-label="Bài bạn đã gõ">
            <span className="vdp-label">Bạn gõ:</span>{' '}
            {match.typed.map((word, position) => (
              <span key={`${position}-${word.text}`} className={word.correct ? undefined : 'vdp-wrong'}>{word.text} </span>
            ))}
          </p>
          <p className="vdp-note">Từ sai được tô đỏ{match.missingWords > 0 ? `; còn thiếu ${match.missingWords} từ` : ''}. Đáp án hiện sau khi dùng hết {MAX_ATTEMPTS} lần thử (đã dùng {tries}).</p>
          {segment.translationVi ? <p className="vdp-hint">💡 Gợi ý tiếng Việt: <i>{segment.translationVi}</i></p> : null}
        </>
      )}
    </div>
  )
}

/** The answer box under the video and what comes back after a check. */
export function DictationCard({ phase, finishes, segment, text, tries, match, revealed, meaningVisible, busy, notice, onText, onReplay, onCheck, onRetry, onNext, onSkip, onToggleWord, onToggleAllWords, onToggleMeaning }: DictationCardProps) {
  const words = useMemo(() => sentenceWords(segment.transcript), [segment.transcript])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (phase === 'typing') inputRef.current?.focus()
    if (phase === 'correct' || phase === 'revealed') nextRef.current?.focus()
  }, [phase])

  const answering = phase === 'typing'
  const started = phase !== 'ready' && phase !== 'done'
  const showResult = match !== null && (phase === 'wrong' || phase === 'correct' || phase === 'revealed')

  return (
    <section className="vdp-card" aria-labelledby="vdp-card-title">
      <div className="vdp-card__head">
        <h2 id="vdp-card-title">Gõ lại câu bạn vừa nghe</h2>
        <span>Lần {Math.min(tries + 1, MAX_ATTEMPTS)} / {MAX_ATTEMPTS}</span>
      </div>

      {!showResult || phase === 'wrong' ? (
        <>
          <label className="sr-only" htmlFor="vdp-answer">Câu bạn nghe được</label>
          <textarea
            id="vdp-answer"
            ref={inputRef}
            className="vdp-input"
            value={text}
            disabled={!answering && phase !== 'wrong'}
            maxLength={500}
            placeholder={answering || phase === 'wrong' ? 'Gõ ngay khi đang nghe cũng được. Chưa nghe rõ thì bấm vào video (hoặc Alt+R) để nghe lại bao nhiêu lần tuỳ ý…' : 'Bấm “Bắt đầu nghe” trên video, rồi gõ lại câu bạn nghe được vào đây…'}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => onText(event.target.value)}
            onKeyDown={(event) => {
              if (event.altKey && event.key.toLowerCase() === 'r') {
                event.preventDefault()
                onReplay()
              } else if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (answering) onCheck()
                else if (phase === 'wrong') onRetry()
              }
            }}
          />
        </>
      ) : null}

      {/* What helps while typing: the result of a check, the word tiles, notices. Where it sits (under the box, or
          in a column beside it) is up to the layout; the CSS keeps it in this order wherever it goes. */}
      <div className="vdp-card__aside">
        {showResult ? <Result phase={phase} segment={segment} match={match} tries={tries} /> : null}

        {started && (answering || phase === 'wrong') ? (
          <WordHints
            words={words}
            ipa={segment.ipaWords ?? []}
            revealed={revealed}
            onToggle={onToggleWord}
            onToggleAll={onToggleAllWords}
            meaning={segment.translationVi}
            meaningVisible={meaningVisible}
            onToggleMeaning={onToggleMeaning}
          />
        ) : null}

        {notice ? <p className="vdp-notice" role="status">{notice}</p> : null}
      </div>

      <div className="vdp-actions">
        <div className="vdp-actions__buttons">
          {phase === 'correct' || phase === 'revealed' ? (
            <Button ref={nextRef} type="button" onClick={onNext}>
              {finishes ? <><Flag aria-hidden="true" size={16} />Hoàn thành</> : 'Câu tiếp ›'}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" disabled={phase !== 'typing' && phase !== 'wrong'} onClick={onSkip}>Bỏ qua ›</Button>
              {phase === 'wrong' ? (
                <Button type="button" onClick={onRetry}>Thử lại · lần {Math.min(tries + 1, MAX_ATTEMPTS)} / {MAX_ATTEMPTS}</Button>
              ) : (
                <Button type="button" disabled={!answering || busy || !text.trim()} onClick={onCheck}>Kiểm tra</Button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
