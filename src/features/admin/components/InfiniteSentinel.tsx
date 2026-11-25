import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AdminLoading } from './AdminState'

export interface InfiniteSentinelProps {
  hasMore: boolean
  loadingMore: boolean
  moreError: string | null
  itemCount: number
  noun: string
  onReachEnd: () => void
  onRetry: () => void
  as?: 'div' | 'li' | 'tr'
  colSpan?: number
  resetKey?: string
}

function findScrollRoot(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement
  while (parent) {
    const style = window.getComputedStyle(parent)
    const verticalOverflow = style.overflowY === 'auto' || style.overflowY === 'scroll'
    if (verticalOverflow && !parent.classList.contains('adm-table-wrap')) return parent
    parent = parent.parentElement
  }
  return null
}

function SentinelContent({ hasMore, loadingMore, moreError, itemCount, noun, onReachEnd, onRetry, observerAvailable }: Omit<InfiniteSentinelProps, 'as' | 'colSpan'> & { observerAvailable: boolean }): ReactNode {
  if (loadingMore) return <AdminLoading label="Đang tải thêm…" />
  if (moreError) return <><span>{moreError}</span><button className="adm-btn" onClick={onRetry} type="button">Thử lại</button></>
  if (hasMore && !observerAvailable) return <button className="adm-btn" onClick={onReachEnd} type="button">Tải thêm</button>
  if (!hasMore && itemCount > 0) return <span>Đã hiện tất cả {itemCount} {noun}.</span>
  return null
}

/** A small observed target at the end of a list, rooted in its nearest scrolling ancestor. */
export function InfiniteSentinel(props: InfiniteSentinelProps) {
  const { hasMore, loadingMore, moreError, itemCount, noun, onReachEnd, onRetry, as = 'div', colSpan = 1, resetKey } = props
  const [element, setElement] = useState<HTMLElement | null>(null)
  const previousResetKey = useRef(resetKey)
  const observerAvailable = typeof IntersectionObserver !== 'undefined'

  useEffect(() => {
    if (!element || !observerAvailable || !hasMore || loadingMore || moreError) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onReachEnd()
    }, { root: findScrollRoot(element), rootMargin: '0px 0px 400px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, hasMore, loadingMore, moreError, observerAvailable, onReachEnd])

  useEffect(() => {
    if (previousResetKey.current === resetKey) return
    previousResetKey.current = resetKey
    if (!element) return
    const root = findScrollRoot(element)
    if (root) root.scrollTop = 0
    else if (window.scrollY !== 0) window.scrollTo({ top: 0 })
  }, [element, resetKey])

  const content = <SentinelContent
    hasMore={hasMore}
    itemCount={itemCount}
    loadingMore={loadingMore}
    moreError={moreError}
    noun={noun}
    observerAvailable={observerAvailable}
    onReachEnd={onReachEnd}
    onRetry={onRetry}
  />

  if (as === 'tr') {
    return <tr className="adm-infinite__sentinel" ref={setElement}>
      <td colSpan={colSpan}><div className="adm-infinite__message" role={loadingMore ? undefined : 'status'}>{content}</div></td>
    </tr>
  }

  if (as === 'li') {
    return <li className="adm-infinite__sentinel" ref={setElement} role={loadingMore ? undefined : 'status'}>{content}</li>
  }

  return <div className="adm-infinite__sentinel" ref={setElement} role={loadingMore ? undefined : 'status'}>{content}</div>
}

export function InfiniteCount({ items, total, noun, as = 'div' }: { items: number; total: number | null; noun: string; as?: 'div' | 'li' }) {
  if (items < 1) return null
  const text = <>Đang hiện {items} / {total ?? '…'} {noun}</>
  return as === 'li'
    ? <li className="adm-infinite__count" role="status">{text}</li>
    : <div className="adm-infinite__count" role="status">{text}</div>
}
