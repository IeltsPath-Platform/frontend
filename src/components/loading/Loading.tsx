import './loading.css'

export type LoadingVariant = 'block' | 'article' | 'chart' | 'list'

/** The small ring for a button or a line of text that is working. It draws no label: the text beside it says it. */
export function Spinner({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`ld-spin ${className}`.trim()} />
}

function Bar({ kind = '' }: { kind?: string }) {
  return <span aria-hidden="true" className={`ld__bar ld__line ${kind}`.trim()} />
}

/**
 * The loading look of the whole app. `block` is a few lines, for a part of a page or a panel; `article`, `chart` and
 * `list` are whole pages in the shape they will have, so nothing jumps when the data arrives. The label is read aloud
 * and not drawn. For waiting on an AI grade use {@link AiWaitPanel} instead.
 */
export function Loading({ label = 'Đang tải…', variant = 'block' }: { label?: string; variant?: LoadingVariant }) {
  return (
    <div aria-busy="true" aria-live="polite" className="ld" role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="ld">
        {variant === 'block' ? (
          <>
            <Bar kind="ld__line--title" />
            <Bar />
            <Bar kind="ld__line--wide" />
          </>
        ) : variant === 'list' ? (
          <div className="ld__rows">
            {[1, 2, 3, 4, 5].map((key) => (
              <div className="ld__row" key={key}>
                <span className="ld__bar ld__row-icon" />
                <div className="ld__row-body">
                  <Bar kind="ld__line--title" />
                  <Bar kind="ld__line--short" />
                </div>
                <span className="ld__bar ld__row-tail" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="ld__card">
              <Bar kind="ld__line--short" />
              <Bar kind="ld__line--title" />
              <Bar kind="ld__line--wide" />
            </div>
            {variant === 'chart' ? (
              <>
                <span className="ld__bar ld__figure" />
                <div className="ld__card">
                  <Bar kind="ld__line--title" />
                  <Bar />
                  <Bar kind="ld__line--meter" />
                </div>
              </>
            ) : (
              <div className="ld__split">
                <div className="ld__card ld__card--tall">
                  <Bar kind="ld__line--title" />
                  <Bar />
                  <Bar />
                  <Bar kind="ld__line--wide" />
                  <Bar />
                  <Bar kind="ld__line--wide" />
                </div>
                <div className="ld__card">
                  <Bar kind="ld__line--short" />
                  <Bar />
                  <Bar />
                  <Bar kind="ld__line--meter" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
