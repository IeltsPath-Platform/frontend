import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAdminSearch } from '@/features/admin/adminSearch'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { managerApi, loadProducts } from '../api/pointApi'
import { managerStatusOf, unusedCount } from '../data/selectors'
import type { KeyDto, KeyState } from '../data/types'
import { formatDate, formatDateTime, formatNumber, formatShortDateTime } from '../shared/format'
import { KeyDetailDialog } from '../shared/KeyDetailDialog'
import { Pager } from '../shared/Pager'
import { usePage } from '../shared/paging'
import { MANAGER_BASE } from '../shared/point-menu'
import { ManagerStatusBadge } from '../shared/StatusBadge'
import { AsyncBlock } from '../shared/AsyncBlock'
import { AllocateDialog, ConfirmRevokeDialog, ReassignDialog } from './BatchDialogs'

/**
 * The chips of the key list. Each maps to what the server can filter by; POOL and HELD split READY keys by whether a
 * sale holds them.
 */
type Filter = 'ALL' | 'POOL' | 'HELD' | 'ISSUED' | 'ACTIVATED' | 'REVOKED' | 'EXPIRED'
type DialogName = 'allocate' | 'revoke-selected' | 'revoke-unused' | 'reassign'

const PAGE_SIZE = 10
const FILTER_LABEL: Record<Filter, string> = {
  ALL: 'Tất cả',
  POOL: 'Còn trong kho',
  HELD: 'Sale đang giữ',
  ISSUED: 'Đã cấp, chờ kích hoạt',
  ACTIVATED: 'Đã kích hoạt',
  REVOKED: 'Thu hồi',
  EXPIRED: 'Hết hạn',
}

function filterQuery(filter: Filter): { state?: KeyState; pool?: boolean; held?: boolean } {
  switch (filter) {
    case 'ALL': return {}
    case 'POOL': return { state: 'READY', pool: true }
    case 'HELD': return { state: 'READY', held: true }
    default: return { state: filter }
  }
}

