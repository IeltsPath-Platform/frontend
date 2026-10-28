import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { batchCountsByCode, managerStatusOf } from '../data/selectors'
import { usePointState } from '../data/store'
import { formatDate, formatDateTime, formatNumber, maskCode } from '../shared/format'
import { MANAGER_BASE } from '../shared/point-menu'
import { ManagerStatusBadge } from '../shared/StatusBadge'

const PREVIEW_KEYS = 5

/** Shown right after a batch is created: confirms the batch and previews its first keys. */
export function BatchCreatedPage() {
  const { code } = useParams()
  const { batches, keys, products } = usePointState()
  const batch = batches.find((item) => item.code === code)
  const batchKeys = useMemo(
    () => keys.filter((key) => key.batch === code).sort((a, b) => a.seq - b.seq),
    [keys, code],
  )
  const counts = useMemo(() => batchCountsByCode(batchKeys).get(code ?? ''), [batchKeys, code])

  if (!batch || !counts) {
    return (
      <section className="adm-content">
        <div className="adm-state"><p>Không tìm thấy đợt key này.</p><Link className="adm-btn" to={`${MANAGER_BASE}/batches`}>Về danh sách đợt</Link></div>
      </section>
    )
  }

  const productName = products.find((item) => item.id === batch.productId)?.name ?? batch.productId
  const expiry = batch.expiresAt ? `hạn dùng ${formatDate(batch.expiresAt)}` : 'không giới hạn hạn dùng'

  return (
    <>
      <section className="adm-titlebar">
        <div>
          <h1>Đã tạo đợt {batch.code}</h1>
          <p>Key đã vào kho. Phân bổ cho sale để họ bắt đầu cấp cho học viên.</p>
        </div>
      </section>

      <section aria-label="Kết quả tạo đợt" className="pm-success">
        <div>
          <h2>✓ Đã tạo {formatNumber(batch.quantity)} key {productName}</h2>
          <p>Đợt {batch.code} · {batch.label} · {expiry} · tạo bởi {batch.createdBy} lúc {formatDateTime(batch.createdAt)}</p>
        </div>
        <Link className="adm-btn adm-btn--primary" to={`${MANAGER_BASE}/batches/${batch.code}?allocate=1`}>Phân bổ cho sale</Link>
      </section>

      <section aria-label="Các key đầu của đợt" className="adm-card">
        <h2>{PREVIEW_KEYS} key đầu của đợt</h2>
        <div className="adm-table-wrap">
          <table className="adm-table pm-table">
            <thead>
              <tr><th scope="col">Mã key</th><th scope="col">Sản phẩm</th><th scope="col">Trạng thái</th><th scope="col">Hạn dùng</th></tr>
            </thead>
            <tbody>
              {batchKeys.slice(0, PREVIEW_KEYS).map((key) => (
                <tr key={key.id}>
                  <td className="pm-code">{maskCode(key.code)}</td>
                  <td>{productName}</td>
                  <td><ManagerStatusBadge status={managerStatusOf(key)} /></td>
                  <td>{formatDate(key.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {counts.pool > 0 ? (
        <div className="pm-alert" role="status">
          <p>Đợt này còn <strong>{formatNumber(counts.pool)} key</strong> chưa phân bổ cho sale. Chúng đang nằm trong kho chung của Quản lý.</p>
        </div>
      ) : null}
    </>
  )
}
