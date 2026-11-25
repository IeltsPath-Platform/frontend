import { Link } from 'react-router-dom'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { managerApi, loadProducts } from '../api/pointApi'
import { MANAGER_CHART_SERIES, batchChartRows, monthOf } from '../data/selectors'
import { formatNumber } from '../shared/format'
import { PeriodFilter } from '../shared/PeriodFilter'
import { MANAGER_BASE } from '../shared/point-menu'
import { StackedBarChart } from '../shared/StackedBarChart'
import { usePeriod } from '../shared/usePeriod'
import { AsyncBlock } from '../shared/AsyncBlock'
import { BatchTable } from './BatchTable'

const RECENT_BATCHES = 4
/** The chart and the batch list read the newest batches of the period; a period above this many batches shows the newest. */
const CHART_BATCHES = 100

/** The manager's overview: the chart of stock by batch, the newest batches and each sale's share of the keys it was given. */
export function OverviewPage() {
  const { period, setPeriod, options } = usePeriod()
  const month = monthOf(period)
  const products = useAdminResource('point-products', (signal) => loadProducts(signal))
  const batches = useAdminResource(`point-batches:${period}`, (signal) => managerApi.listBatches(
    { month, page: 0, size: CHART_BATCHES }, signal))
  const sales = useAdminResource('point-sales', (signal) => managerApi.sales(signal))

  return (
    <>
      <section className="adm-titlebar">
        <div>
          <h1>Tổng quan kho key</h1>
          <p>Theo dõi key đã tạo, đã cấp và đã kích hoạt.</p>
        </div>
        <div className="adm-titlebar__actions">
          <Link className="adm-btn adm-btn--primary" to={`${MANAGER_BASE}/batches/new`}>+ Tạo đợt key mới</Link>
        </div>
      </section>

      <PeriodFilter onChange={setPeriod} options={options} value={period} />

      <AsyncBlock resource={batches} label="Đang tải các đợt key">
        {(page) => (
          <>
            <section className="adm-card">
              <StackedBarChart
                rows={batchChartRows(page.items, products.data ?? [])}
                series={MANAGER_CHART_SERIES}
                title="Key theo từng đợt"
              />
            </section>
            <div className="pm-split">
              <section aria-label="Đợt key" className="adm-card">
                <div className="pm-card-head">
                  <h2>Đợt key</h2>
                  <Link className="pm-link" to={`${MANAGER_BASE}/batches`}>Xem tất cả đợt →</Link>
                </div>
                {page.items.length === 0 ? (
                  <div className="adm-state"><p>Không có đợt nào trong khoảng thời gian này.</p></div>
                ) : (
                  <BatchTable batches={page.items.slice(0, RECENT_BATCHES)} />
                )}
              </section>

              <section aria-label="Theo nhân viên sale" className="adm-card">
                <div className="pm-card-head"><h2>Theo nhân viên sale</h2></div>
                <AsyncBlock resource={sales} label="Đang tải nhân viên sale">
                  {(list) => (
                    <ul className="pm-sales">
                      {list.map((sale) => {
                        const percent = sale.held > 0 ? Math.round((sale.issued / sale.held) * 100) : 0
                        return (
                          <li className="pm-sale" key={sale.id}>
                            <strong>{sale.displayName}{sale.active ? null : ' (đang khóa)'}</strong>
                            <small>Được giao {formatNumber(sale.held)} · Đã cấp {formatNumber(sale.issued)} · Kích hoạt {formatNumber(sale.activated)}</small>
                            <div aria-label={`Đã cấp ${percent}% số key được giao`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={percent} className="pm-bar" role="progressbar">
                              <span style={{ width: `${percent}%` }} />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </AsyncBlock>
              </section>
            </div>
          </>
        )}
      </AsyncBlock>
    </>
  )
}