/** Downloads a blob the way a link would: a temporary object URL, clicked once, then released. */
function saveBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function BatchDetailPage() {
  const { code = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { query } = useAdminSearch()
  const batch = useAdminResource(`point-batch:${code}`, (signal) => managerApi.batch(code, signal))
  const sales = useAdminResource('point-sales', (signal) => managerApi.sales(signal))
  const products = useAdminResource('point-products', (signal) => loadProducts(signal))
  const [filter, setFilter] = useState<Filter>('ALL')
  const [selected, setSelected] = useState<ReadonlyMap<string, KeyDto>>(new Map())
  const [dialog, setDialog] = useState<DialogName | null>(() => (searchParams.get('allocate') === '1' ? 'allocate' : null))
  const [detail, setDetail] = useState<KeyDto | null>(null)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const scope = `${filter}|${query}`
  const [pageNumber, setPageNumber] = usePage(scope)
  const keys = useAdminResource(`point-keys:${code}:${scope}:${pageNumber}`, (signal) => managerApi.batchKeys(code, {
    ...filterQuery(filter), q: query.trim() || undefined, page: pageNumber - 1, size: PAGE_SIZE,
  }, signal))

  const saleName = (id: string | null) => (sales.data ?? []).find((sale) => sale.id === id)?.displayName ?? '—'
  const selectedKeys = [...selected.values()]
  const movable = selectedKeys.filter((key) => key.state === 'READY').length
  const revocable = selectedKeys.filter((key) => key.state === 'READY' || key.state === 'ISSUED').length
  const withdrawable = selectedKeys.filter((key) => key.state === 'READY' && key.saleId !== null).length

  function changeFilter(next: Filter) {
    setFilter(next)
    setSelected(new Map())
  }

  function toggle(key: KeyDto) {
    const next = new Map(selected)
    if (next.has(key.id)) next.delete(key.id)
    else next.set(key.id, key)
    setSelected(next)
  }

  function togglePage(rows: readonly KeyDto[]) {
    const everyOn = rows.length > 0 && rows.every((key) => selected.has(key.id))
    const next = new Map(selected)
    for (const key of rows) {
      if (everyOn) next.delete(key.id)
      else next.set(key.id, key)
    }
    setSelected(next)
  }

  /** After an action: what changed, what was left alone, then the batch and its keys read again from the server. */
  function done(message: string) {
    setSelected(new Map())
    setActionError('')
    setNotice(message)
    batch.refresh()
    keys.refresh()
  }

  /** A refused action throws out to its dialog, which shows the server's sentence where the person is looking. */
  async function run(action: () => Promise<string>) {
    done(await action())
    setDialog(null)
  }

  async function exportCsv() {
    setActionError('')
    try {
      saveBlob(`${code}.csv`, await managerApi.exportBatch(code))
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Chưa xuất được file. Vui lòng thử lại.')
    }
  }

  const close = () => setDialog(null)

  return (
    <AsyncBlock resource={batch} label="Đang tải đợt key">
      {(item) => {
        const byState = item.byState
        const unused = unusedCount(byState)
        const counts: Record<Filter, number> = {
          ALL: item.quantity,
          POOL: item.pool,
          HELD: byState.READY - item.pool,
          ISSUED: byState.ISSUED,
          ACTIVATED: byState.ACTIVATED,
          REVOKED: byState.REVOKED,
          EXPIRED: byState.EXPIRED,
        }
        const visibleFilters = (Object.keys(FILTER_LABEL) as Filter[])
          .filter((value) => value === 'ALL' || value === filter || counts[value] > 0)
        const productName = (products.data ?? []).find((product) => product.id === item.productId)?.name ?? item.productName
        const pageCount = Math.max(1, Math.ceil((keys.data?.total ?? 0) / PAGE_SIZE))

        return (
          <>
            <section className="adm-titlebar">
              <div>
                <p className="pm-crumb"><Link to={`${MANAGER_BASE}/batches`}>Đợt key</Link> › {item.code}</p>
                <h1>{item.code} · {item.label}</h1>
                <p>
                  {productName} · {formatNumber(item.quantity)} key · {item.expiresOn ? `hạn ${formatDate(item.expiresOn)}` : 'không giới hạn hạn dùng'}
                  {' '}· tạo lúc {formatDateTime(item.createdAt)}
                </p>
              </div>
              <div className="adm-titlebar__actions">
                <button className="adm-btn adm-btn--primary" onClick={() => setDialog('allocate')} type="button">Phân bổ cho sale</button>
                <button className="adm-btn" onClick={() => void exportCsv()} type="button">Xuất CSV</button>
                <button className="adm-btn" disabled={unused === 0} onClick={() => setDialog('revoke-unused')} type="button">Thu hồi key chưa dùng…</button>
              </div>
            </section>

            {notice ? <p className="pm-alert" role="status">{notice}</p> : null}
            {actionError ? <p className="adm-field__error" role="alert">{actionError}</p> : null}

            <section aria-label="Tình trạng của đợt" className="adm-card">
              <h2>Tình trạng của {formatNumber(item.quantity)} key</h2>
              <ul aria-label="Số key theo trạng thái" className="pm-legend">
                <li><i className="pm-seg--ready" />Còn trong kho: {formatNumber(item.pool)}</li>
                <li><i className="pm-seg--given" />Sale đang giữ hoặc đã cấp: {formatNumber(counts.HELD + byState.ISSUED)}</li>
                <li><i className="pm-seg--activated" />Đã kích hoạt: {formatNumber(byState.ACTIVATED)}</li>
                {byState.REVOKED > 0 ? <li><i className="pm-seg--revoked" />Thu hồi: {formatNumber(byState.REVOKED)}</li> : null}
                {byState.EXPIRED > 0 ? <li><i className="pm-seg--expired" />Hết hạn: {formatNumber(byState.EXPIRED)}</li> : null}
              </ul>
            </section>

            <section aria-label={`Danh sách key (${formatNumber(item.quantity)})`} className="adm-card">
              <div className="pm-chips" role="group" aria-label="Lọc theo trạng thái">
                {visibleFilters.map((value) => (
                  <button
                    aria-pressed={filter === value}
                    className={`pm-chip${filter === value ? ' is-active' : ''}`}
                    key={value}
                    onClick={() => changeFilter(value)}
                    type="button"
                  >
                    {FILTER_LABEL[value]} ({formatNumber(counts[value])})
                  </button>
                ))}
              </div>

              <AsyncBlock resource={keys} label="Đang tải key">
                {(page) => (
                  page.items.length === 0 ? (
                    <div className="adm-state"><p>Không có key nào khớp bộ lọc.</p></div>
                  ) : (
                    <div className="adm-table-wrap">
                      <table className="adm-table pm-table">
                        <thead>
                          <tr>
                            <th className="pm-col-check" scope="col">
                              <input
                                aria-label="Chọn tất cả key trên trang này"
                                checked={page.items.every((key) => selected.has(key.id))}
                                onChange={() => togglePage(page.items)}
                                type="checkbox"
                              />
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
                          {page.items.map((key) => (
                            <tr key={key.id}>
                              <td className="pm-col-check">
                                <input aria-label={`Chọn key ${key.maskedCode}`} checked={selected.has(key.id)} onChange={() => toggle(key)} type="checkbox" />
                              </td>
                              <td className="pm-code">{key.maskedCode}</td>
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
                  )
                )}
              </AsyncBlock>

              {selected.size > 0 ? (
                <div className="pm-bulk" role="status">
                  <span>
                    <strong>{formatNumber(selected.size)} key đã chọn</strong>
                    {selected.size > revocable ? ` · ${formatNumber(selected.size - revocable)} key đã kích hoạt hoặc đã thu hồi sẽ bị bỏ qua khi thu hồi` : ''}
                  </span>
                  <span className="pm-bulk__actions">
                    <button className="adm-btn adm-btn--small" disabled={movable === 0} onClick={() => setDialog('reassign')} type="button">Cân lại sale</button>
                    <button
                      className="adm-btn adm-btn--small"
                      disabled={withdrawable === 0}
                      onClick={() => void run(async () => {
                        const result = await managerApi.withdraw(selectedKeys.filter((key) => key.saleId !== null).map((key) => key.id))
                        return `Đã rút ${formatNumber(result.changed)} key về kho; bỏ qua ${formatNumber(result.skipped)} key đã cấp cho học viên.`
                      }).catch((cause: unknown) => setActionError(cause instanceof Error ? cause.message : 'Chưa rút được key. Vui lòng thử lại.'))}
                      type="button"
                    >
                      Rút về kho
                    </button>
                    <button className="adm-btn adm-btn--small" disabled={revocable === 0} onClick={() => setDialog('revoke-selected')} type="button">Thu hồi…</button>
                    <button className="adm-btn adm-btn--small" onClick={() => setSelected(new Map())} type="button">Bỏ chọn</button>
                  </span>
                </div>
              ) : null}

              {keys.data ? (
                <Pager onPage={setPageNumber} page={pageNumber} pageCount={pageCount} shown={keys.data.items.length} total={keys.data.total} />
              ) : null}
            </section>

            <div className="pm-rules">
              <strong>Quy tắc:</strong> key đã kích hoạt không thu hồi được · mọi lần cân lại, thu hồi hoặc xuất CSV ghi vào nhật ký.
            </div>

            <AllocateDialog batch={item} onClose={close} onDone={(message) => done(message)} open={dialog === 'allocate'} />
            <ConfirmRevokeDialog
              count={dialog === 'revoke-unused' ? unused : revocable}
              onClose={close}
              onConfirm={() => run(async () => {
                if (dialog === 'revoke-unused') {
                  const result = await managerApi.revokeUnused(item.code)
                  return `Đã thu hồi ${formatNumber(result.changed)} key; bỏ qua ${formatNumber(result.skipped)} key đã kích hoạt.`
                }
                const result = await managerApi.revoke(selectedKeys.map((key) => key.id))
                return `Đã thu hồi ${formatNumber(result.changed)} key; bỏ qua ${formatNumber(result.skipped)} key đã kích hoạt hoặc đã thu hồi.`
              })}
              open={dialog === 'revoke-selected' || dialog === 'revoke-unused'}
            />
            <ReassignDialog
              count={movable}
              onClose={close}
              onConfirm={(saleId) => run(async () => {
                const result = await managerApi.reassign(selectedKeys.map((key) => key.id), saleId)
                return `Đã chuyển ${formatNumber(result.changed)} key; bỏ qua ${formatNumber(result.skipped)} key đã cấp cho học viên.`
              })}
              open={dialog === 'reassign'}
            />
            <KeyDetailDialog
              keyRecord={detail}
              onClose={() => setDetail(null)}
              reveal={async (keyId) => (await managerApi.reveal(keyId)).code}
              saleName={detail?.saleId ? saleName(detail.saleId) : null}
            />
          </>
        )
      }}
    </AsyncBlock>
  )
}
