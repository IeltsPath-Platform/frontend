import { useId } from 'react'
import type { Passage } from '~types/learningPath'

export function PassageBlock({ passage }: { passage: Passage }) {
  const titleId = useId()
  return (
    <article className="lp-passage" aria-labelledby={titleId}>
      <p className="lp-eyebrow">Bài đọc</p>
      <h3 id={titleId}>{passage.title}</h3>
      {passage.paragraphs.map((paragraph, index) => (
        <p className="lp-passage__para" key={`${paragraph.label ?? 'p'}-${index}`}>
          {paragraph.label ? <span className="lp-passage__label" aria-label={`Đoạn ${paragraph.label}`}>{paragraph.label}</span> : null}
          <span>{paragraph.text}</span>
        </p>
      ))}
    </article>
  )
}
