import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAdminSearch } from '@/features/admin/adminSearch'
import {
  MANAGER_STATUS_LABEL, batchCountsByCode, keyMatches, managerStatusOf, type ManagerStatus,
} from '../data/selectors'
import { reassignKeys, revokeKeys, revokeUnusedInBatch, usePointState } from '../data/store'
import type { KeyRecord } from '../data/types'
import { downloadKeysCsv } from '../shared/export-csv'
import { formatDate, formatDateTime, formatNumber, formatShortDateTime, maskCode } from '../shared/format'
import { KeyDetailDialog } from '../shared/KeyDetailDialog'
import { Pager } from '../shared/Pager'
import { pageSlice, usePage } from '../shared/paging'
import { MANAGER_BASE } from '../shared/point-menu'
import { ManagerStatusBadge } from '../shared/StatusBadge'
import { AllocateDialog, ConfirmRevokeDialog, ReassignDialog } from './BatchDialogs'

type Filter = 'ALL' | ManagerStatus
type DialogName = 'allocate' | 'revoke-selected' | 'revoke-unused' | 'reassign'

const FILTERS: readonly Filter[] = ['ALL', 'READY', 'GIVEN', 'ACTIVATED', 'REVOKED', 'EXPIRED']
const STATUSES: readonly ManagerStatus[] = ['READY', 'GIVEN', 'ACTIVATED', 'REVOKED', 'EXPIRED']
const PAGE_SIZE = 10
const REVOKE_NOTE = 'Thu hồi bởi Quản lý'

const isUnused = (key: KeyRecord) => key.status === 'READY' || key.status === 'ISSUED'

