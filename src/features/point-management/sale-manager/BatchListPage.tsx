import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { loadProducts, managerApi } from '../api/pointApi'
import { formatNumber } from '../shared/format'
import { Pager } from '../shared/Pager'
import { usePage } from '../shared/paging'
import { MANAGER_BASE } from '../shared/point-menu'
import { ProductPicker } from '../shared/ProductPicker'
import { AsyncBlock } from '../shared/AsyncBlock'
import { BatchTable } from './BatchTable'

const PAGE_SIZE = 20

/** Batches of one product at a time: each AI Points pack and each Premium pack is picked from a dropdown. */
export function BatchListPage() {
  const products = useAdminResource('point-products', (signal) => loadProducts(signal))
  const [productId, setProductId] = useState('')
  const chosen = productId || products.data?.[0]?.id || ''
  const product = products.data?.find((item) => item.id === chosen)
  const [pageNumber, setPageNumber] = usePage(chosen)
  const batches = useAdminResource(`point-batch-list:${chosen}:${pageNumber}`, (signal) => managerApi.listBatches(
    { productId: chosen, page: pageNumber - 1, size: PAGE_SIZE }, signal))

  return (
    <>
      <section className="adm-titlebar">
        <div>
          <h1>Đợt key</h1>
          <p>Mỗi đợt gồm các key cùng một sản phẩm và cùng hạn dùng, tạo trong một lần.</p>
        </div>
        <div className="adm-titlebar__actions">
          <Link className="adm-btn adm-btn--primary" to={`${MANAGER_BASE}/batches/new`}>+ Tạo đợt key mới</Link>
        </div>
      </section>

      <AsyncBlock resource={products} label="Đang tải sản phẩm">
        {(list) => (
          list.length === 0 ? (
            <div className="adm-state"><p>Chưa có sản phẩm key nào.</p></div>
          ) : (
            <>
              <ProductPicker onChange={(value) => { setProductId(value); setPageNumber(1) }} products={list} value={chosen} />
              <section aria-label={product?.name ?? 'Danh sách đợt key'} className="adm-card">
                <div className="pm-card-head">
                  <h2>{product?.name}</h2>
                  {batches.data ? <span className="pm-note">{formatNumber(batches.data.total)} đợt</span> : null}
                </div>
                <AsyncBlock resource={batches} label="Đang tải đợt key">
                  {(page) => (
                    page.items.length === 0 ? (
                      <div className="adm-state"><p>Chưa có đợt nào cho sản phẩm này.</p></div>
                    ) : (
                      <>
                        <BatchTable batches={page.items} showProduct={false} showProgress={false} />
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
            </>
          )
        )}
      </AsyncBlock>
    </>
  )
}
