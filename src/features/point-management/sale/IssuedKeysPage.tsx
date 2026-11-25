import { useState } from 'react'
import { useAdminSearch } from '@/features/admin/adminSearch'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { loadProducts, saleApi } from '../api/pointApi'
import { SALE_STATUS_LABEL } from '../data/selectors'
import type { KeyDto, KeyState, Product } from '../data/types'
import { formatNumber, formatShortDateTime } from '../shared/format'
import { KeyDetailDialog } from '../shared/KeyDetailDialog'
import { Pager } from '../shared/Pager'
import { usePage } from '../shared/paging'
import { ProductPicker } from '../shared/ProductPicker'
import { SaleStatusBadge } from '../shared/StatusBadge'
import { AsyncBlock } from '../shared/AsyncBlock'

type Filter = 'ALL' | 'ISSUED' | 'ACTIVATED' | 'EXPIRED'

const FILTERS: readonly Filter[] = ['ALL', 'ISSUED', 'ACTIVATED', 'EXPIRED']
const PAGE_SIZE = 10

/** The keys a sale has already handed out, one product at a time, to follow up which are activated. */
export function IssuedKeysPage() {
  const { query } = useAdminSearch()
  const products = useAdminResource('point-products', (signal) => loadProducts(signal))
  const [chosen, setChosen] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [detail, setDetail] = useState<KeyDto | null>(null)
  return (
    <AsyncBlock resource={products} label="Đang tải sản phẩm">
      {(list) => (
        <IssuedList
          detail={detail}
          filter={filter}
          onDetail={setDetail}
          onFilter={setFilter}
          onProduct={setChosen}
          product={list.find((item) => item.id === (chosen || list[0]?.id)) ?? null}
          products={list}
          query={query}
          productId={chosen || list[0]?.id || ''}
        />
      )}
    </AsyncBlock>
  )
}

function IssuedList({ products, productId, product, filter, query, detail, onProduct, onFilter, onDetail }: {
  products: readonly Product[]
  productId: string
  product: Product | null
  filter: Filter
  query: string
  detail: KeyDto | null
  onProduct: (id: string) => void
  onFilter: (filter: Filter) => void
  onDetail: (key: KeyDto | null) => void
}) {
  const scope = `${productId}|${filter}|${query}`
  const [pageNumber, setPageNumber] = usePage(scope)
  const state: KeyState | undefined = filter === 'ALL' ? undefined : filter
  const keys = useAdminResource(`point-issued:${scope}:${pageNumber}`, (signal) => saleApi.issued({
    productId, state, q: query.trim() || undefined, page: pageNumber - 1, size: PAGE_SIZE,
  }, signal))

  return (
    <>
      <section className="adm-titlebar">
        <div>
          <h1>Key đã phát hành</h1>
          <p>Các key bạn đã phát hành, theo từng gói. Theo dõi key nào đã được kích hoạt và key nào còn chờ.</p>
        </div>
      </section>

      <div className="pm-filterrow">
        <ProductPicker onChange={onProduct} products={products} value={productId} />
      </div>

      <section aria-label="Key đã phát hành" className="adm-card">
        <div className="pm-card-head">
          <h2>{product?.name}</h2>
          {keys.data ? <span className="pm-note">{formatNumber(keys.data.total)} key</span> : null}
        </div>
        <div className="pm-chips">
          {FILTERS.map((value) => (
            <button
              aria-pressed={filter === value}
              className={`pm-chip${filter === value ? ' is-active' : ''}`}
              key={value}
              onClick={() => onFilter(value)}
              type="button"
            >
              {value === 'ALL' ? 'Tất cả' : SALE_STATUS_LABEL[value]}
            </button>
          ))}
        </div>

        <AsyncBlock resource={keys} label="Đang tải key">
          {(page) => (
            page.items.length === 0 ? (
              <div className="adm-state"><p>Chưa có key nào được phát hành cho gói này.</p></div>
            ) : (
              <>
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
                      {page.items.map((key) => (
                        <tr key={key.id}>
                          <td className="pm-code">{key.maskedCode}</td>
                          <td><SaleStatusBadge status={key.state} /></td>
                          <td>{key.productName}</td>
                          <td>{formatShortDateTime(key.issuedAt)}</td>
                          <td className="pm-col-action">
                            <button className="adm-btn adm-btn--small" onClick={() => onDetail(key)} type="button">Xem chi tiết</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager
                  onPage={setPageNumber}
                  page={pageNumber}
                  pageCount={Math.max(1, Math.ceil(page.total / PAGE_SIZE))}
                  shown={page.items.length}
                  total={page.total}
                />
              </>
            )
          )}
        </AsyncBlock>
      </section>

      <div className="pm-rules">
        <strong>Quy tắc:</strong> mã chỉ hiện đầy đủ trong Chi tiết key (mỗi lần xem ghi nhật ký) · không thu hồi hay gán lại key. Cần thay đổi thì nhờ Quản lý bán hàng.
      </div>

      <KeyDetailDialog
        keyRecord={detail}
        onClose={() => onDetail(null)}
        reveal={async (keyId) => (await saleApi.reveal(keyId)).code}
        saleName={null}
      />
    </>
  )
}
