import { formatNumber } from './format'

export function Pager({ shown, total, page, pageCount, onPage }: {
  shown: number
  total: number
  page: number
  pageCount: number
  onPage: (page: number) => void
}) {
  return (
    <div className="pm-pager">
      <span>Hiển thị {shown} / {formatNumber(total)} · Trang {page} / {formatNumber(pageCount)}</span>
      <span className="pm-pager__buttons">
        <button className="adm-btn adm-btn--small" disabled={page <= 1} onClick={() => onPage(page - 1)} type="button">‹ Trước</button>
        <button className="adm-btn adm-btn--small" disabled={page >= pageCount} onClick={() => onPage(page + 1)} type="button">Sau ›</button>
      </span>
    </div>
  )
}
