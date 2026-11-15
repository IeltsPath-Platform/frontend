import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Expand, KeyRound, Search, Settings, Sparkles, TriangleAlert, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { PracticeSettingsPopover } from '../components/PracticeSettingsPopover'
import type { WorkspaceFontSize } from '../reading/ReadingWorkspaceParts'
import type { WritingTask } from './writingApi'
import { boldRuns, parseGuide } from './writingText'

/** Area A: exit, what the screen is showing (clock or step progress) and the display settings. */
export function WritingTopBar({ exitTo, children, showEyeComfort = true, eyeComfort, onToggleEyeComfort, fontSize, onChangeFontSize }: {
  exitTo: string
  children?: ReactNode
  /** The real exam screen has no eye-comfort mode. */
  showEyeComfort?: boolean
  eyeComfort: boolean
  onToggleEyeComfort: (value: boolean) => void
  fontSize: WorkspaceFontSize
  onChangeFontSize: (size: WorkspaceFontSize) => void
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  return (
    <header className="rw-topbar ww-topbar">
      <Link className="rw-exit" to={exitTo} aria-label="Thoát bài làm"><X size={16} aria-hidden="true" /></Link>
      <div className="ww-topbar-center">{children}</div>
      <div className="rw-settings">
        <button type="button" className="rw-settings-button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}>
          <Settings size={14} aria-hidden="true" /> Cài đặt
        </button>
        <PracticeSettingsPopover isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} eyeComfort={eyeComfort} showEyeComfort={showEyeComfort}
          onToggleEyeComfort={onToggleEyeComfort} fontSize={fontSize} onChangeFontSize={onChangeFontSize} />
      </div>
    </header>
  )
}

