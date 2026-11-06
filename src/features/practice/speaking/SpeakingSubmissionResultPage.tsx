import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Mic, Quote, TrendingUp, X } from 'lucide-react'
import { useState } from 'react'
import { KeyActivationDialog } from '@/features/home/components/KeyActivationDialog'
import type { ActivationProduct } from '@/features/home/pricingData'
import { useWritingWallet } from '@/features/practice/writing/useWritingWallet'
import { PremiumPlansDialog } from './PremiumPlansDialog'
import { PronunciationBreakdown } from './PronunciationBreakdown'
import { SpeakingWaitingPanel } from './SpeakingWaitingPanel'
import { useSpeakingSubmissionResult } from './useSpeakingSubmissionResult'
import {
  averageBand, bandComment, parseSpeakingResult, summaryLine, weakestCriterion,
  type ResultCriterion, type SpeakingResultView,
} from './speakingResultView'
import './speaking-result.css'

const CATALOG_PATH = '/practice-tests?skill=speaking'

/** The states in which the grade is still being made: the waiting screen is shown. */
const WORKING = new Set(['UPLOADING', 'QUEUED', 'ANALYZING', 'GRADING', 'PAYMENT_PENDING', 'FAILED_RETRYABLE'])

function formatBand(band: number | null) { return band === null ? '—' : band.toFixed(1) }

