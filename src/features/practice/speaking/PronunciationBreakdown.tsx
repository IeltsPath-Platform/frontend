import { useState } from 'react'
import { errorLabel, toneOf, weakestWord } from './speakingResultView'
import type { ResultSound, ResultWord, SoundTone, SpeakingResultView } from './speakingResultView'
import './speaking-pronunciation.css'

const TONE_NAMES: Record<SoundTone, string> = { good: 'tốt', fair: 'tạm ổn', weak: 'cần luyện', none: 'chưa có điểm' }

function score(value: number | null) { return value === null ? '—' : value.toFixed(0) }

function SoundChip({ sound }: { sound: ResultSound }) {
  const tone = toneOf(sound.accuracy)
  return <li className={`sres-sound sres-sound--${tone}`} aria-label={`Âm ${sound.symbol}: ${score(sound.accuracy)} điểm, ${TONE_NAMES[tone]}`}>
    <b>/{sound.symbol}/</b>
    <span>{score(sound.accuracy)}</span>
    {sound.heardAs && <small>nghe như /{sound.heardAs}/</small>}
  </li>
}

/** How many words fall in each band of score, over every answer: the shape of the whole performance at a glance. */
function Summary({ words }: { words: ResultWord[] }) {
  const counts = { good: 0, fair: 0, weak: 0 }
  words.forEach((word) => { const tone = toneOf(word.accuracy); if (tone !== 'none') counts[tone] += 1 })
  const total = counts.good + counts.fair + counts.weak
  if (total === 0) return null
  const share = (count: number) => `${(count / total) * 100}%`
  return <div className="sres-pron__summary">
    <ul aria-label="Số từ theo mức điểm">
      <li className="sres-stat sres-stat--good"><b>{counts.good}</b><span>từ tốt <small>(80+)</small></span></li>
      <li className="sres-stat sres-stat--fair"><b>{counts.fair}</b><span>từ tạm ổn <small>(60–79)</small></span></li>
      <li className="sres-stat sres-stat--weak"><b>{counts.weak}</b><span>từ cần luyện <small>(dưới 60)</small></span></li>
    </ul>
    <div className="sres-ratio" aria-hidden="true">
      <i className="sres-ratio__good" style={{ width: share(counts.good) }} />
      <i className="sres-ratio__fair" style={{ width: share(counts.fair) }} />
      <i className="sres-ratio__weak" style={{ width: share(counts.weak) }} />
    </div>
  </div>
}

/** The chosen word: its score as a ring, the error the service named, every sound with its own score, and the tip. */
function Spotlight({ word, tip }: { word: ResultWord; tip: string }) {
  const tone = toneOf(word.accuracy)
  return <section className={`sres-spot sres-spot--${tone}`} aria-live="polite" aria-label="Chi tiết từ đã chọn">
    <header>
      <span className="sres-ring" style={{ '--sres-score': `${word.accuracy ?? 0}%` } as React.CSSProperties}><b>{score(word.accuracy)}</b></span>
      <div>
        <h3>{word.text}</h3>
        <p><span className={`sres-tone sres-tone--${tone}`}>{score(word.accuracy)} điểm · {TONE_NAMES[tone]}</span>
          {word.errorType && <em className="sres-badge sres-badge--warn">{errorLabel(word.errorType)}</em>}</p>
      </div>
    </header>
    {word.sounds.length > 0
      ? <ul className="sres-pron__sounds-row" aria-label={`Các âm của từ ${word.text}`}>{word.sounds.map((sound, position) => <SoundChip key={position} sound={sound} />)}</ul>
      : <p className="sres-muted">Chưa có điểm từng âm cho từ này.</p>}
    {tip && <p className="sres-pron__tip"><b>Cách sửa:</b> {tip}</p>}
  </section>
}

/**
 * How each word and each sound of the answers went, as the speech service scored them. Every word is a button coloured by
 * its score; choosing one opens its sounds in the card beside the words, which stays in view while the learner reads on.
 * The word to look at first is the weakest. Below, the sounds that were weak in several places are listed as cards.
 */
export function PronunciationBreakdown({ view }: { view: SpeakingResultView }) {
  const answers = view.transcripts.filter((entry) => entry.words.length > 0)
  const [question, setQuestion] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  if (answers.length === 0) return null

  const current = answers[Math.min(question, answers.length - 1)]!
  const index = picked !== null && picked < current.words.length ? picked : Math.max(0, weakestWord(current.words))
  const word = current.words[index]!
  const tip = view.weakWords.find((entry) => entry.word.toLowerCase() === word.text.toLowerCase())?.tip ?? ''
  const hasSounds = answers.some((entry) => entry.words.some((item) => item.sounds.length > 0))

  return <section className="sres-pron" aria-label="Phát âm từng từ, từng âm">
    <Summary words={answers.flatMap((entry) => entry.words)} />

    <div className="sres-pron__body">
      <div className="sres-pron__main">
        {answers.length > 1 && <div className="sres-pron__tabs" role="group" aria-label="Chọn câu trả lời">
          {answers.map((entry, position) => <button key={`${entry.partNo}-${entry.questionNo}`} type="button"
            aria-pressed={position === question} className={position === question ? 'is-on' : ''}
            onClick={() => { setQuestion(position); setPicked(null) }}>Part {entry.partNo} · câu {entry.questionNo}</button>)}
        </div>}
        {current.question && <p className="sres-pron__question">{current.question}</p>}
        <p className="sres-pron__words">{current.words.map((item, position) => <button key={position} type="button"
          className={`sres-word sres-word--${toneOf(item.accuracy)}${position === index ? ' is-picked' : ''}`}
          aria-pressed={position === index} title={`${score(item.accuracy)} điểm`}
          onClick={() => setPicked(position)}>{item.text}</button>)}</p>
        <p className="sres-pron__hint">Bấm vào một từ để xem từng âm của nó.</p>
      </div>
      <Spotlight word={word} tip={tip} />
    </div>

    <aside className="sres-pron__side" aria-label="Âm cần luyện nhất">
      <h3>Âm cần luyện nhất</h3>
      {view.weakSounds.length > 0 ? <ul>{view.weakSounds.map((sound) => <li key={sound.symbol}>
        <div className="sres-pron__side-head">
          <b className="sres-sound-badge">/{sound.symbol}/</b>
          {sound.heardAs && <span className="sres-swap" aria-hidden="true">→ /{sound.heardAs}/</span>}
          <span className="sres-pron__side-count">Yếu ở {sound.count} chỗ · điểm TB {score(sound.accuracy)}</span>
        </div>
        {sound.heardAs && <p>Thường nghe như <b>/{sound.heardAs}/</b></p>}
        {sound.words.length > 0 && <p className="sres-pron__examples"><span>Ví dụ:</span>{sound.words.map((item) => <em key={item}>{item}</em>)}</p>}
        {sound.tip && <p className="sres-pron__tip">{sound.tip}</p>}
      </li>)}</ul>
        : <p className="sres-muted">{hasSounds ? 'Không có âm nào dưới 60 điểm. Các âm của bạn khá ổn.' : 'Bài này chưa có điểm từng âm.'}</p>}
    </aside>
  </section>
}
