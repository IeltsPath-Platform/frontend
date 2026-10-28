import { Link } from 'react-router-dom'
import { MANAGER_CHART_SERIES, type BatchCounts } from '../data/selectors'
import type { Batch, Product } from '../data/types'
import { formatDate, formatNumber } from '../shared/format'
import { MANAGER_BASE } from '../shared/point-menu'

const EMPTY_COUNTS: BatchCounts = {
  quantity: 0, given: 0, activated: 0, pool: 0, byStatus: { READY: 0, GIVEN: 0, ACTIVATED: 0, REVOKED: 0, EXPIRED: 0 },
}

/** One batch as a bar: the same three stages and colours as the chart. Revoked and expired keys are not stock, so they are left out. */
function BatchBar({ counts }: { counts: BatchCounts }) {
  const values = [counts.byStatus.READY, counts.byStatus.GIVEN, counts.byStatus.ACTIVATED]
  const summary = MANAGER_CHART_SERIES.map((name, index) => `${name} ${formatNumber(values[index])}`).join(', ')
  return (
    <div aria-label={summary} className="pm-minibar" role="img">
      {values.map((value, index) => value > 0 ? (
        <span
          className={`pm-minibar__seg pm-minibar__seg--${index + 1}`}
          key={MANAGER_CHART_SERIES[index]}
          style={{ flex: `${value} 1 0` }}
          title={`${MANAGER_CHART_SERIES[index]}: ${formatNumber(value)} key`}
        />
      ) : null)}
    </div>
  )
}

/**
 * Batches with their size and expiry. The overview adds a column for the product and a bar showing how far each
 * batch's keys have travelled; the batch list is already split by product and leaves both out.
 */
export function BatchTable({ batches, counts, products, showProduct = true, showProgress = true }: {
  batches: readonly Batch[]
  counts: ReadonlyMap<string, BatchCounts>
  products: readonly Product[]
  showProduct?: boolean
  showProgress?: boolean
}) {
  return (
    <>
      {showProgress ? (
        <ul aria-label="Chú giải" className="pm-chart__legend pm-chart__legend--table">
          {MANAGER_CHART_SERIES.map((name, index) => (
            <li key={name}><i className={`pm-chart__key pm-chart__seg--${index + 1}`} />{name}</li>
          ))}
        </ul>
      ) : null}
      <div className="adm-table-wrap">
        <table className="adm-table pm-table">
          <thead>
            <tr>
              <th scope="col">Mã đợt</th>
              {showProduct ? <th scope="col">Sản phẩm</th> : null}
              <th scope="col">Số key</th>
              {showProgress ? <th scope="col">Tiến độ</th> : null}
              <th scope="col">Hạn dùng</th>
              <th scope="col"><span className="adm-sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => {
              const batchCounts = counts.get(batch.code) ?? EMPTY_COUNTS
              return (
                <tr key={batch.code}>
                  <td className="pm-strong">{batch.code}</td>
                  {showProduct ? <td>{products.find((product) => product.id === batch.productId)?.name ?? batch.productId}</td> : null}
                  <td>{formatNumber(batchCounts.quantity)}</td>
                  {showProgress ? <td className="pm-col-bar"><BatchBar counts={batchCounts} /></td> : null}
                  <td>{formatDate(batch.expiresAt)}</td>
                  <td className="pm-col-action">
                    <Link className="adm-btn adm-btn--small" to={`${MANAGER_BASE}/batches/${batch.code}`}>Xem đợt</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
