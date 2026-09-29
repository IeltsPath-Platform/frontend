import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react"
import { CheckCircle2, ChevronLeft, ChevronRight, Download, Maximize2, MessageCircle, Play, X } from "lucide-react"
import { CLASS_PROFILE, VOCAB_ENTRY } from "@/lib/mock/class"

type OverlayProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelledBy: string
  wide?: boolean
  drawer?: boolean
}

export function LmsOverlay({ open, onClose, children, labelledBy, wide, drawer }: OverlayProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={`lms-overlay${drawer ? " lms-overlay--drawer" : ""}`} role="presentation">
      <button type="button" className="lms-overlay__scrim" aria-label="Đóng lớp phủ" onClick={onClose} />
      <div
        className={`lms-overlay__panel${wide ? " is-wide" : ""}${drawer ? " is-drawer" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  )
}

export function MentorChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId()
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState([
    { id: "m1", from: "mentor" as const, text: "Chào bạn! Hôm nay mình ôn Keyword map Listening nhé." },
    { id: "m2", from: "me" as const, text: "Em đang kẹt phần map labeling ạ." },
  ])

  const send = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setMessages((prev) => [...prev, { id: `m-${Date.now()}`, from: "me", text }])
    setDraft("")
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `m-r-${Date.now()}`,
          from: "mentor",
          text: "Ok — gửi mình ảnh bài hoặc timestamp audio, mình chỉ chỗ bắt keyword.",
        },
      ])
    }, 700)
  }

  return (
    <LmsOverlay open={open} onClose={onClose} labelledBy={titleId} drawer>
      <header className="lms-drawer__head">
        <div className="lms-drawer__who">
          <span aria-hidden="true">{CLASS_PROFILE.mentor.initial}</span>
          <div>
            <h2 id={titleId}>{CLASS_PROFILE.mentor.name}</h2>
            <p>{CLASS_PROFILE.mentor.title}</p>
          </div>
        </div>
        <button type="button" className="lms-icon-btn" aria-label="Đóng chat" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>
      <div className="lms-drawer__thread" aria-live="polite">
        {messages.map((message) => (
          <p key={message.id} className={`lms-bubble lms-bubble--${message.from}`}>
            {message.text}
          </p>
        ))}
      </div>
      <form className="lms-drawer__compose" onSubmit={send}>
        <label className="sr-only" htmlFor={`${titleId}-input`}>
          Tin nhắn mentor
        </label>
        <input
          id={`${titleId}-input`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Nhắn mentor…"
          autoComplete="off"
        />
        <button type="submit">
          <MessageCircle aria-hidden="true" />
          Gửi
        </button>
      </form>
    </LmsOverlay>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel,
  cancelLabel = "Huỷ",
  tone = "brand",
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  onCancel?: () => void
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: "brand" | "danger" | "pro"
}) {
  const titleId = useId()
  const handleCancel = () => {
    onCancel?.()
    onClose()
  }
  return (
    <LmsOverlay open={open} onClose={handleCancel} labelledBy={titleId}>
      <header className="lms-dialog__head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="lms-icon-btn" aria-label="Đóng" onClick={handleCancel}>
          <X aria-hidden="true" />
        </button>
      </header>
      <p className="lms-dialog__body">{description}</p>
      <footer className="lms-dialog__foot">
        <button type="button" className="lms-btn lms-btn--ghost" onClick={handleCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`lms-btn lms-btn--${tone}`}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </button>
      </footer>
    </LmsOverlay>
  )
}

export type DiglotWordData = {
  word: string
  phonetic: string
  meaning: string
  example: string
  type?: string
  cefr?: string
  topic?: string
}

export function DiglotWordPopup({
  open,
  onClose,
  data,
  anchorWord,
}: {
  open: boolean
  onClose: () => void
  data?: DiglotWordData | null
  anchorWord?: string
}) {
  const titleId = useId()
  const word = data?.word ?? anchorWord ?? VOCAB_ENTRY.headword
  const phonetic = data?.phonetic ?? `UK ${VOCAB_ENTRY.phonetics.uk} · US ${VOCAB_ENTRY.phonetics.us}`
  const meaning = data?.meaning ?? VOCAB_ENTRY.meaning
  const example = data?.example ?? "Sustainable farming protects soil for the next generation."
  const type = data?.type ?? VOCAB_ENTRY.type
  const cefr = data?.cefr ?? VOCAB_ENTRY.cefr
  const topic = data?.topic ?? VOCAB_ENTRY.topic

  return (
    <LmsOverlay open={open} onClose={onClose} labelledBy={titleId}>
      <header className="lms-dialog__head">
        <h2 id={titleId}>{word}</h2>
        <button type="button" className="lms-icon-btn" aria-label="Đóng" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>
      <p className="lms-word__ipa">{phonetic}</p>
      <dl className="lms-word__meta">
        <div>
          <dt>Loại từ</dt>
          <dd>{type}</dd>
        </div>
        <div>
          <dt>CEFR</dt>
          <dd>{cefr}</dd>
        </div>
        <div>
          <dt>Chủ đề</dt>
          <dd>{topic}</dd>
        </div>
      </dl>
      <p className="lms-word__def">{meaning}</p>
      <p className="lms-word__example">
        <em>Example:</em> {example}
      </p>
      <footer className="lms-dialog__foot">
        <button type="button" className="lms-btn lms-btn--brand" onClick={onClose}>
          Thêm vào sổ từ
        </button>
      </footer>
    </LmsOverlay>
  )
}

export function PdfViewerDialog({
  open,
  onClose,
  title,
  meta,
  pages = 8,
  onDownload,
}: {
  open: boolean
  onClose: () => void
  title: string
  meta?: string
  pages?: number
  onDownload?: () => void
}) {
  const titleId = useId()
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (open) setPage(1)
  }, [open, title])

  return (
    <LmsOverlay open={open} onClose={onClose} labelledBy={titleId} wide>
      <header className="lms-dialog__head">
        <div>
          <h2 id={titleId}>{title}</h2>
          <p className="lms-pdf__meta">
            Trang {page}/{pages}
            {meta ? ` · ${meta}` : " · PDF viewer"}
          </p>
        </div>
        <button type="button" className="lms-icon-btn" aria-label="Đóng" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>
      <div className="lms-pdf__stage" aria-live="polite">
        <article className="lms-pdf__page">
          <p className="lms-pdf__eyebrow">IELTS Cất cánh · Buổi 1</p>
          <h3>
            {title} — trang {page}
          </h3>
          <div className="lms-pdf__columns">
            <p>
              Nature &amp; Environment — học viên nắm lexical set (habitat, biodiversity, sustainable) và dự đoán
              keyword trước khi nghe / đọc.
            </p>
            <p>
              Checklist buổi học: warm-up → topic map → vocabulary → listening focus → practice task Matching Headings.
            </p>
          </div>
          <ul>
            <li>Mục tiêu buổi học &amp; learning outcomes</li>
            <li>Lexical set trọng tâm + collocations</li>
            <li>Bài tập về nhà (deadline trên Homework Hub)</li>
            <li>Link audio TIS 2899 (nếu có)</li>
          </ul>
          <div className="lms-pdf__footer-note">Trang {page} / {pages} · Bản xem trước LMS</div>
        </article>
      </div>
      <footer className="lms-dialog__foot lms-pdf__foot">
        <div className="lms-pdf__pager">
          <button type="button" className="lms-btn lms-btn--ghost" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>
            <ChevronLeft aria-hidden="true" />
            Trước
          </button>
          <button
            type="button"
            className="lms-btn lms-btn--ghost"
            disabled={page >= pages}
            onClick={() => setPage((v) => v + 1)}
          >
            Sau
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="lms-btn lms-btn--brand"
          onClick={() => {
            onDownload?.()
          }}
        >
          <Download aria-hidden="true" />
          Tải PDF
        </button>
      </footer>
    </LmsOverlay>
  )
}

export function SlideFullscreenDialog({
  open,
  onClose,
  pages,
  index,
  onIndexChange,
  label,
  hint,
  total,
  onPrev,
  onNext,
}: {
  open: boolean
  onClose: () => void
  pages?: { id: string; label: string; hint: string }[]
  index: number
  onIndexChange?: (index: number) => void
  label?: string
  hint?: string
  total?: number
  onPrev?: () => void
  onNext?: () => void
}) {
  const titleId = useId()
  const current = pages?.[index]
  const displayLabel = current?.label ?? label ?? ""
  const displayHint = current?.hint ?? hint ?? ""
  const count = pages?.length ?? total ?? 1

  const goPrev = () => {
    if (onPrev) onPrev()
    else if (onIndexChange && index > 0) onIndexChange(index - 1)
  }
  const goNext = () => {
    if (onNext) onNext()
    else if (onIndexChange && index < count - 1) onIndexChange(index + 1)
  }

  return (
    <LmsOverlay open={open} onClose={onClose} labelledBy={titleId} wide>
      <header className="lms-dialog__head">
        <h2 id={titleId}>
          Trình chiếu · {index + 1}/{count}
        </h2>
        <button type="button" className="lms-icon-btn" aria-label="Thu nhỏ" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>
      <div className="lms-slide-fs">
        <button type="button" className="lms-btn lms-btn--ghost" onClick={goPrev} disabled={index <= 0}>
          Trước
        </button>
        <article className="lms-slide-fs__frame">
          <p className="lms-slide-fs__brand">LMS · IELTS Reading</p>
          <p>{displayLabel}</p>
          <h3>{displayHint}</h3>
          <ul>
            <li>Key vocabulary from the session</li>
            <li>Strategy tips for the question type</li>
            <li>Practice cue for homework</li>
          </ul>
        </article>
        <button type="button" className="lms-btn lms-btn--ghost" onClick={goNext} disabled={index >= count - 1}>
          Sau
        </button>
      </div>
    </LmsOverlay>
  )
}

export function ToastStack({
  items,
  toasts,
  onDismiss,
}: {
  items?: { id: string; message?: string; title?: string; detail?: string }[]
  toasts?: { id: string; title: string; detail?: string }[]
  onDismiss: (id: string) => void
}) {
  const list = (items ?? toasts ?? []).map((toast) => ({
    id: toast.id,
    title: ("title" in toast && toast.title) || ("message" in toast ? toast.message : undefined) || "",
    detail: "detail" in toast ? toast.detail : undefined,
  }))
  return (
    <div className="lms-toasts" aria-live="polite">
      {list.map((toast) => (
        <div key={toast.id} className="lms-toast" role="status">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <strong>{toast.title}</strong>
            {toast.detail ? <p>{toast.detail}</p> : null}
          </div>
          <button type="button" className="lms-icon-btn" aria-label="Đóng thông báo" onClick={() => onDismiss(toast.id)}>
            <X aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function useLmsToasts() {
  const [toasts, setToasts] = useState<{ id: string; title: string; detail?: string }[]>([])
  const push = (title: string, detail?: string) => {
    const id = `t-${Date.now()}`
    setToasts((prev) => [...prev, { id, title, detail }])
    window.setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 4200)
  }
  const dismiss = (id: string) => setToasts((prev) => prev.filter((item) => item.id !== id))
  return { toasts, push, dismiss }
}

export function ProUpgradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId()
  return (
    <LmsOverlay open={open} onClose={onClose} labelledBy={titleId}>
      <header className="lms-dialog__head">
        <h2 id={titleId}>Nâng cấp IELTS Space PRO</h2>
        <button type="button" className="lms-icon-btn" aria-label="Đóng" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>
      <ul className="lms-pro-list">
        <li>Full đề Cambridge &amp; Actual không giới hạn</li>
        <li>Chấm AI Writing / Speaking chi tiết</li>
        <li>Mentor ưu tiên trong 24h</li>
      </ul>
      <footer className="lms-dialog__foot">
        <button type="button" className="lms-btn lms-btn--ghost" onClick={onClose}>
          Để sau
        </button>
        <button type="button" className="lms-btn lms-btn--pro" onClick={onClose}>
          Nâng cấp ngay
        </button>
      </footer>
    </LmsOverlay>
  )
}

export function PlacementTestDialog({
  open,
  onClose,
  onStart,
}: {
  open: boolean
  onClose: () => void
  onStart: () => void
}) {
  const titleId = useId()
  return (
    <LmsOverlay open={open} onClose={onClose} labelledBy={titleId}>
      <header className="lms-dialog__head">
        <h2 id={titleId}>Bắt đầu test đầu vào?</h2>
        <button type="button" className="lms-icon-btn" aria-label="Đóng" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>
      <p className="lms-dialog__body">
        Bài test khoảng 40 phút, gồm Reading + Listening ngắn. Kết quả giúp xếp band và gợi ý lộ trình.
      </p>
      <footer className="lms-dialog__foot">
        <button type="button" className="lms-btn lms-btn--ghost" onClick={onClose}>
          Để sau
        </button>
        <button
          type="button"
          className="lms-btn lms-btn--brand"
          onClick={() => {
            onStart()
            onClose()
          }}
        >
          <Play aria-hidden="true" />
          TEST NGAY
        </button>
      </footer>
    </LmsOverlay>
  )
}

export function FlashcardFlip({
  front,
  back,
  flipped,
  onFlip,
}: {
  front: ReactNode
  back: ReactNode
  flipped: boolean
  onFlip: () => void
}) {
  return (
    <button type="button" className={`lms-flip${flipped ? " is-flipped" : ""}`} onClick={onFlip} aria-pressed={flipped}>
      <span className="lms-flip__inner">
        <span className="lms-flip__face lms-flip__face--front">{typeof front === "string" ? <strong>{front}</strong> : front}</span>
        <span className="lms-flip__face lms-flip__face--back">{typeof back === "string" ? <strong>{back}</strong> : back}</span>
      </span>
    </button>
  )
}

export function FullscreenHintButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="lms-btn lms-btn--ghost" onClick={onClick}>
      <Maximize2 aria-hidden="true" />
      Mở rộng
    </button>
  )
}
