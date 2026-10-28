import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MANAGER_CHART_SERIES, batchCountsByCode, managerBatchRows, newestFirst, saleCounts } from '../data/selectors'
import { usePointState } from '../data/store'
import { formatNumber } from '../shared/format'
import { PeriodFilter } from '../shared/PeriodFilter'
import { MANAGER_BASE } from '../shared/point-menu'
import { StackedBarChart } from '../shared/StackedBarChart'
import { usePeriodScope } from '../shared/usePeriodScope'
import { BatchTable } from './BatchTable'

const RECENT_BATCHES = 4

export function OverviewPage() {
  const { products, sales } = usePointState()
  // The time filter decides which batches the whole page talks about, so every figure below agrees.
  const { range, setRange, options, scoped, scopedKeys } = usePeriodScope()

  const chartRows = useMemo(() => managerBatchRows(scopedKeys, scoped, products), [scopedKeys, scoped, products])
  const byBatch = useMemo(() => batchCountsByCode(scopedKeys), [scopedKeys])
  const recent = useMemo(() => newestFirst(scoped).slice(0, RECENT_BATCHES), [scoped])
  const saleRows = useMemo(() => sales.map((sale) => ({ sale, ...saleCounts(scopedKeys, sale.id) })), [scopedKeys, sales])

  return (
    <>
      <section className="adm-titlebar">
        <div>
          <h1>Tổng quan kho key</h1>
          <p>Theo dõi key đã tạo, đã cấp và đã kích hoạt. Màn này chỉ dành cho Quản lý bán hàng.</p>
        </div>
        <div className="adm-titlebar__actions">
          <Link className="adm-btn adm-btn--primary" to={`${MANAGER_BASE}/batches/new`}>+ Tạo đợt key mới</Link>
        </div>
      </section>

      <PeriodFilter onChange={setRange} options={options} value={range} />

      <section className="adm-card">
        <StackedBarChart rows={chartRows} series={MANAGER_CHART_SERIES} title="Key theo từng đợt" />
      </section>

      <div className="pm-split">
        <section aria-label="Đợt key" className="adm-card">
          <div className="pm-card-head">
            <h2>Đợt key</h2>
            <Link className="pm-link" to={`${MANAGER_BASE}/batches`}>Xem tất cả đợt →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="adm-state"><p>Không có đợt nào trong khoảng thời gian này.</p></div>
          ) : (
            <BatchTable batches={recent} counts={byBatch} products={products} />
          )}
        </section>

        <section aria-label="Theo nhân viên sale" className="adm-card">
          <div className="pm-card-head"><h2>Theo nhân viên sale</h2></div>
          <ul className="pm-sales">
            {saleRows.map((row) => {
              const percent = row.assigned > 0 ? Math.round((row.issued / row.assigned) * 100) : 0
              return (
                <li className="pm-sale" key={row.sale.id}>
                  <strong>{row.sale.name}</strong>
                  <small>Được giao {formatNumber(row.assigned)} · Đã cấp {formatNumber(row.issued)} · Kích hoạt {formatNumber(row.activated)}</small>
                  <div aria-label={`Đã cấp ${percent}% số key được giao`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={percent} className="pm-bar" role="progressbar">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </>
  )
}
