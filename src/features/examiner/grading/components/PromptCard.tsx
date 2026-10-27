import { useState } from 'react'
import { Expand } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

interface PromptImage { url: string; altText?: string | null }

interface PromptCardProps {
  prompt: string | null | undefined
  images: ReadonlyArray<PromptImage> | null | undefined
}

const FALLBACK_ALT = 'Biểu đồ của đề bài'

/** One chart with a button that opens it large. It opens in a dialog, not a new tab: most charts are `data:` addresses, which browsers refuse to open as a page. */
function Chart({ image }: { image: PromptImage }) {
  const [zoom, setZoom] = useState(false)
  const alt = image.altText ?? FALLBACK_ALT
  return (
    <>
      <figure className="adm-eg-chart">
        <img alt={alt} src={image.url} />
      </figure>
      <button className="adm-btn adm-btn--small adm-eg-zoom" onClick={() => setZoom(true)} type="button">
        <Expand aria-hidden="true" size={14} /> Phóng to biểu đồ
      </button>
      <Dialog onOpenChange={setZoom} open={zoom}>
        <DialogContent className="adm-eg-zoom-dialog">
          <DialogTitle className="adm-sr-only">{FALLBACK_ALT}</DialogTitle>
          <DialogDescription className="adm-sr-only">{image.altText ?? 'Ảnh biểu đồ phóng to'}</DialogDescription>
          <img alt={alt} src={image.url} />
        </DialogContent>
      </Dialog>
    </>
  )
}

/** The prompt the learner answered, with its chart (Task 1) under it, so the essay is read against what the learner saw. */
export function PromptCard({ prompt, images }: PromptCardProps) {
  const charts = images ?? []
  if (!prompt && charts.length === 0) return null
  return (
    <section aria-label="Đề bài" className="adm-card">
      <h2>Đề bài</h2>
      {prompt ? <p className="adm-eg-text">{prompt}</p> : null}
      {charts.map((image) => <Chart image={image} key={image.url} />)}
    </section>
  )
}
