import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminSearch } from '@/features/admin/adminSearch'
import { batchCountsByCode, newestFirst } from '../data/selectors'
import { usePointState } from '../data/store'
import { formatNumber } from '../shared/format'
import { MANAGER_BASE } from '../shared/point-menu'
import { ProductPicker } from '../shared/ProductPicker'
import { BatchTable } from './BatchTable'

/** Batches of one product at a time: each AI Points pack and each Premium pack is picked from a dropdown. */
export function BatchListPage() {
  const { batches, keys, products } = usePointState()
  const { query } = useAdminSearch()
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const product = products.find((item) => item.id === productId)
  const counts = useMemo(() => batchCountsByCode(keys), [keys])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return newestFirst(batches).filter((batch) => batch.productId === productId && (!needle || batch.code.toLowerCase().includes(needle)))
  }, [batches, productId, query])
  const totalKeys = rows.reduce((total, batch) => total + (counts.get(batch.code)?.quantity ?? 0), 0)

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

      <ProductPicker onChange={setProductId} products={products} value={productId} />

      <section aria-label={product?.name ?? 'Danh sách đợt key'} className="adm-card">
        <div className="pm-card-head">
          <h2>{product?.name}</h2>
          <span className="pm-note">{rows.length} đợt · {formatNumber(totalKeys)} key</span>
        </div>
        {rows.length === 0 ? (
          <div className="adm-state"><p>Chưa có đợt nào cho sản phẩm này.</p></div>
        ) : (
          <BatchTable batches={rows} counts={counts} products={products} showProduct={false} showProgress={false} />
        )}
      </section>
    </>
  )
}
