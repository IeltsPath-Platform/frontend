import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const MIN_SCALE = 0.6
const MAX_SCALE = 2
const SCALE_STEP = 0.2
const PDF_OPTIONS = { disableRange: true, disableStream: true }

export default function SlidePdfViewer({ url, title, onRefresh }: {
  url: string
  title: string
  onRefresh: () => void
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const pageAreaRef = useRef<HTMLDivElement>(null)
  const [pageWidth, setPageWidth] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = pageAreaRef.current
    if (!element) return
    const measure = () => setPageWidth(Math.max(0, element.clientWidth - 32))
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setPageNumber((page) => Math.max(1, page - 1))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      setPageNumber((page) => Math.min(numPages, page + 1))
    }
  }

  if (failed) {
    return (
      <div className="lp-res-pdf-frame lp-res-pdf-state" role="alert">
        <p>Không tải được tệp PDF.</p>
        <button className="lp-res-action" type="button" onClick={onRefresh}>Tải lại</button>
      </div>
    )
  }

  return (
    <div className="lp-res-pdf-viewer">
      <div className="lp-res-pdf-toolbar" aria-label="Điều khiển PDF">
        <div className="lp-res-pdf-pages">
          <button
            aria-label="Trang trước"
            className="lp-res-pdf-control"
            type="button"
            disabled={pageNumber <= 1 || loading}
            onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
          ><ChevronLeft aria-hidden="true" size={17} /></button>
          <label className="lp-res-pdf-page-count">
            <span className="lp-sr-only">Trang hiện tại</span>
            <input
              aria-label="Trang hiện tại"
              className="lp-res-pdf-page-input"
              type="number"
              min={1}
              max={numPages || 1}
              value={pageNumber}
              disabled={loading}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (Number.isInteger(next) && next >= 1 && next <= numPages) setPageNumber(next)
              }}
            />
            <span>/ {numPages || '—'}</span>
          </label>
          <button
            aria-label="Trang sau"
            className="lp-res-pdf-control"
            type="button"
            disabled={pageNumber >= numPages || loading}
            onClick={() => setPageNumber((page) => Math.min(numPages, page + 1))}
          ><ChevronRight aria-hidden="true" size={17} /></button>
        </div>
        <div className="lp-res-pdf-pages">
          <button
            aria-label="Thu nhỏ"
            className="lp-res-pdf-control"
            type="button"
            disabled={scale <= MIN_SCALE}
            onClick={() => setScale((value) => Math.max(MIN_SCALE, Math.round((value - SCALE_STEP) * 10) / 10))}
          ><ZoomOut aria-hidden="true" size={17} /></button>
          <span aria-live="polite" className="lp-res-pdf-zoom">{Math.round(scale * 100)}%</span>
          <button
            aria-label="Phóng to"
            className="lp-res-pdf-control"
            type="button"
            disabled={scale >= MAX_SCALE}
            onClick={() => setScale((value) => Math.min(MAX_SCALE, Math.round((value + SCALE_STEP) * 10) / 10))}
          ><ZoomIn aria-hidden="true" size={17} /></button>
          <button
            aria-label="Mở rộng"
            className="lp-res-pdf-control"
            type="button"
            onClick={() => { void frameRef.current?.requestFullscreen?.().catch(() => undefined) }}
          ><Maximize2 aria-hidden="true" size={17} /></button>
        </div>
      </div>
      <div
        aria-label={`Trình xem ${title}`}
        className="lp-res-pdf-frame"
        ref={frameRef}
        role="group"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="lp-res-pdf-page-area" ref={pageAreaRef}>
          <Document
            file={url}
            loading={<div className="lp-res-pdf-state" role="status">Đang tải PDF…</div>}
            options={PDF_OPTIONS}
            onLoadSuccess={({ numPages: count }) => {
              setNumPages(count)
              setPageNumber(1)
              setLoading(false)
              setFailed(false)
            }}
            onLoadError={() => { setLoading(false); setFailed(true) }}
            onSourceError={() => { setLoading(false); setFailed(true) }}
          >
            <Page
              aria-label={`Trang ${pageNumber} trên ${numPages}`}
              pageNumber={pageNumber}
              width={pageWidth ? pageWidth * scale : undefined}
            />
          </Document>
        </div>
        {loading ? <div className="lp-sr-only" role="status">Đang tải PDF…</div> : null}
      </div>
    </div>
  )
}
