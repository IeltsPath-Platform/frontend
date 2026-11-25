import { useMemo, useRef, useState } from 'react'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { HttpError } from '@/lib/httpClient'
import { loadProducts, saleApi } from '../api/pointApi'
import { KIND_LABEL, SALE_CHART_SERIES } from '../data/selectors'
import type { ChartRow, CountsDto, IssuedKeyDto, Product } from '../data/types'
import { StackedBarChart } from '../shared/StackedBarChart'
import { AsyncBlock } from '../shared/AsyncBlock'
import { IssuedKeyDialog, type IssuedCode } from './IssuedKeyDialog'
import { IssuePacks } from './IssuePacks'

/** Rows of the sale's chart: one column per batch that holds any of the sale's keys, grouped by product kind. */
function saleRows(byBatch: readonly CountsDto[], products: readonly Product[]): ChartRow[] {
  const kindOf = new Map(products.map((product) => [product.name, product.kind]))
  return byBatch
    .filter((row) => row.byState.READY + row.byState.ISSUED + row.byState.ACTIVATED > 0)
    .map((row) => {
      const kind = kindOf.get(row.label)
      return {
        id: row.key,
        label: row.key,
        caption: row.label,
        group: kind ? KIND_LABEL[kind] : '',
        values: [row.byState.READY, row.byState.ISSUED, row.byState.ACTIVATED],
      }
    })
}

/** Where a sale hands keys to students: pick a pack and the key appears, ready to copy. */
export function IssuePage() {
  const products = useAdminResource('point-products', (signal) => loadProducts(signal))
  const stock = useAdminResource('point-sale-stock', (signal) => saleApi.stock(signal))
  const [issued, setIssued] = useState<IssuedCode | null>(null)
  const [error, setError] = useState('')
  /** One request at a time: a second press while the first is in flight is ignored, even before the screen re-renders. */
  const inFlight = useRef(false)
  /** The key of a press whose answer never arrived. Trying again reuses it, so the server gives back the same key, not a second one. */
  const unanswered = useRef<{ productId: string; key: string } | null>(null)

  /** What the sale can still hand out, per product: the keys it holds that no student has been given yet. */
  const left = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of stock.data?.byProduct ?? []) map.set(row.key, row.byState.READY)
    return map
  }, [stock.data])

  /** One click issues the next key of the pack: no form, the code is shown straight away. */
  async function issue(product: Product) {
    if (inFlight.current) return
    inFlight.current = true
    setError('')
    const key = unanswered.current?.productId === product.id ? unanswered.current.key : crypto.randomUUID()
    unanswered.current = { productId: product.id, key }
    try {
      const result: IssuedKeyDto = await saleApi.issue(product.id, key)
      unanswered.current = null
      setIssued({ code: result.code, productName: product.name })
      stock.refresh()
    } catch (cause) {
      // Only a lost connection leaves the answer unknown; a refusal from the server is final, so the next press is a new key.
      const unknown = !(cause instanceof HttpError) || cause.isNetworkError
      if (!unknown) unanswered.current = null
      setError(cause instanceof Error ? cause.message : 'Chưa phát hành được key. Vui lòng thử lại.')
    } finally {
      inFlight.current = false
    }
  }

  return (
    <>
      <section className="adm-titlebar">
        <div>
          <h1>Phát hành key</h1>
          <p>Chỉ hiển thị key quản lý đã phân bổ cho bạn. Chọn gói để lấy một key, rồi sao chép gửi cho học viên.</p>
        </div>
      </section>

      {error ? <p className="adm-field__error" role="alert">{error}</p> : null}

      <AsyncBlock resource={products} label="Đang tải sản phẩm">
        {(list) => (
          <>
            <AsyncBlock resource={stock} label="Đang tải kho của bạn">
              {() => (
                <IssuePacks onIssue={(product) => void issue(product)} products={list} stock={left} />
              )}
            </AsyncBlock>

            <section className="adm-card">
              <AsyncBlock resource={stock} label="Đang tải kho của bạn">
                {(data) => (
                  <StackedBarChart rows={saleRows(data.byBatch, list)} series={SALE_CHART_SERIES} title="Key của tôi theo từng đợt" />
                )}
              </AsyncBlock>
            </section>
          </>
        )}
      </AsyncBlock>

      <div className="pm-rules">
        <strong>Quy tắc:</strong> bạn chỉ thấy key của mình · mã chỉ hiện đầy đủ ở bước phát hành và trong Chi tiết key (mỗi lần xem ghi nhật ký) ·
        không tạo, thu hồi hay gán lại key. Cần thay đổi thì nhờ Quản lý bán hàng.
      </div>

      <IssuedKeyDialog issued={issued} onClose={() => setIssued(null)} />
    </>
  )
}