/** The chart of a Task 1 with a button that opens it large. */
export function WritingChart({ task }: { task: WritingTask }) {
  const [zoom, setZoom] = useState(false)
  const image = task.images[0]
  if (!image) return null
  return (
    <>
      <figure className="ww-chart">
        <img src={image.url} alt={image.altText ?? 'Biểu đồ của đề bài'} />
      </figure>
      <button type="button" className="ww-zoom" onClick={() => setZoom(true)}><Expand size={14} aria-hidden="true" /> Phóng to biểu đồ</button>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="ww-zoom-dialog">
          <DialogTitle className="sr-only">Biểu đồ của đề bài</DialogTitle>
          <DialogDescription className="sr-only">{image.altText}</DialogDescription>
          <img src={image.url} alt={image.altText ?? 'Biểu đồ của đề bài'} />
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Area B of free writing: the prompt, the chart and the writing guide stored with the task. */
export function WritingTaskPanel({ task, showGuide }: { task: WritingTask; showGuide: boolean }) {
  const blocks = useMemo(() => parseGuide(task.guide), [task.guide])
  return (
    <section className="ww-card ww-task" aria-label="Đề bài">
      <header className="ww-card-head"><strong>Đề bài</strong></header>
      <div className="ww-task-scroll">
        <p className="ww-prompt">{task.prompt}</p>
        <WritingChart task={task} />
        {showGuide && blocks.length > 0 && (
          <article className="ww-guide" aria-label="Hướng dẫn viết bài">
            <h2>HƯỚNG DẪN VIẾT BÀI</h2>
            <p className="ww-guide-sub">IELTS Writing {task.task === 'TASK_2' ? 'Task 2' : 'Task 1'} · {task.title}</p>
            {blocks.map((block, index) => {
              const runs = boldRuns(block.text).map((run, i) => (run.bold ? <strong key={i}>{run.text}</strong> : <span key={i}>{run.text}</span>))
              if (block.kind === 'heading') return <h3 key={index}>{block.text}</h3>
              if (block.kind === 'bullet') return <p key={index} className="ww-guide-bullet">{runs}</p>
              return <p key={index}>{runs}</p>
            })}
          </article>
        )}
      </div>
    </section>
  )
}

const LOOKUP_LIMIT = 50

/** Area D: the dictionary panel, one box to look a word up in. Only the layout is drawn for now; looking a word up is not connected yet. */
export function WritingDictionaryPanel({ children }: { children?: ReactNode }) {
  const [query, setQuery] = useState('')

  return (
    <aside className="ww-card ww-dictionary" aria-label="Tra từ vựng">
      <header className="ww-card-head"><strong>Tra từ vựng</strong></header>
      <div className="ww-dictionary-body">{children}</div>
      <div className="ww-lookup">
        <input value={query} maxLength={LOOKUP_LIMIT} placeholder="Nhập từ hoặc cụm từ cần tra"
          aria-label="Từ cần tra" onChange={(event) => setQuery(event.target.value)} />
        <div className="ww-lookup-foot">
          <span>{query.length}/{LOOKUP_LIMIT} ký tự</span>
          <button type="button" disabled><Search size={12} aria-hidden="true" /> Tra từ vựng</button>
        </div>
      </div>
    </aside>
  )
}

export interface GradeFigures {
  cost: number
  balance: number | null
  context: string
  benefits: string[]
  /** What the essay has so far, each with whether it passes. */
  checks: Array<{ text: string; ok: boolean }>
}

/** Wording that differs between skills; the defaults are the Writing ones. */
export interface GradeDialogCopy {
  description?: string
  /** The button that closes the dialog without grading. */
  backLabel?: string
  /** The line under the buttons. */
  note?: string
  /** The grade button while the work is running. */
  busyLabel?: string
}

/** A consent the learner must tick before the grade button opens. */
export interface GradeConsent {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** "Spend points to let the AI grade": the cost, the balance after, and what the learner gets. */
export function GradeConfirmDialog({ figures, busy, error, canGrade, onGrade, onClose, copy, consent, progress }: {
  figures: GradeFigures
  busy: boolean
  error: string
  canGrade: boolean
  onGrade: () => void
  onClose: () => void
  copy?: GradeDialogCopy
  consent?: GradeConsent
  /** What the work has done so far while {@code busy}, such as "Đang tải lên 2/4". */
  progress?: string
}) {
  const { cost, balance } = figures
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent className="ww-dialog">
        <DialogTitle className="ww-dialog-title"><Sparkles size={20} aria-hidden="true" /> Chấm bài bằng AI</DialogTitle>
        <DialogDescription>{copy?.description ?? 'AI chấm theo 4 tiêu chí IELTS Writing và trả về Band, lỗi cần sửa và gợi ý cải thiện.'}</DialogDescription>
        <p className="ww-dialog-context">{figures.context}</p>
        <div className="ww-figures">
          <div><span>Chi phí chấm</span><strong className="is-strong">−{cost} point</strong></div>
          <div><span>Số dư hiện tại</span><strong>{balance === null ? '—' : `${balance} point`}</strong></div>
          <div><span>Số dư sau khi chấm</span><strong className="is-strong">{balance === null ? '—' : `${balance - cost} point`}</strong></div>
        </div>
        <div>
          <h3 className="ww-dialog-sub">Bạn sẽ nhận được</h3>
          <ul className="ww-benefits">{figures.benefits.map((benefit) => <li key={benefit}>✓ {benefit}</li>)}</ul>
        </div>
        <p className="ww-checks">{figures.checks.map((check, index) => (
          <span key={check.text} className={check.ok ? 'is-ok' : 'is-warn'}>{index > 0 ? ' · ' : ''}{check.text} {check.ok ? '✓' : '!'}</span>
        ))}</p>
        {consent && (
          <label className="ww-consent">
            <input type="checkbox" checked={consent.checked} disabled={busy} onChange={(event) => consent.onChange(event.target.checked)} />
            <span>{consent.label}</span>
          </label>
        )}
        {error && <p className="ww-error" role="alert">{error}</p>}
        {busy && progress && <p className="ww-muted" role="status">{progress}</p>}
        <div className="ww-dialog-actions">
          <button type="button" className="ww-secondary" disabled={busy} onClick={onClose}>{copy?.backLabel ?? 'Quay lại chỉnh sửa'}</button>
          <button type="button" className="ww-primary" disabled={busy || !canGrade || (consent !== undefined && !consent.checked)} onClick={onGrade}>
            {busy ? (copy?.busyLabel ?? 'Đang chấm bài…') : `Chấm bài · ${cost} point`}
          </button>
        </div>
        <p className="ww-dialog-note">{copy?.note ?? 'Bài sẽ được khóa sau khi chấm. Nếu AI gặp lỗi, point sẽ được hoàn lại.'}</p>
      </DialogContent>
    </Dialog>
  )
}

/** The grading terms (cost, word limits) did not load: nothing can be priced, so say so and let the learner try again. */
export function GradingTermsDialog({ loading, onRetry, onClose }: { loading: boolean; onRetry: () => void; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="ww-dialog">
        <DialogTitle className="ww-dialog-title">Chọn cách chấm bài</DialogTitle>
        <DialogDescription>Bài viết của bạn vẫn được giữ nguyên.</DialogDescription>
        <p role={loading ? 'status' : 'alert'}>
          {loading ? 'Đang tải điều khoản chấm…' : 'Chưa tải được điều khoản chấm. Thử lại để chọn cách chấm bài.'}
        </p>
        <div className="ww-dialog-actions">
          <button type="button" className="ww-secondary" onClick={onClose}>Quay lại chỉnh sửa</button>
          <button type="button" className="ww-primary" disabled={loading} onClick={onRetry}>Thử lại</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The balance is under the cost: say by how much and offer to add points with an activation key. */
export function NotEnoughPointsDialog({ cost, balance, onActivate, onClose, copy }: {
  cost: number
  balance: number | null
  onActivate: () => void
  onClose: () => void
  copy?: Pick<GradeDialogCopy, 'backLabel'> & { kept?: string }
}) {
  const have = balance ?? 0
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="ww-dialog">
        <DialogTitle className="ww-dialog-title"><TriangleAlert size={20} aria-hidden="true" /> Bạn chưa đủ point để chấm bài</DialogTitle>
        <DialogDescription>Chấm bài bằng AI cần {cost} point. Hãy nạp thêm point để tiếp tục — {copy?.kept ?? 'bài viết của bạn vẫn được giữ nguyên'}.</DialogDescription>
        <div className="ww-figures ww-figures-short">
          <div><span>Chi phí chấm</span><strong>{cost} point</strong></div>
          <div><span>Số dư hiện tại</span><strong>{have} point</strong></div>
          <div><span>Còn thiếu</span><strong className="ww-short-badge">{Math.max(0, cost - have)} point</strong></div>
        </div>
        <div>
          <h3 className="ww-dialog-sub"><KeyRound size={15} aria-hidden="true" /> Nạp point bằng Activation Key</h3>
          <p className="ww-muted">Nhập mã Activation Key được cấp để cộng point vào tài khoản.</p>
        </div>
        <div className="ww-dialog-actions">
          <button type="button" className="ww-secondary" onClick={onClose}>{copy?.backLabel ?? 'Quay lại chỉnh sửa'}</button>
          <button type="button" className="ww-primary" onClick={onActivate}><KeyRound size={15} aria-hidden="true" /> Nạp Key</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
