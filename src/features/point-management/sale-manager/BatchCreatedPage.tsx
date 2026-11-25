import { Link, useParams } from 'react-router-dom'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { managerApi } from '../api/pointApi'
import { managerStatusOf } from '../data/selectors'
import { formatDate, formatDateTime, formatNumber } from '../shared/format'
import { MANAGER_BASE } from '../shared/point-menu'
import { ManagerStatusBadge } from '../shared/StatusBadge'
import { AsyncBlock } from '../shared/AsyncBlock'

const PREVIEW_KEYS = 5

/** Shown right after a batch is created: confirms the batch and previews its first keys. */
export function BatchCreatedPage() {
  const { code = '' } = useParams()
  const batch = useAdminResource(`point-batch:${code}`, (signal) => managerApi.batch(code, signal))
  const preview = useAdminResource(`point-batch-preview:${code}`, (signal) => managerApi.batchKeys(
    code, { page: 0, size: PREVIEW_KEYS }, signal))

  return (
    <AsyncBlock resource={batch} label="Đang tải đợt key">
      {(item) => (
        <>
          <section className="adm-titlebar">
            <div>
              <h1>Đã tạo đợt {item.code}</h1>
              <p>Key đã vào kho. Phân bổ cho sale để họ bắt đầu cấp cho học viên.</p>
            </div>
          </section>

          <section aria-label="Kết quả tạo đợt" className="pm-success">
            <div>
              <h2>✓ Đã tạo {formatNumber(item.quantity)} key {item.productName}</h2>
              <p>Đợt {item.code} · {item.label} · {item.expiresOn ? `hạn dùng ${formatDate(item.expiresOn)}` : 'không giới hạn hạn dùng'} · lúc {formatDateTime(item.createdAt)}</p>
            </div>
            <Link className="adm-btn adm-btn--primary" to={`${MANAGER_BASE}/batches/${item.code}?allocate=1`}>Phân bổ cho sale</Link>
          </section>

          <section aria-label="Các key đầu của đợt" className="adm-card">
            <h2>{PREVIEW_KEYS} key đầu của đợt</h2>
            <AsyncBlock resource={preview} label="Đang tải key">
              {(page) => (
                <div className="adm-table-wrap">
                  <table className="adm-table pm-table">
                    <thead>
                      <tr><th scope="col">Mã key</th><th scope="col">Sản phẩm</th><th scope="col">Trạng thái</th><th scope="col">Hạn dùng</th></tr>
                    </thead>
                    <tbody>
                      {page.items.map((key) => (
                        <tr key={key.id}>
                          <td className="pm-code">{key.maskedCode}</td>
                          <td>{key.productName}</td>
                          <td><ManagerStatusBadge status={managerStatusOf(key)} /></td>
                          <td>{formatDate(key.expiresAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AsyncBlock>
          </section>

          {item.pool > 0 ? (
            <div className="pm-alert" role="status">
              <p>Đợt này còn <strong>{formatNumber(item.pool)} key</strong> chưa phân bổ cho sale. Chúng đang nằm trong kho chung của Quản lý.</p>
            </div>
          ) : null}
        </>
      )}
    </AsyncBlock>
  )
}