function Notice({ tone, icon, title, children }: { tone: 'wait' | 'warn' | 'stop'; icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return <section className={`sres-notice sres-notice--${tone}`} role={tone === 'wait' ? 'status' : 'alert'}>
    <span className="sres-notice__icon" aria-hidden="true">{icon}</span>
    <div><h2>{title}</h2>{children}</div>
  </section>
}

function BandCard({ view }: { view: SpeakingResultView }) {
  const shown = view.overallBand ?? averageBand(view.criteria)
  return <section className="sres-band" aria-label="Band Speaking">
    <p>{view.label}</p>
    <strong>{formatBand(shown)}</strong>
    <small>{view.overallBand !== null ? 'Band tổng' : 'Trung bình các tiêu chí (band tổng hiện khi đủ ba part)'}</small>
    {shown !== null && <p className="sres-band__note">{bandComment(shown)}</p>}
  </section>
}

function CriteriaCard({ view }: { view: SpeakingResultView }) {
  const worst = weakestCriterion(view.criteria)
  return <section className="sres-card" aria-label="Điểm từng tiêu chí">
    <header><h2>Điểm từng tiêu chí</h2><span>Thang 0–9</span></header>
    {view.criteria.map((item) => <div className="sres-row" key={item.code}>
      <span>{item.name}{worst?.code === item.code && <em className="sres-badge">Cần cải thiện nhất</em>}</span>
      <i className="sres-bar"><u style={{ width: `${((item.band ?? 0) / 9) * 100}%` }} /></i>
      <b>{formatBand(item.band)}</b>
    </div>)}
    {view.summary && <p className="sres-summary">{view.summary}</p>}
  </section>
}

function NextSteps({ view }: { view: SpeakingResultView }) {
  if (view.focus.length === 0 && !view.personalNote && view.studyPlan.length === 0) return null
  return <section className="sres-card sres-next" aria-label="Gợi ý cải thiện">
    <header><h2>Nên làm gì tiếp theo</h2></header>
    {view.personalNote && <p className="sres-summary">{view.personalNote}</p>}
    {view.focus.length > 0 && <>
      <h3 className="sres-steps__label">Trọng tâm cải thiện</h3>
      <ul className="sres-steps">{view.focus.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </>}
    {view.studyPlan.length > 0 && <>
      <h3 className="sres-steps__label sres-steps__label--plan">Kế hoạch luyện tập</h3>
      <ul className="sres-steps sres-steps--plan">{view.studyPlan.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </>}
  </section>
}
/** The three speech scores of the Pronunciation bar, which has no model groups of its own to fill its panel. */
type ScoreTile = { label: string; value: string }

/**
 * The four criteria as bars. A closed bar already says the main thing (score, bar, one line); the weakest criterion is
 * open on arrival and opening another closes it, so the page stays short and the learner sees first what to fix.
 */
function CriteriaAccordion({ criteria, tiles }: { criteria: ResultCriterion[]; tiles: ScoreTile[] }) {
  const worst = weakestCriterion(criteria)
  const [open, setOpen] = useState<string | null>(worst?.code ?? criteria[0]?.code ?? null)
  return <div className="sres-acc">
    <p className="sres-acc__hint">Bấm vào từng tiêu chí để xem chi tiết</p>
    {criteria.map((item) => {
      const isOpen = open === item.code
      const isWorst = worst?.code === item.code
      const showTiles = item.code === 'PR' && tiles.length > 0
      const hasSides = item.strengths.length > 0 || item.weaknesses.length > 0
      return <article key={item.code} className={`sres-acc__item${isWorst ? ' is-worst' : ''}${isOpen ? ' is-open' : ''}`}>
        <h3>
          <button type="button" id={`sres-bar-${item.code}`} aria-expanded={isOpen} aria-controls={`sres-panel-${item.code}`}
            onClick={() => setOpen(isOpen ? null : item.code)}>
            <span className="sres-acc__band" aria-label={`Band ${formatBand(item.band)}`}>{formatBand(item.band)}</span>
            <span className="sres-acc__head">
              <span className="sres-acc__name">{item.name}<small>{item.code}</small>
                {isWorst && <em className="sres-badge">Cần cải thiện nhất</em>}
                {item.limited && <em className="sres-badge sres-badge--warn">Đã giới hạn band</em>}</span>
              <span className="sres-acc__line">{summaryLine(item.comment)}</span>
            </span>
            <i className="sres-bar sres-bar--thin sres-acc__meter" aria-hidden="true"><u style={{ width: `${((item.band ?? 0) / 9) * 100}%` }} /></i>
            {showTiles && <span className="sres-acc__tiles">{tiles.map((tile) => <span key={tile.label}><small>{tile.label}</small><b>{tile.value}</b></span>)}</span>}
            <ChevronDown className="sres-acc__chevron" size={20} aria-hidden="true" />
          </button>
        </h3>
        {isOpen && <div id={`sres-panel-${item.code}`} role="region" aria-labelledby={`sres-bar-${item.code}`}
          className={`sres-acc__panel${item.evidence.length === 0 ? ' is-single' : ''}`}>
          <div className="sres-acc__col">
            {item.comment && <p className="sres-acc__comment">{item.comment}</p>}
            {item.strengths.length > 0 && <section className="sres-group sres-group--good">
              <h4><CheckCircle2 size={15} aria-hidden="true" /> Điểm tốt</h4>
              <ul aria-label="Điểm tốt">{item.strengths.map((point, index) => <li key={index}>{point}</li>)}</ul>
            </section>}
            {item.weaknesses.length > 0 && <section className="sres-group sres-group--bad">
              <h4><TrendingUp size={15} aria-hidden="true" /> Cần cải thiện</h4>
              <ul aria-label="Cần cải thiện">{item.weaknesses.map((point, index) => <li key={index}>{point}</li>)}</ul>
            </section>}
            {!hasSides && !item.comment && <p className="sres-acc__comment sres-muted">Chưa có nhận xét chi tiết cho tiêu chí này.</p>}
          </div>
          {item.evidence.length > 0 && <div className="sres-acc__col">
            <section className="sres-group sres-group--quote">
              <h4><Quote size={15} aria-hidden="true" /> Trích từ bài của bạn</h4>
              {item.evidence.map((entry, index) => <blockquote key={index}><q>{entry.quote}</q>{entry.note && <span>{entry.note}</span>}</blockquote>)}
            </section>
          </div>}
        </div>}
      </article>
    })}
  </div>
}
function scoreOf(value: number | null) { return value === null ? '—' : value.toFixed(0) }

function pronunciationTiles(view: SpeakingResultView): ScoreTile[] {
  const { metrics } = view
  return [
    { label: 'Chính xác', value: scoreOf(metrics.accuracy) },
    { label: 'Trôi chảy', value: scoreOf(metrics.fluency) },
    { label: 'Phát âm', value: scoreOf(metrics.pronunciation) },
  ]
}

function Metrics({ view }: { view: SpeakingResultView }) {
  const { metrics } = view
  const cells: [string, string][] = [
    ['Từ / phút', metrics.wordsPerMinute === null || metrics.wordsPerMinute === 0 ? '—' : metrics.wordsPerMinute.toFixed(0)],
    ['Quãng ngắt dài', metrics.longPauses === null ? '—' : String(metrics.longPauses)],
  ]
  return <section className="sres-metrics" aria-label="Số đo từ giọng nói">
    <dl>{cells.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {view.weakWords.length > 0 && <div className="sres-words"><span>Từ phát âm cần luyện</span>
      <ul>{view.weakWords.map((entry, index) => <li key={index}>{entry.word}</li>)}</ul></div>}
  </section>
}
/** AI marks are practice figures: said once, clearly, with the way to a teacher's marking. */
function ReferenceNote({ lowQuality, onOpenPlans }: { lowQuality: boolean; onOpenPlans: () => void }) {
  return <aside className="sres-reference" role="note">
    <span className="sres-reference__icon" aria-hidden="true"><Info size={16} /></span>
    <p>
      <b>Điểm do AI chấm chỉ mang tính tham khảo.</b>
      {lowQuality && ' Lần ghi âm này khó nhận dạng nên độ chính xác có thể thấp hơn.'}
      {' '}Muốn nhận xét chính xác và chi tiết hơn, hãy đăng ký gói <strong>Premium</strong> để được giáo viên chấm trực tiếp.
    </p>
    <button type="button" className="sres-reference__cta" onClick={onOpenPlans}>Xem gói Premium</button>
  </aside>
}
function Result({ view, onOpenPlans }: { view: SpeakingResultView; onOpenPlans: () => void }) {
  return <>
    <ReferenceNote lowQuality={view.transcriptWarning !== ''} onOpenPlans={onOpenPlans} />
    {view.bandLimits.length > 0 && <div className="sres-alert" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <div>
        <b>Band bị giới hạn vì:</b>
        <ul>{view.bandLimits.map((message, index) => <li key={index}>{message.replace(/ nên band bị giới hạn\.?$/, '').replace(/\.$/, '')}</li>)}</ul>
      </div>
    </div>}
    <div className="sres-dash">
      <BandCard view={view} />
      <CriteriaCard view={view} />
      <NextSteps view={view} />
    </div>
    <Metrics view={view} />
    <h2 className="sres-h2">Chi tiết theo từng tiêu chí</h2>
    <CriteriaAccordion criteria={view.criteria} tiles={pronunciationTiles(view)} />
    {view.transcripts.some((entry) => entry.words.length > 0) && <>
      <h2 className="sres-h2">Phát âm từng từ, từng âm</h2>
      <PronunciationBreakdown view={view} />
    </>}
    {view.partNotes.length > 0 && <section className="sres-card" aria-label="Nhận xét theo part">
      <header><h2>Nhận xét theo part</h2></header>
      {view.partNotes.map((entry) => <p key={entry.partNo} className="sres-part"><b>Part {entry.partNo}</b><span>{entry.note}</span></p>)}
    </section>}
    {view.errors.length > 0 && <>
      <h2 className="sres-h2">Lỗi nên sửa</h2>
      <section className="sres-errors" aria-label="Lỗi nên sửa">{view.errors.map((entry, index) => <article key={index}>
        <h3>{entry.name}{entry.partNo !== null && <small>Part {entry.partNo}</small>}</h3>
        <blockquote><q>{entry.excerpt}</q></blockquote>
        {entry.suggestion && <p><b>Gợi ý:</b> {entry.suggestion}</p>}
      </article>)}</section>
    </>}
    {view.transcripts.length > 0 && <>
      <h2 className="sres-h2">Bản chép lời</h2>
      <section className="sres-transcripts" aria-label="Bản chép lời">{view.transcripts.map((entry, index) => <details key={index}>
        <summary>Part {entry.partNo} · câu {entry.questionNo}{entry.question && <span>{entry.question}</span>}</summary>
        <p>{entry.transcript || 'Không nhận dạng được lời nói trong câu này.'}</p>
      </details>)}</section>
    </>}
  </>
}
/** The graded result with the plans and key dialogs it opens; the page and a lesson both show it. */
export function SpeakingResultDetail({ view }: { view: SpeakingResultView }) {
  const wallet = useWritingWallet()
  const [plansOpen, setPlansOpen] = useState(false)
  const [keyProduct, setKeyProduct] = useState<ActivationProduct | null>(null)
  return <>
    <Result view={view} onOpenPlans={() => setPlansOpen(true)} />
    <PremiumPlansDialog open={plansOpen} onClose={() => setPlansOpen(false)}
      onChoose={(product) => { setPlansOpen(false); setKeyProduct(product) }} />
    <KeyActivationDialog product={keyProduct} isLoggedIn={wallet.isLoggedIn} client={wallet.client}
      onClose={() => setKeyProduct(null)} onActivated={wallet.onActivated} returnFocus={() => undefined} />
  </>
}

/** The page of a submission opened by its own address. */
export function SpeakingSubmissionResultPage() {
  const { submissionId = '' } = useParams()
  return <SpeakingResultScreen submissionId={submissionId} />
}

/**
 * The result of one submission: the waiting screen while it is graded, then the result, all in the same place. The review
 * page shows this in itself after the answers are sent, so the learner is not taken to another page to wait.
 */
export function SpeakingResultScreen({ submissionId }: { submissionId: string }) {
  const { submission, error, short, retry } = useSpeakingSubmissionResult(submissionId)
  const status = submission?.status
  const view = status === 'GRADED' && submission?.result ? parseSpeakingResult(submission.result) : null
  const working = status !== undefined && WORKING.has(status)

  return <div className="sres-page">
    <header className="sres-top">
      <Link className="sres-exit" to={CATALOG_PATH} aria-label="Về danh mục Speaking"><X size={16} aria-hidden="true" /></Link>
      <span><Mic size={16} aria-hidden="true" /> Bài luyện Speaking</span>
    </header>
    <main className="sres-main">
      <div className="sres-titlebar"><h1>Kết quả chấm bài</h1>{view && <p className="sres-done"><CheckCircle2 size={16} aria-hidden="true" /> Đã chấm xong</p>}</div>
      {!submission && !error && <SpeakingWaitingPanel status={undefined} />}
      {working && !short && <SpeakingWaitingPanel status={status} />}
      {short && <Notice tone="warn" icon={<AlertTriangle size={20} />} title="Chưa nhận được kết quả">
        <p>Số dư point hiện tại chưa đủ để nhận kết quả bài này. Bài chấm của bạn được giữ lại, bạn nạp thêm point rồi thử lại nhé.</p>
        <button type="button" onClick={retry}>Thử lại</button></Notice>}
      {status === 'NEEDS_EXAMINER' && <Notice tone="stop" icon={<AlertTriangle size={20} />} title="Cần giám khảo xem lại">
        <p>Kết quả tự động chưa đủ tin cậy nên bài này cần được xem lại. Bạn không bị trừ point.</p></Notice>}
      {status === 'ABANDONED' && <Notice tone="stop" icon={<AlertTriangle size={20} />} title="Bài nộp đã dừng">
        <p>Bài này chưa được gửi đủ bản ghi nên đã dừng. Bạn có thể ghi âm và gửi lại.</p></Notice>}
      {error && <Notice tone="stop" icon={<AlertTriangle size={20} />} title="Có lỗi xảy ra"><p>{error}</p>
        <button type="button" onClick={retry}>Tải lại</button></Notice>}
      {view && <SpeakingResultDetail view={view} />}
      <Link className="sres-back" to={CATALOG_PATH}>← Về danh mục Speaking</Link>
    </main>
  </div>
}
