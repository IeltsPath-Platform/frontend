import { useMemo, useState } from 'react'
import { useAdminSearch } from '@/features/admin/adminSearch'
import { SALE_STATUS_LABEL, keyMatches } from '../data/selectors'
import { usePointState } from '../data/store'
import type { KeyRecord, KeyStatus } from '../data/types'
import { formatNumber, formatShortDateTime, maskCode } from '../shared/format'
import { KeyDetailDialog } from '../shared/KeyDetailDialog'
import { Pager } from '../shared/Pager'
import { pageSlice, usePage } from '../shared/paging'
import { PeriodFilter } from '../shared/PeriodFilter'
import { ProductPicker } from '../shared/ProductPicker'
import { SaleStatusBadge } from '../shared/StatusBadge'
import { usePeriodScope } from '../shared/usePeriodScope'

type Filter = 'ALL' | 'ISSUED' | 'ACTIVATED' | 'EXPIRED'

const FILTERS: readonly Filter[] = ['ALL', 'ISSUED', 'ACTIVATED', 'EXPIRED']
const PAGE_SIZE = 6

/** The keys a sale has already handed out, one product at a time, to follow up which are activated. */
export function IssuedKeysPage() {
  const { products, currentSaleId } = usePointState()
  const { query } = useAdminSearch()
  const { range, setRange, options, scopedKeys } = usePeriodScope()
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [detail, setDetail] = useState<KeyRecord | null>(null)
  const product = products.find((item) => item.id === productId)

  /** Keys of the chosen product this sale has handed out, the most recent first. */
  const handed = useMemo(
    () => scopedKeys
      .filter((key) => key.saleId === currentSaleId && key.productId === productId && key.issuedAt !== null && key.status !== 'REVOKED')
      .sort((a, b) => (b.issuedAt ?? '').localeCompare(a.issuedAt ?? '')),
    [scopedKeys, currentSaleId, productId],
  )

  const counts = useMemo(() => {
    const byStatus: Record<KeyStatus, number> = { READY: 0, ISSUED: 0, ACTIVATED: 0, REVOKED: 0, EXPIRED: 0 }
    for (const key of handed) byStatus[key.status] += 1
    return byStatus
  }, [handed])

  const rows = useMemo(
    () => handed.filter((key) => (filter === 'ALL' || key.status === filter) && keyMatches(key, query)),
    [handed, filter, query],
  )
  const [pageNumber, setPageNumber] = usePage(`${filter}|${productId}|${query}`)
  const { rows: pageRows, page, pageCount } = pageSlice(rows, pageNumber, PAGE_SIZE)

  const countOf = (value: Filter) => (value === 'ALL' ? handed.length : counts[value])
  const visibleFilters = FILTERS.filter((value) => value === 'ALL' || value === filter || counts[value] > 0)

  return (
    <>
      <section className="adm-titlebar">
        <div>
          <h1>Key đã phát hành</h1>
          <p>Các key bạn đã phát hành, theo từng gói. Theo dõi key nào đã được kích hoạt và key nào còn chờ.</p>
        </div>
      </section>

      <div className="pm-filterrow">
        <ProductPicker onChange={setProductId} products={products} value={productId} />
        <PeriodFilter onChange={setRange} options={options} value={range} />
      </div>

      <section aria-label="Key đã phát hành" className="adm-card">
        <div className="pm-card-head">
          <h2>{product?.name}</h2>
          <span className="pm-note">{formatNumber(handed.length)} key đã phát hành</span>
        </div>
        <div className="pm-chips">
          {visibleFilters.map((value) => (
            <button
              aria-pressed={filter === value}
              className={`pm-chip${filter === value ? ' is-active' : ''}`}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value === 'ALL' ? 'Tất cả' : SALE_STATUS_LABEL[value]} ({formatNumber(countOf(value))})
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="adm-state"><p>Chưa có key nào được phát hành{handed.length > 0 ? ' khớp bộ lọc' : ' cho gói này'}.</p></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table pm-table">
              <thead>
                <tr>
                  <th scope="col">Mã key</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Sản phẩm</th>
                  <th scope="col">Ngày cấp</th>
                  <th scope="col"><span className="adm-sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((key) => (
                  <tr key={key.id}>
                    <td className="pm-code">{maskCode(key.code)}</td>
                    <td><SaleStatusBadge status={key.status} /></td>
                    <td>{product?.name}</td>
                    <td>{formatShortDateTime(key.issuedAt)}</td>
                    <td className="pm-col-action">
                      <button className="adm-btn adm-btn--small" onClick={() => setDetail(key)} type="button">Xem chi tiết</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pager onPage={setPageNumber} page={page} pageCount={pageCount} shown={pageRows.length} total={rows.length} />
      </section>

      <div className="pm-rules">
        <strong>Quy tắc:</strong> mã chỉ hiện đầy đủ trong Chi tiết key (mỗi lần xem ghi Nhật ký) · không thu hồi hay gán lại key. Cần thay đổi thì nhờ Quản lý bán hàng.
      </div>

      <KeyDetailDialog keyRecord={detail} onClose={() => setDetail(null)} />
    </>
  )
}
