import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { SiteNavbar } from '@/components/SiteNavbar'
import { ApiErrorState, LoadingState } from '@/features/learning-path/components/PageState'
import { useApiResource } from '@/features/learning-path/lib/useApiResource'
import '@/features/learning-path/learning-path.css'
import { ExaminerResult } from './ExaminerResult'
import { getWritingSubmission } from './writingApi'
import type { WritingBandLimit, WritingCorrection, WritingCriterion, WritingSubmission } from './writingApi'
import { DataChecksView, TaskChecksView } from './WritingChecks'
import { CorrectedEssay, CorrectionList, RevisionSummary } from './WritingErrors'
import { WritingPriorities } from './WritingPriorities'
import { certaintyOf, errorNames, markEssay, segmentAt } from './writingResultModel'
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

const FALLBACK_CATEGORY = { label: 'Khác', tone: 'task' }

/** The error categories Content can attach to a correction; one this page does not know falls back to "Khác". */
const CATEGORY: Record<string, { label: string; tone: string }> = {
  GRAMMAR: { label: 'Ngữ pháp', tone: 'grammar' },
  VOCABULARY: { label: 'Từ vựng', tone: 'vocabulary' },
  COHERENCE: { label: 'Mạch lạc', tone: 'coherence' },
  TASK: { label: 'Nội dung', tone: 'task' },
  SPELLING_NUMBER: { label: 'Chính tả & số', tone: 'vocabulary' },
  OTHER: FALLBACK_CATEGORY,
}

function categoryOf(category: WritingCorrection['category']) {
  return CATEGORY[category] ?? FALLBACK_CATEGORY
}

function comment(band: number) {
  if (band >= 7) return 'Bài viết rất tốt! Hãy giữ nhịp luyện tập để chạm band cao hơn.'
  if (band >= 6) return 'Bài viết khá tốt! Hãy sửa các lỗi được đánh dấu để lên band cao hơn.'
  if (band >= 5) return 'Bài viết đạt yêu cầu cơ bản. Tập trung vào tiêu chí thấp nhất để cải thiện nhanh.'
  return 'Bài viết còn nhiều điểm cần cải thiện. Hãy thử chế độ Hướng dẫn từng bước để luyện nền tảng.'
}

function Criterion({ item, worst, limits }: { item: WritingCriterion; worst: boolean; limits: WritingBandLimit[] }) {
  const info = CRITERIA[item.code] ?? { name: item.code, meaning: '' }
  return (
    <article className={`wr-criterion${worst ? ' is-worst' : ''}`}>
      <div className="wr-criterion-band" aria-label={`Band ${item.band.toFixed(1)}, ước tính`}>{item.band.toFixed(1)}</div>
      <div>
        <h3>{info.name}{worst && <span className="wr-badge">Cần cải thiện nhất</span>}</h3>
        <p className="wr-muted">{info.meaning} · band ước tính</p>
      </div>
      {limits.length > 0 && <ul className="wr-limits">{limits.map((limit) => <li key={limit.reason}>{limit.message}</li>)}</ul>}
      <ul className="wr-points">
        {item.strengths.map((text) => <li key={text}><b>✓ Làm tốt:</b> {text}</li>)}
        {item.improvements.map((text) => <li key={text}><b>△ Cần cải thiện:</b> {text}</li>)}
        {item.evidence?.map((text) => <li key={text} className="wr-evidence"><b>Dẫn chứng:</b> “{text}”</li>)}
        {item.descriptor && <li className="wr-muted"><b>Mô tả band này:</b> {item.descriptor}</li>}
        {item.nextBand && <li className="wr-next"><b>Để lên band {item.nextBand.band.toFixed(1)}:</b> {item.nextBand.descriptor}</li>}
      </ul>
    </article>
  )
}

function Graded({ submission, submissionId }: { submission: WritingSubmission; submissionId: string }) {
  const navigate = useNavigate()
  const essayRef = useRef<HTMLElement>(null)
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
  const groups = useMemo(() => submission.errorGroups ?? [], [submission.errorGroups])
  const names = useMemo(() => errorNames(corrections, groups), [corrections, groups])
  const [focusAt, setFocusAt] = useState<number | null>(null)

  /** Scrolls the marked essay to the first place the excerpt is written and lights that stretch up. */
  function showExcerpt(excerpt: string) {
    const segment = segmentAt(segments, essay, excerpt)
    if (!segment) return
    setFocusAt(segment.start)
    document.getElementById(`wr-seg-${segment.start}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="wr-page">
      <SiteNavbar />
      <header className="wr-top"><Link className="rw-exit" to={CATALOG_PATH} aria-label="Về danh mục Writing"><X size={16} aria-hidden="true" /></Link></header>
      <main className="wr-main">
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

        <WritingPriorities priorities={submission.priorities ?? []} onShow={showExcerpt} />
        {submission.revision && <RevisionSummary revision={submission.revision} names={names} />}

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
        <div className="wr-criteria">
          {criteria.map((item, index) => (
            <Criterion key={item.code} item={item} worst={index === worst} limits={(submission.bandLimits ?? []).filter((limit) => limit.criterion === item.code)} />
          ))}
        </div>

        {submission.dataChecks && <DataChecksView checks={submission.dataChecks} onShow={showExcerpt} />}
        {submission.taskChecks && <TaskChecksView checks={submission.taskChecks} onShow={showExcerpt} />}

        <h2 className="wr-h2" id="wr-marked">Bài viết của bạn đã được đánh dấu</h2>
        <section className="wr-essay" ref={essayRef} aria-label="Bài viết đã đánh dấu">
          {tones.length > 0 && <p className="wr-legend">{tones.map((tone) => <span key={tone.label} className={`wr-mark wr-mark-${tone.tone}`}>{tone.label}</span>)}</p>}
          {segments.length === 0 && <p className="wr-muted">Không còn bản bài viết để hiển thị.</p>}
          {essay && segments.map((segment) => {
            const focus = focusAt === segment.start ? ' is-focus' : ''
            return segment.correction
              ? <mark key={segment.start} id={`wr-seg-${segment.start}`} className={`wr-mark wr-mark-${categoryOf(segment.correction.category).tone}${certaintyOf(segment.correction) === 'SUGGESTION' ? ' wr-mark-suggestion' : ''}${focus}`} title={segment.correction.suggestion}>{segment.text}</mark>
              : <span key={segment.start} id={`wr-seg-${segment.start}`} className={focus.trim()}>{segment.text}</span>
          })}
        </section>

        <CorrectionList corrections={corrections} groups={groups} categoryOf={categoryOf} />
        <CorrectedEssay essay={essay} corrections={corrections} />

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