export function BatchDetailPage() {
  const { code } = useParams()
  const [searchParams] = useSearchParams()
  const { batches, keys, products, sales } = usePointState()
  const { query } = useAdminSearch()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [dialog, setDialog] = useState<DialogName | null>(() => (searchParams.get('allocate') === '1' ? 'allocate' : null))
  const [detail, setDetail] = useState<KeyRecord | null>(null)

  const batch = batches.find((item) => item.code === code)
  const batchKeys = useMemo(() => keys.filter((key) => key.batch === code).sort((a, b) => a.seq - b.seq), [keys, code])
  const counts = useMemo(() => batchCountsByCode(batchKeys).get(code ?? ''), [batchKeys, code])
  const rows = useMemo(
    () => batchKeys.filter((key) => (filter === 'ALL' || managerStatusOf(key) === filter) && keyMatches(key, query)),
    [batchKeys, filter, query],
  )
  const [pageNumber, setPageNumber] = usePage(`${filter}|${query}`)
  const { rows: pageRows, page, pageCount } = pageSlice(rows, pageNumber, PAGE_SIZE)

  if (!batch || !counts) {
    return (
      <section className="adm-content">
        <div className="adm-state"><p>Không tìm thấy đợt key này.</p><Link className="adm-btn" to={`${MANAGER_BASE}/batches`}>Về danh sách đợt</Link></div>
      </section>
    )
  }

  const productName = products.find((item) => item.id === batch.productId)?.name ?? batch.productId
  const saleName = (id: string | null) => sales.find((sale) => sale.id === id)?.name ?? '—'
  const selectedKeys = batchKeys.filter((key) => selected.has(key.id))
  const revocable = selectedKeys.filter(isUnused).length
  const movable = selectedKeys.filter((key) => key.status === 'READY').length
  const unused = batchKeys.filter(isUnused).length
  const allOnPage = pageRows.length > 0 && pageRows.every((key) => selected.has(key.id))
  const close = () => setDialog(null)

  function toggle(id: string) {
    const next = new Set(selected)
    if (!next.delete(id)) next.add(id)
    setSelected(next)
  }

  function togglePage() {
    const next = new Set(selected)
    for (const key of pageRows) {
      if (allOnPage) next.delete(key.id)
      else next.add(key.id)
    }
    setSelected(next)
  }

  // A state with no keys gets no button (the chosen one stays, so the list never loses its active filter).
  const visibleFilters = FILTERS.filter((value) => value === 'ALL' || value === filter || counts.byStatus[value] > 0)

  return (
    <>
      <section className="adm-titlebar">
        <div>
          <p className="pm-crumb"><Link to={`${MANAGER_BASE}/batches`}>Đợt key</Link> › {batch.code}</p>
          <h1>{batch.code} · {batch.label}</h1>
          <p>
            {productName} · {formatNumber(batch.quantity)} key · {batch.expiresAt ? `hạn ${formatDate(batch.expiresAt)}` : 'không giới hạn hạn dùng'}
            {' '}· tạo bởi {batch.createdBy} · {formatDateTime(batch.createdAt)}
          </p>
        </div>
        <div className="adm-titlebar__actions">
          <button className="adm-btn adm-btn--primary" onClick={() => setDialog('allocate')} type="button">Phân bổ cho sale</button>
          <button className="adm-btn" onClick={() => downloadKeysCsv(`${batch.code}.csv`, batchKeys, products, sales)} type="button">Xuất CSV</button>
          <button className="adm-btn" onClick={() => setDialog('revoke-unused')} type="button">Thu hồi key chưa dùng…</button>
        </div>
      </section>

      <section aria-label="Tình trạng của đợt" className="adm-card">
        <h2>Tình trạng của {formatNumber(batch.quantity)} key</h2>
        <div aria-hidden="true" className="pm-stack">
          {STATUSES.map((status) => (
            <span className={`pm-seg--${status.toLowerCase()}`} key={status} style={{ width: `${(counts.byStatus[status] / counts.quantity) * 100}%` }} />
          ))}
        </div>
        <ul aria-label="Số key theo trạng thái" className="pm-legend">
          {STATUSES.filter((status) => counts.byStatus[status] > 0).map((status) => (
            <li key={status}><i className={`pm-seg--${status.toLowerCase()}`} />{MANAGER_STATUS_LABEL[status]}: {formatNumber(counts.byStatus[status])}</li>
          ))}
        </ul>
        <p className="pm-note">Chưa phân bổ cho sale: {formatNumber(counts.pool)} key (trong số “Sẵn sàng”).</p>
      </section>

      <section aria-label={`Danh sách key (${formatNumber(batch.quantity)})`} className="adm-card">
        <div className="pm-chips" role="group" aria-label="Lọc theo trạng thái">
          {visibleFilters.map((value) => (
            <button
              aria-pressed={filter === value}
              className={`pm-chip${filter === value ? ' is-active' : ''}`}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value === 'ALL' ? 'Tất cả' : MANAGER_STATUS_LABEL[value]}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="adm-state"><p>Không có key nào khớp bộ lọc.</p></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table pm-table">
              <thead>
                <tr>
                  <th className="pm-col-check" scope="col">
                    <input aria-label="Chọn tất cả key trên trang này" checked={allOnPage} onChange={togglePage} type="checkbox" />
                  </th>
                  <th scope="col">Mã key</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Sale</th>
                  <th scope="col">Cấp lúc</th>
                  <th scope="col">Kích hoạt lúc</th>
                  <th scope="col"><span className="adm-sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((key) => (
                  <tr key={key.id}>
                    <td className="pm-col-check">
                      <input aria-label={`Chọn key ${maskCode(key.code)}`} checked={selected.has(key.id)} onChange={() => toggle(key.id)} type="checkbox" />
                    </td>
                    <td className="pm-code">{maskCode(key.code)}</td>
                    <td><ManagerStatusBadge status={managerStatusOf(key)} /></td>
                    <td>{saleName(key.saleId)}</td>
                    <td>{formatShortDateTime(key.issuedAt)}</td>
                    <td>{formatShortDateTime(key.activatedAt)}</td>
                    <td className="pm-col-action">
                      <button className="adm-btn adm-btn--small" onClick={() => setDetail(key)} type="button">Xem</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected.size > 0 ? (
          <div className="pm-bulk" role="status">
            <span>
              <strong>{formatNumber(selected.size)} key đã chọn</strong>
              {selected.size > revocable ? ` · ${formatNumber(selected.size - revocable)} key đã kích hoạt hoặc đã thu hồi sẽ bị bỏ qua khi thu hồi` : ''}
            </span>
            <span className="pm-bulk__actions">
              <button className="adm-btn adm-btn--small" disabled={movable === 0} onClick={() => setDialog('reassign')} type="button">Cân lại sale</button>
              <button className="adm-btn adm-btn--small" disabled={revocable === 0} onClick={() => setDialog('revoke-selected')} type="button">Thu hồi…</button>
              <button className="adm-btn adm-btn--small" onClick={() => setSelected(new Set())} type="button">Bỏ chọn</button>
            </span>
          </div>
        ) : null}

        <Pager onPage={setPageNumber} page={page} pageCount={pageCount} shown={pageRows.length} total={rows.length} />
      </section>

      <div className="pm-rules">
        <strong>Quy tắc:</strong> key đã kích hoạt không thu hồi được · mọi lần gán lại, thu hồi hoặc xuất CSV ghi vào Nhật ký.
      </div>

      <AllocateDialog batch={batch} onClose={close} open={dialog === 'allocate'} />
      <ConfirmRevokeDialog
        count={dialog === 'revoke-unused' ? unused : revocable}
        onClose={close}
        onConfirm={() => {
          if (dialog === 'revoke-unused') revokeUnusedInBatch(batch.code, REVOKE_NOTE)
          else revokeKeys([...selected], REVOKE_NOTE)
          setSelected(new Set())
          close()
        }}
        open={dialog === 'revoke-selected' || dialog === 'revoke-unused'}
      />
      <ReassignDialog
        count={movable}
        onClose={close}
        onConfirm={(saleId) => {
          reassignKeys([...selected], saleId)
          setSelected(new Set())
          close()
        }}
        open={dialog === 'reassign'}
      />
      <KeyDetailDialog keyRecord={detail} onClose={() => setDetail(null)} />
    </>
  )
}
