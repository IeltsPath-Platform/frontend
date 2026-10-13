import { Download, Maximize2, MonitorPlay } from 'lucide-react'
import { useRef, useState } from 'react'
import type { LessonSlideItem } from '~types/lesson'

interface GoogleSlidesLinks {
  embedUrl: string
  downloadUrl: string
}

/**
 * Accepts a shared deck link (/presentation/d/{id}/edit) or a "Publish to web" link (/presentation/d/e/{id}/pub).
 * Only a shared deck can be exported as PDF; a published one downloads from its original link.
 */
function getGoogleSlidesLinks(url: string): GoogleSlidesLinks | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.hostname !== 'docs.google.com') return null

  const published = parsed.pathname.match(/^\/presentation\/d\/e\/([\w-]+)/)
  if (published) {
    return {
      embedUrl: `https://docs.google.com/presentation/d/e/${published[1]}/embed?start=false&loop=false`,
      downloadUrl: url,
    }
  }
  const shared = parsed.pathname.match(/^\/presentation\/d\/([\w-]+)/)
  if (shared) {
    return {
      embedUrl: `https://docs.google.com/presentation/d/${shared[1]}/embed?start=false&loop=false`,
      downloadUrl: `https://docs.google.com/presentation/d/${shared[1]}/export/pdf`,
    }
  }
  return null
}

export function LessonSlides({ slides }: { slides: readonly LessonSlideItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)

  if (slides.length === 0) return <p className="lp-res-empty">Bài học này chưa có slide.</p>

  const active = slides[activeIndex] ?? slides[0]!
  const google = getGoogleSlidesLinks(active.url)

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
                className={`lp-res-tab${index === activeIndex ? ' is-active' : ''}`}
                onClick={() => setActiveIndex(index)}
              >
                {slide.title}
              </button>
            ))}
          </div>
        ) : <span className="lp-res-toolbar__title">{active.title}</span>}
        <div className="lp-res-actions">
          <a className="lp-res-action" href={google?.downloadUrl ?? active.url} target="_blank" rel="noopener noreferrer">
            <Download aria-hidden="true" size={15} />
            Tải về
          </a>
          {google ? (
            <button
              type="button"
              className="lp-res-action"
              onClick={() => { frameRef.current?.requestFullscreen().catch(() => undefined) }}
            >
              <Maximize2 aria-hidden="true" size={15} />
              Mở rộng
            </button>
          ) : null}
        </div>
      </div>

      <div className="lp-res-frame" ref={frameRef}>
        {google ? (
          <iframe
            key={active.id}
            className="lp-res-iframe"
            src={google.embedUrl}
            title={active.title}
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
          />
        ) : (
          <div className="lp-res-fallback">
            <MonitorPlay aria-hidden="true" size={36} />
            <p>Slide này không nhúng trực tiếp được.</p>
            <a className="lp-res-action" href={active.url} target="_blank" rel="noopener noreferrer">Mở trong tab mới</a>
          </div>
        )}
      </div>
    </div>
  )
}
