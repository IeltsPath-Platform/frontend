import { Fragment, useRef } from 'react'
import { segmentsOf, selectionRange, type Range } from '../lib/annotations'
import type { Annotation } from '../types'

/**
 * The learner's essay with the marked errors highlighted and numbered as in the list below it. Selecting text (mouse, or
 * keyboard with Shift and the arrow keys) reports where in the essay the selection lies, ready to be marked as an error.
 */
export function AnnotatedEssay({ essay, annotations, onSelect }: {
  essay: string
  annotations: readonly Annotation[]
  onSelect: (range: Range | null) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const report = () => { if (box.current) onSelect(selectionRange(box.current, window.getSelection())) }
  return (
    <div aria-label="Bài viết của học viên" className="adm-eg-essay" onKeyUp={report} onMouseUp={report} ref={box} role="region" tabIndex={0}>
      {segmentsOf(essay, annotations).map((segment) => segment.marked === null
        ? <span data-start={segment.start} key={segment.start}>{segment.text}</span>
        : (
          <Fragment key={segment.start}>
            <mark className="adm-eg-mark" data-start={segment.start} title={annotations[segment.marked].suggestion}>{segment.text}</mark>
            <sup aria-hidden="true" className="adm-eg-mark__n">{segment.marked + 1}</sup>
          </Fragment>
        ))}
    </div>
  )
}
