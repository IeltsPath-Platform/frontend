import { useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { SiteNavbar } from '@/components/SiteNavbar'
import { mapKnowledgeJudgments, mapStudyPoints } from '@/features/learning-path/api/learningAdapters'
import { LearnTrail } from '@/features/learning-path/components/LearnTrail'
import { ApiErrorState, LoadingState } from '@/features/learning-path/components/PageState'
import { HISTORY_PATH, historyTrail, readOrigin } from '@/features/learning-path/lib/resultOrigin'
import { startStudyPointPractice } from '@/features/learning-path/lib/studyPointPractice'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import '@/features/learning-path/learning-path.css'
import '@/features/learning-path/practice-essay.css'
import { ExaminerResult } from './ExaminerResult'
import { getWritingSubmission } from './writingApi'
import { WritingFixList } from './WritingFixList'
import { WritingNextSteps } from './WritingNextSteps'
import { categoryOf, fixId, type ActiveFix } from './writingFixes'
import { BandLimitNotice } from '../components/BandLimitNotice'
import type { WritingCorrection, WritingCriterion, WritingSubmission } from './writingApi'
import { formatClock, loadResultContext, lowestIndex, measureEssay, roundBand } from './writingText'
import '../reading/reading-workspace.css'
import './writing-result.css'

const CATALOG_PATH = '/practice-tests?skill=writing'

const CRITERIA: Record<string, { name: string; meaning: string }> = {
  TA: { name: 'Task Achievement', meaning: 'Hoàn thành yêu cầu đề bài' },
  TR: { name: 'Task Response', meaning: 'Đáp ứng yêu cầu đề bài' },
  CC: { name: 'Coherence & Cohesion', meaning: 'Mạch lạc và liên kết' },
  LR: { name: 'Lexical Resource', meaning: 'Vốn từ vựng' },
  GRA: { name: 'Grammatical Range & Accuracy', meaning: 'Ngữ pháp' },
}

function comment(band: number) {
  if (band >= 7) return 'Bài viết rất tốt! Hãy giữ nhịp luyện tập để chạm band cao hơn.'
  if (band >= 6) return 'Bài viết khá tốt! Hãy sửa các lỗi được đánh dấu để lên band cao hơn.'
  if (band >= 5) return 'Bài viết đạt yêu cầu cơ bản. Tập trung vào tiêu chí thấp nhất để cải thiện nhanh.'
  return 'Bài viết còn nhiều điểm cần cải thiện. Hãy thử chế độ Hướng dẫn từng bước để luyện nền tảng.'
}

/** {@code number} is the position of the correction in the list of mistakes, so a mark in the essay and its card share a number. */
type Segment = { text: string; correction?: WritingCorrection; number?: number }

/** Cuts the essay at each correction's excerpt, in the order they appear, so the marks never overlap. */
function markEssay(essay: string, corrections: WritingCorrection[]): Segment[] {
  const found = corrections
    .map((correction, index) => ({ correction, number: index + 1, start: essay.indexOf(correction.excerpt) }))
    .filter((item) => item.start >= 0)
    .sort((a, b) => a.start - b.start)
  const segments: Segment[] = []
  let cursor = 0
  for (const { correction, number, start } of found) {
    if (start < cursor) continue
    if (start > cursor) segments.push({ text: essay.slice(cursor, start) })
    segments.push({ text: correction.excerpt, correction, number })
    cursor = start + correction.excerpt.length
  }
  if (cursor < essay.length) segments.push({ text: essay.slice(cursor) })
  return segments
}

function Criterion({ item, worst }: { item: WritingCriterion; worst: boolean }) {
  const info = CRITERIA[item.code] ?? { name: item.code, meaning: '' }
  return (
    <article className={`wr-criterion${worst ? ' is-worst' : ''}`}>
      <div className="wr-criterion-band" aria-label={`Band ${item.band.toFixed(1)}`}>{item.band.toFixed(1)}</div>
      <div>
        <h3>{info.name}{worst && <span className="wr-badge">Cần cải thiện nhất</span>}{item.limited && <span className="wr-badge">Đã giới hạn</span>}</h3>
        <p className="wr-muted">{info.meaning}</p>
      </div>
      <ul className="wr-points">
        {item.strengths.map((text) => <li key={text}><b>✓ Làm tốt:</b> {text}</li>)}
        {item.improvements.map((text) => <li key={text}><b>△ Cần cải thiện:</b> {text}</li>)}
      </ul>
    </article>
  )
}

function Graded({ submission, submissionId }: { submission: WritingSubmission; submissionId: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const origin = useMemo(() => readOrigin(location.search), [location.search])
  const essayRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState<ActiveFix | null>(null)
  /** Picking a mark of the essay scrolls to its card in the list of mistakes and highlights both. */
  const pick = (number: number) => setActive((current) => ({ number, tick: (current?.tick ?? 0) + 1 }))
  const context = useMemo(() => loadResultContext(submissionId), [submissionId])
  const criteria = submission.criteria ?? []
  const corrections = useMemo(() => submission.corrections ?? [], [submission.corrections])
  const essay = submission.essayText ?? ''
  const bands = criteria.map((item) => item.band)
  const worst = bands.length ? lowestIndex(bands) : -1
  const band = submission.overallBand ?? roundBand(bands)
  const metrics = useMemo(() => measureEssay(essay), [essay])
  const segments = useMemo(() => markEssay(essay, corrections), [essay, corrections])
  const tones = [...new Set(corrections.map((item) => categoryOf(item.category)))]
  const studyPoints = useMemo(() => mapStudyPoints(submission.studyPoints), [submission.studyPoints])
  const taskJudgments = useMemo(() => mapKnowledgeJudgments(submission.taskKnowledgePointJudgments), [submission.taskKnowledgePointJudgments])

  return (
    <div className="wr-page">
      <SiteNavbar activePath={HISTORY_PATH} />
      <main className="wr-main">
        <LearnTrail items={historyTrail('Kết quả bài viết', origin)} />
        <div className="wr-hero">
          <section className="wr-band" aria-label="Band Score">
            <p>Band Score:</p>
            <strong>{band.toFixed(1)}</strong>
            <small>Trung bình {criteria.length} tiêu chí, làm tròn theo quy tắc IELTS</small>
            {bands.length > 0 && <b>({bands.map((value) => value.toFixed(1)).join(' + ')}) / {bands.length} = {(bands.reduce((a, c) => a + c, 0) / bands.length).toFixed(2)} → {band.toFixed(1)}</b>}
            <p className="wr-band-note">{comment(band)}</p>
          </section>

          <section className="wr-card" aria-label="Kết quả chấm bài">
            <header><h2>Kết quả chấm bài</h2><span>{context?.title ?? 'Writing'}</span></header>
            {criteria.map((item, index) => (
              <div className="wr-row" key={item.code}>
                <span>{CRITERIA[item.code]?.name ?? item.code}</span>
                <i className="wr-bar"><u style={{ width: `${(item.band / 9) * 100}%` }} /></i>
                <b>{item.band.toFixed(1)}</b>
                {index === worst && <em className="wr-badge">Cần cải thiện nhất</em>}
              </div>
            ))}
            <p className="wr-muted">Điểm từng tiêu chí do AI chấm (thang 0–9) theo band descriptor của IELTS.</p>
            {submission.summary && <p className="wr-summary">{submission.summary}</p>}
            <div className="wr-actions">
              <button type="button" className="wr-primary" onClick={() => essayRef.current?.scrollIntoView({ behavior: 'smooth' })}>Xem bài đã sửa</button>
              <button type="button" className="wr-secondary" onClick={() => void navigate(context?.retryPath ?? CATALOG_PATH)}>Viết lại bài</button>
              {context && <span className="wr-time">Thời gian: <b>{formatClock(context.seconds)}</b>{context.timeLimitSeconds ? ` / ${formatClock(context.timeLimitSeconds)}` : ''}</span>}
            </div>
          </section>
        </div>

        <section className="wr-metrics" aria-label="Số đo tự động từ bài viết">
          <p className="wr-muted">Số đo tự động từ bài viết</p>
          <div>
            <dl><dt>Số từ</dt><dd>{metrics.words}</dd></dl>
            <dl><dt>Số đoạn</dt><dd>{metrics.paragraphs}</dd></dl>
            <dl><dt>Từ/câu trung bình</dt><dd>{metrics.wordsPerSentence}</dd></dl>
            <dl><dt>Từ nối đã dùng</dt><dd>{metrics.linkingTotal}</dd><small>{metrics.linking.slice(0, 3).map((item) => `${item.word} ×${item.count}`).join(' · ') || 'chưa dùng từ nối'}</small></dl>
            <dl><dt>Từ lặp nhiều nhất</dt><dd>{metrics.mostRepeated ? `${metrics.mostRepeated.word} ×${metrics.mostRepeated.count}` : '—'}</dd><small>{metrics.mostRepeated ? 'nên đa dạng hóa' : 'không có từ lặp đáng kể'}</small></dl>
          </div>
        </section>

        <h2 className="wr-h2">Chi tiết theo từng tiêu chí</h2>
        <BandLimitNotice messages={(submission.bandLimits ?? []).map((limit) => limit.message)} />
        <div className="wr-criteria">{criteria.map((item, index) => <Criterion key={item.code} item={item} worst={index === worst} />)}</div>

        <h2 className="wr-h2" id="wr-marked">Bài viết của bạn đã được đánh dấu</h2>
        <section className="wr-essay" ref={essayRef} aria-label="Bài viết đã đánh dấu">
          {tones.length > 0 && <p className="wr-legend">{tones.map((tone) => <span key={tone.label} className={`wr-mark wr-mark-${tone.tone}`}>{tone.label}</span>)}</p>}
          {segments.length === 0 && <p className="wr-muted">Không còn bản bài viết để hiển thị.</p>}
          {essay && segments.map((segment, index) => {
            const { correction, number } = segment
            if (!correction || number === undefined) return <span key={index}>{segment.text}</span>
            return (
              <mark
                aria-controls={fixId(number)} key={index} role="button" tabIndex={0}
                className={`wr-mark wr-mark-${categoryOf(correction.category).tone} wr-mark--pick${active?.number === number ? ' is-active' : ''}`}
                onClick={() => pick(number)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(number) } }}
                title="Bấm để xem giải thích lỗi này"
              >
                {segment.text}<sup className="wr-mark__no" aria-label={`lỗi ${number}`}>{number}</sup>
              </mark>
            )
          })}
        </section>

        {corrections.length > 0 && <WritingFixList active={active} corrections={corrections} />}

        <WritingNextSteps
          backTo={`${location.pathname}${location.search}`}
          points={studyPoints}
          judgments={taskJudgments}
          submissionId={submissionId}
          onPractise={(point) => startStudyPointPractice(point, `${location.pathname}${location.search}`, navigate, 'Kết quả bài viết')}
        />

        {submission.sampleAnswer && (
          <details className="wr-sample">
            <summary>Xem bài mẫu</summary>
            <p>{submission.sampleAnswer}</p>
          </details>
        )}
      </main>
    </div>
  )
}

/** The grade of a Writing essay: band, the four criteria, measures from the text and the essay marked up. */
export function WritingResultPage() {
  const { submissionId = '' } = useParams()
  const resource = useApiResource(`writing-result:${submissionId}`, () => getWritingSubmission(submissionId))

  if (resource.status === 'loading') return <LoadingState label="Đang tải kết quả chấm bài…" />
  if (resource.status === 'error' && resource.error) return <ApiErrorState error={resource.error} onRetry={resource.reload} />
  const submission = resource.data
  if (!submission) return null
  if (submission.status === 'AWAITING_EXAMINER') return <ExaminerResult submission={submission} submissionId={submissionId} />
  if (submission.status !== 'GRADED') {
    return (
      <main className="reading-state reading-empty">
        <h1>Bài viết chưa có điểm</h1>
        <p>Bài này chưa được chấm xong{submission.failureCode ? ` (${submission.failureCode})` : ''}. Point chỉ bị trừ khi chấm thành công.</p>
        <Link to={CATALOG_PATH}>Về danh mục Writing</Link>
      </main>
    )
  }
  return <Graded submission={submission} submissionId={submissionId} />
}
