import { useState } from 'react'
import { Expand } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { boldRuns, parseGuide } from '@/features/practice/writing/writingText'
import type { PracticeEssay } from '~types/learningPath'

export function PracticeEssayMaterial({ essay, title }: { essay: PracticeEssay; title: string }) {
  const [showGuide, setShowGuide] = useState(false)
  const [zoom, setZoom] = useState<number | null>(null)
  const [failedImages, setFailedImages] = useState<Set<number>>(() => new Set())
  const blocks = parseGuide(essay.guide ?? null)
  const images = essay.images ?? []
  const zoomed = zoom === null ? null : images[zoom]
  const promptIncludesFigures = (essay.prompt.match(/\b\d[\d,]*(?:\.\d+)?\b/g) ?? []).length >= 3

  function renderFallback(index: number) {
    const altText = images[index]?.altText ?? 'Biểu đồ của đề bài'
    return (
      <div className="lp-essay-chart__fallback" role="status">
        <span>{altText}</span>
        <span>{promptIncludesFigures ? 'Không tải được biểu đồ. Số liệu có trong đề bài.' : 'Không tải được biểu đồ.'}</span>
      </div>
    )
  }

  function renderFigure(index: number, compact = false) {
    const image = images[index]
    if (!image) return null
    const altText = image.altText ?? 'Biểu đồ của đề bài'
    return (
      <figure className={`lp-essay-chart${compact ? ' lp-essay-chart--guide-rail' : ''}`} key={`${image.mediaUrl}-${index}`}>
        {failedImages.has(index) ? renderFallback(index) : (
          <img src={image.mediaUrl} alt={altText} onError={() => setFailedImages((current) => new Set(current).add(index))} />
        )}
        <figcaption>
          <button className="lp-essay-chart__zoom" onClick={() => setZoom(index)} type="button">
            <Expand aria-hidden="true" size={14} /> Phóng to biểu đồ
          </button>
        </figcaption>
      </figure>
    )
  }

  return (
    <section className={`lp-ws-card lp-essay-ws__prompt lp-essay-material${showGuide ? ' lp-essay-material--guide' : ''}`} aria-label="Đề bài">
      <header className="lp-ws-card__head lp-essay-material__head">
        <strong>{title}</strong>
        {blocks.length > 0 ? (
          <div className="lp-segment" role="group" aria-label="Nội dung đề viết">
            <button aria-pressed={!showGuide} onClick={() => setShowGuide(false)} type="button">Đề bài</button>
            <button aria-pressed={showGuide} onClick={() => setShowGuide(true)} type="button">Hướng dẫn</button>
          </div>
        ) : null}
      </header>
      {showGuide && images.length > 0 ? (
        <div className="lp-essay-chart-rail" aria-label="Biểu đồ của đề bài">
          {images.map((_, index) => renderFigure(index, true))}
        </div>
      ) : null}
      <div className={`lp-ws-card__scroll${showGuide ? ' lp-essay-material__guide-scroll' : ''}`} key={showGuide ? 'guide' : 'prompt'}>
        {showGuide ? (
          <article className="lp-essay-guide" aria-label="Hướng dẫn viết bài">
            <h2>HƯỚNG DẪN VIẾT BÀI</h2>
            {blocks.map((block, index) => {
              const text = boldRuns(block.text).map((run, runIndex) => run.bold
                ? <strong key={runIndex}>{run.text}</strong> : <span key={runIndex}>{run.text}</span>)
              if (block.kind === 'heading') return <h3 key={index}>{text}</h3>
              return <p className={block.kind === 'bullet' ? 'lp-essay-guide__bullet' : undefined} key={index}>{text}</p>
            })}
          </article>
        ) : (
          <>
            <p className="lp-essay__prompt">{essay.prompt}</p>
            {images.map((_, index) => renderFigure(index))}
            <ul className="lp-essay__facts" aria-label="Yêu cầu của đề">
              {essay.minWords !== null ? <li>Tối thiểu {essay.minWords} từ</li> : null}
              {essay.passBand !== null ? <li>Đạt từ band {essay.passBand.toFixed(1)}</li> : null}
            </ul>
          </>
        )}
      </div>
      <Dialog open={zoomed != null} onOpenChange={(open) => { if (!open) setZoom(null) }}>
        <DialogContent className="lp-essay-chart-dialog">
          <DialogTitle>Biểu đồ của đề bài</DialogTitle>
          <DialogDescription>{zoomed?.altText ?? 'Biểu đồ phóng to để đọc số liệu của đề bài.'}</DialogDescription>
          {zoomed ? (failedImages.has(zoom!) ? renderFallback(zoom!) : (
            <img src={zoomed.mediaUrl} alt={zoomed.altText ?? 'Biểu đồ của đề bài'} onError={() => setFailedImages((current) => new Set(current).add(zoom!))} />
          )) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
