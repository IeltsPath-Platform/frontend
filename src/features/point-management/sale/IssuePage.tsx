import { useMemo, useState } from 'react'
import { SALE_CHART_SERIES, saleBatchRows } from '../data/selectors'
import { issueNextKey, usePointState } from '../data/store'
import type { KeyRecord, Product } from '../data/types'
import { PeriodFilter } from '../shared/PeriodFilter'
import { StackedBarChart } from '../shared/StackedBarChart'
import { usePeriodScope } from '../shared/usePeriodScope'
import { IssuedKeyDialog } from './IssuedKeyDialog'
import { IssuePacks } from './IssuePacks'

/** Where a sale hands keys to students: pick a pack and the key appears, ready to copy. */
export function IssuePage() {
  const { keys, products, currentSaleId } = usePointState()
  const { range, setRange, options, scoped, scopedKeys } = usePeriodScope()
  const [issued, setIssued] = useState<KeyRecord | null>(null)

  /** What the sale can still hand out, per product. It is never narrowed by the time filter below. */
  const stock = useMemo(() => {
    const left = new Map<string, number>()
    for (const key of keys) {
      if (key.saleId === currentSaleId && key.status === 'READY') left.set(key.productId, (left.get(key.productId) ?? 0) + 1)
    }
    return left
  }, [keys, currentSaleId])

  const chartRows = useMemo(() => saleBatchRows(scopedKeys, scoped, products, currentSaleId), [scopedKeys, scoped, products, currentSaleId])

  /** One click issues the next key of the pack: no form, the code is shown straight away. */
  function issue(product: Product) {
    const key = issueNextKey(currentSaleId, product.id)
    if (key) setIssued(key)
  }

  return (
    <>
      <section className="adm-titlebar">
        <div>
          <h1>Phát hành key</h1>
          <p>Chỉ hiển thị key quản lý đã phân bổ cho bạn. Chọn gói để lấy một key, rồi sao chép gửi cho học viên.</p>
        </div>
      </section>

      <IssuePacks onIssue={issue} products={products} stock={stock} />

      <PeriodFilter onChange={setRange} options={options} value={range} />

      <section className="adm-card">
        <StackedBarChart rows={chartRows} series={SALE_CHART_SERIES} title="Key của tôi theo từng đợt" />
      </section>

      <div className="pm-rules">
        <strong>Quy tắc:</strong> sale chỉ thấy key của mình · mã chỉ hiện đầy đủ ở bước phát hành và trong Chi tiết key (mỗi lần xem ghi Nhật ký) ·
        không tạo, thu hồi hay gán lại key. Cần thay đổi thì nhờ Quản lý bán hàng.
      </div>

      <IssuedKeyDialog keyRecord={issued} onClose={() => setIssued(null)} />
    </>
  )
}
