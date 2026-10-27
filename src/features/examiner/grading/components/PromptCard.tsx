interface PromptCardProps {
  prompt: string | null | undefined
  images: ReadonlyArray<{ url: string; altText?: string | null }> | null | undefined
}

/** The prompt the learner answered, with its chart (Task 1). A chart opens full size in a new tab to read its small print. */
export function PromptCard({ prompt, images }: PromptCardProps) {
  const charts = images ?? []
  if (!prompt && charts.length === 0) return null
  return (
    <section aria-label="Đề bài" className="adm-card">
      <h2>Đề bài</h2>
      {prompt ? <p className="adm-eg-text">{prompt}</p> : null}
      {charts.map((image) => (
        <figure className="adm-eg-chart" key={image.url}>
          <a href={image.url} rel="noreferrer" target="_blank" title="Mở ảnh cỡ đầy đủ">
            <img alt={image.altText ?? 'Biểu đồ của đề bài'} src={image.url} />
          </a>
        </figure>
      ))}
    </section>
  )
}
