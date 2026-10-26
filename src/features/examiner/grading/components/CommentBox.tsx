import { useLayoutEffect, useRef } from 'react'
import { withPhrase } from '../lib/commentPhrases'

const MAX_HEIGHT = 360

/**
 * A comment box that grows with what is written (up to a limit, then it scrolls), with the sentences examiners often write
 * a click away under it. The box keeps its own label so screen readers and tests reach it by name.
 */
export function CommentBox({ label, value, onChange, phrases, placeholder = 'Viết nhận xét…', minRows = 4 }: {
  label: string
  value: string
  onChange: (value: string) => void
  phrases: readonly string[]
  placeholder?: string
  minRows?: number
}) {
  const box = useRef<HTMLTextAreaElement>(null)

  // Fit the height to the text: reset first, so the box also shrinks when text is deleted.
  useLayoutEffect(() => {
    const element = box.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`
  }, [value])

  return (
    <div className="eg-comment">
      <textarea
        aria-label={label}
        className="adm-textarea eg-comment__box"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={box}
        rows={minRows}
        value={value} />
      <div aria-label={`Gợi ý cho ${label}`} className="eg-comment__phrases" role="group">
        {phrases.map((phrase) => (
          <button className="eg-chip" key={phrase} onClick={() => onChange(withPhrase(value, phrase))} title="Thêm câu này vào nhận xét" type="button">
            + {phrase}
          </button>
        ))}
      </div>
      <p aria-hidden="true" className="eg-comment__count">{value.trim() === '' ? 'Chưa có nhận xét' : `${value.trim().split(/\s+/).length} từ`}</p>
    </div>
  )
}
