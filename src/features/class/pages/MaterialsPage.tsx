import { useState } from "react"
import { ChevronLeft, ChevronRight, Download, FileText, Maximize2, MonitorPlay, ScrollText } from "lucide-react"
import { SessionShell } from "@/features/class/components/SessionShell"
import { PdfViewerDialog, SlideFullscreenDialog, ToastStack, useLmsToasts } from "@/features/class/components/overlays"
import {
  COURSE_DOCUMENTS,
  LESSON_OUTCOMES,
  SLIDE_PAGES,
  type MaterialTab,
} from "@/lib/mock/class"

const tabs: { id: MaterialTab; label: string }[] = [
  { id: "slides", label: "Slide bài giảng" },
  { id: "summary", label: "Lesson summary" },
  { id: "documents", label: "Tài liệu bài khoá" },
]

export function MaterialsPage() {
  const [tab, setTab] = useState<MaterialTab>("slides")
  const [mode, setMode] = useState<"present" | "scroll">("present")
  const [slide, setSlide] = useState(0)
  const [pdfDoc, setPdfDoc] = useState<(typeof COURSE_DOCUMENTS)[number] | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const { toasts, push, dismiss } = useLmsToasts()
  const current = SLIDE_PAGES[slide]

  const breadcrumb =
    tab === "slides"
      ? "• Tài liệu buổi học / Slide bài giảng"
      : tab === "summary"
        ? "• Tài liệu buổi học / Lesson Summary"
        : "• Tài liệu buổi học / Tài liệu bài khoá"

  return (
    <SessionShell breadcrumb={breadcrumb}>
      <div className="cls-pill-tabs" role="tablist" aria-label="Loại tài liệu">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "slides" ? (
        <section className="cls-slides" aria-label="Slide bài giảng">
          <div className="cls-slides__bar">
            <div className="cls-view-toggle" role="group" aria-label="Chế độ xem">
              <button type="button" aria-pressed={mode === "present"} onClick={() => setMode("present")}>
                <MonitorPlay aria-hidden="true" />
                Trình chiếu
              </button>
              <button type="button" aria-pressed={mode === "scroll"} onClick={() => setMode("scroll")}>
                <ScrollText aria-hidden="true" />
                Cuộn dọc
              </button>
            </div>
            <button type="button" className="cls-slides__fs" onClick={() => setFullscreen(true)}>
              <Maximize2 aria-hidden="true" />
              Toàn màn hình
            </button>
          </div>

          {mode === "present" ? (
            <div className="cls-slide-viewer">
              <button
                type="button"
                className="cls-slide-nav"
                aria-label="Slide trước"
                disabled={slide === 0}
                onClick={() => setSlide((v) => Math.max(0, v - 1))}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <article className="cls-slide-frame cls-slide-frame--rich" onDoubleClick={() => setFullscreen(true)}>
                <p className="cls-slide-frame__index">
                  {slide + 1} / {SLIDE_PAGES.length}
                </p>
                <div className="cls-slide-frame__brand">LMS · IELTS Reading</div>
                <h2>{current.label}</h2>
                <p>{current.hint}</p>
                <ul className="cls-slide-frame__bullets">
                  <li>Key vocabulary from the session</li>
                  <li>Strategy tips for the question type</li>
                  <li>Practice cue for homework</li>
                </ul>
                <p className="cls-slide-frame__hint">Nhấp đúp hoặc bấm Toàn màn hình để phóng lớn</p>
              </article>
              <button
                type="button"
                className="cls-slide-nav"
                aria-label="Slide sau"
                disabled={slide === SLIDE_PAGES.length - 1}
                onClick={() => setSlide((v) => Math.min(SLIDE_PAGES.length - 1, v + 1))}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="cls-slide-stack">
              {SLIDE_PAGES.map((item, index) => (
                <article
                  key={item.id}
                  className="cls-slide-frame cls-slide-frame--rich"
                  onClick={() => {
                    setSlide(index)
                    setFullscreen(true)
                  }}
                >
                  <p className="cls-slide-frame__index">
                    {index + 1} / {SLIDE_PAGES.length}
                  </p>
                  <div className="cls-slide-frame__brand">LMS · IELTS Reading</div>
                  <h2>{item.label}</h2>
                  <p>{item.hint}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "summary" ? (
        <section className="cls-summary" aria-label="Lesson summary">
          <div className="cls-topic-banner">
            <span>TOPIC</span>
            <strong>Nature & Environment</strong>
            <p>Tóm tắt kiến thức trọng tâm buổi học</p>
          </div>
          <div className="cls-section-block">
            <p className="cls-section-block__label">SECTION A</p>
            <h2>Learning Outcomes</h2>
            <ol>
              {LESSON_OUTCOMES.map((item, index) => (
                <li key={item}>
                  <span aria-hidden="true">{index + 1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {tab === "documents" ? (
        <section className="cls-docs" aria-label="Tài liệu bài khoá">
          {COURSE_DOCUMENTS.map((doc) => (
            <div key={doc.id} className="cls-file-row-wrap">
              <button type="button" className="cls-file-row" onClick={() => setPdfDoc(doc)}>
                <span className="cls-file-row__icon" aria-hidden="true">
                  <FileText />
                </span>
                <span className="cls-file-row__copy">
                  <strong>{doc.title}</strong>
                  <small>{doc.meta}</small>
                </span>
                <span className="cls-file-row__open">Xem</span>
              </button>
              <button
                type="button"
                className="cls-file-dl"
                aria-label={`Tải ${doc.title}`}
                onClick={() => push("Đã bắt đầu tải", doc.title)}
              >
                <Download aria-hidden="true" />
              </button>
            </div>
          ))}
        </section>
      ) : null}

      <PdfViewerDialog
        open={Boolean(pdfDoc)}
        title={pdfDoc?.title ?? ""}
        meta={pdfDoc?.meta}
        pages={pdfDoc?.meta?.includes("12") ? 12 : pdfDoc?.meta?.includes("6") ? 6 : 8}
        onClose={() => setPdfDoc(null)}
        onDownload={() => {
          if (pdfDoc) push("Đã bắt đầu tải", pdfDoc.title)
        }}
      />

      <SlideFullscreenDialog
        open={fullscreen}
        pages={SLIDE_PAGES}
        index={slide}
        onIndexChange={setSlide}
        onClose={() => setFullscreen(false)}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </SessionShell>
  )
}
