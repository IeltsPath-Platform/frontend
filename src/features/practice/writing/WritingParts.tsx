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
export function WritingTopBar({ exitTo, children, eyeComfort, onToggleEyeComfort, fontSize, onChangeFontSize }: {
  exitTo: string
  children?: ReactNode
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
        <PracticeSettingsPopover isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} eyeComfort={eyeComfort}
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

/** Area D: the dictionary panel. Only the layout is drawn for now; looking a word up is not connected yet. */
export function WritingDictionaryPanel({ children }: { children?: ReactNode }) {
  const [direction, setDirection] = useState<'vi-en' | 'en-vi'>('vi-en')
  const [query, setQuery] = useState('')

  return (
    <aside className="ww-card ww-dictionary" aria-label="Tra từ vựng">
      <header className="ww-card-head"><strong>Tra từ vựng</strong></header>
      <div className="ww-dictionary-body">{children}</div>
      <div className="ww-lookup">
        <div className="ww-lookup-tabs" role="tablist" aria-label="Chiều tra từ">
          <button type="button" role="tab" aria-selected={direction === 'vi-en'} className={direction === 'vi-en' ? 'is-on' : ''} onClick={() => setDirection('vi-en')}>Tra Việt-Anh</button>
          <button type="button" role="tab" aria-selected={direction === 'en-vi'} className={direction === 'en-vi' ? 'is-on' : ''} onClick={() => setDirection('en-vi')}>Tra Anh-Việt</button>
        </div>
        <input value={query} maxLength={LOOKUP_LIMIT} placeholder={direction === 'vi-en' ? 'Nhập cụm Tiếng Việt cần tra' : 'Nhập từ hoặc cụm Tiếng Anh cần tra'}
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

/** "Spend points to let the AI grade": the cost, the balance after, and what the learner gets. */
export function GradeConfirmDialog({ figures, busy, error, canGrade, onGrade, onClose }: {
  figures: GradeFigures
  busy: boolean
  error: string
  canGrade: boolean
  onGrade: () => void
  onClose: () => void
}) {
  const { cost, balance } = figures
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent className="ww-dialog">
        <DialogTitle className="ww-dialog-title"><Sparkles size={20} aria-hidden="true" /> Chấm bài bằng AI</DialogTitle>
        <DialogDescription>AI chấm theo 4 tiêu chí IELTS Writing và trả về Band, lỗi cần sửa và gợi ý cải thiện.</DialogDescription>
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
        {error && <p className="ww-error" role="alert">{error}</p>}
        <div className="ww-dialog-actions">
          <button type="button" className="ww-secondary" disabled={busy} onClick={onClose}>Quay lại chỉnh sửa</button>
          <button type="button" className="ww-primary" disabled={busy || !canGrade} onClick={onGrade}>{busy ? 'Đang chấm bài…' : `Chấm bài · ${cost} point`}</button>
        </div>
        <p className="ww-dialog-note">Bài sẽ được khóa sau khi chấm. Nếu AI gặp lỗi, point sẽ được hoàn lại.</p>
      </DialogContent>
    </Dialog>
  )
}

/** The balance is under the cost: say by how much and offer to add points with an activation key. */
export function NotEnoughPointsDialog({ cost, balance, onActivate, onClose }: {
  cost: number
  balance: number | null
  onActivate: () => void
  onClose: () => void
}) {
  const have = balance ?? 0
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="ww-dialog">
        <DialogTitle className="ww-dialog-title"><TriangleAlert size={20} aria-hidden="true" /> Bạn chưa đủ point để chấm bài</DialogTitle>
        <DialogDescription>Chấm bài bằng AI cần {cost} point. Hãy nạp thêm point để tiếp tục — bài viết của bạn vẫn được giữ nguyên.</DialogDescription>
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
          <button type="button" className="ww-secondary" onClick={onClose}>Quay lại chỉnh sửa</button>
          <button type="button" className="ww-primary" onClick={onActivate}><KeyRound size={15} aria-hidden="true" /> Nạp Key</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
