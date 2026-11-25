import { lazy, Suspense, useState } from 'react'
import { Download } from 'lucide-react'
import type { LessonSlideItem } from '~types/lesson'
import { StatusArt } from '@/components/StatusArt'

const SlidePdfViewer = lazy(() => import('./SlidePdfViewer'))

export function LessonSlides({ slides, onRefresh }: { slides: readonly LessonSlideItem[]; onRefresh: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (slides.length === 0) return <StatusArt compact kind="empty" title="Bài học này chưa có slide." />

  const active = slides[activeIndex] ?? slides[0]!

  return (
    <div className="lp-res-slides">
      <div className="lp-res-toolbar">
        {slides.length > 1 ? (
          <div className="lp-res-tabs" role="tablist" aria-label="Chọn slide">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`Slide ${index + 1}: ${slide.title}`}
                className={`lp-res-tab${index === activeIndex ? ' is-active' : ''}`}
                onClick={() => setActiveIndex(index)}
              >
                {slide.title}
              </button>
            ))}
          </div>
        ) : <span className="lp-res-toolbar__title">{active.title}</span>}
        <div className="lp-res-actions">
          <a aria-label={`Tải về ${active.title}`} className="lp-res-action" href={active.url} target="_blank" rel="noopener noreferrer">
            <Download aria-hidden="true" size={15} />
            Tải về
          </a>
        </div>
      </div>
      <Suspense fallback={<div className="lp-res-pdf-state" role="status">Đang tải trình xem PDF…</div>}>
        <SlidePdfViewer key={`${active.id}:${active.url}`} url={active.url} title={active.title} onRefresh={onRefresh} />
      </Suspense>
    </div>
  )
}
