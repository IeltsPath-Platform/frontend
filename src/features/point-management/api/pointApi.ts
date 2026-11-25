import { apiDownload, apiRequest } from '@/lib/httpClient'
import type {
  ActionDto, BatchDto, IssuedKeyDto, KeyDto, KeyProductDto, KeyState, OverviewDto, PageDto, Product, SaleDto, StockDto,
} from '../data/types'
import { productFromCatalog } from '../data/selectors'

const MANAGER = '/api/access/manager'
const SALE = '/api/access/sale'

export interface KeyListQuery {
  state?: KeyState
  saleId?: string
  pool?: boolean
  q?: string
  page: number
  size: number
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== false) search.set(name, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

/** The shared request options: a fresh Idempotency-Key for each deliberate press, so a retry reuses the one already sent. */
function withKey(idempotencyKey: string) {
  return { headers: { 'Idempotency-Key': idempotencyKey } }
}

/** Sale products and manager products share one catalogue. Inactive products are left out of every picker. */
export async function loadProducts(signal?: AbortSignal): Promise<Product[]> {
  const catalog = await apiRequest<KeyProductDto[]>('/api/access/key-products', { auth: true, signal })
  return catalog.filter((item) => item.status === 'ACTIVE').map(productFromCatalog)
}

export const managerApi = {
  overview(month: string | undefined, signal?: AbortSignal) {
    return apiRequest<OverviewDto>(`${MANAGER}/overview${query({ month })}`, { auth: true, signal })
  },
  listBatches(params: { productId?: string; month?: string; page: number; size: number }, signal?: AbortSignal) {
    return apiRequest<PageDto<BatchDto>>(`${MANAGER}/batches${query(params)}`, { auth: true, signal })
  },
  batch(code: string, signal?: AbortSignal) {
    return apiRequest<BatchDto>(`${MANAGER}/batches/${encodeURIComponent(code)}`, { auth: true, signal })
  },
  batchKeys(code: string, params: KeyListQuery, signal?: AbortSignal) {
    return apiRequest<PageDto<KeyDto>>(`${MANAGER}/batches/${encodeURIComponent(code)}/keys${query({
      state: params.state, saleId: params.saleId, pool: params.pool, q: params.q, page: params.page, size: params.size,
    })}`, { auth: true, signal })
  },
  createBatch(input: { productId: string; quantity: number; expiresOn: string | null; label?: string }) {
    return apiRequest<BatchDto>(`${MANAGER}/batches`, { method: 'POST', auth: true, body: input })
  },
  allocate(code: string, allocations: { saleId: string; quantity: number }[]) {
    return apiRequest<void>(`${MANAGER}/batches/${encodeURIComponent(code)}/allocations`, {
      method: 'POST', auth: true, body: { allocations },
    })
  },
  revokeUnused(code: string, note?: string) {
    return apiRequest<ActionDto>(`${MANAGER}/batches/${encodeURIComponent(code)}/revoke-unused`, {
      method: 'POST', auth: true, body: { note },
    })
  },
  reassign(keyIds: string[], toSaleId: string) {
    return apiRequest<ActionDto>(`${MANAGER}/keys/reassign`, { method: 'POST', auth: true, body: { keyIds, toSaleId } })
  },
  withdraw(keyIds: string[]) {
    return apiRequest<ActionDto>(`${MANAGER}/keys/withdraw`, { method: 'POST', auth: true, body: { keyIds } })
  },
  revoke(keyIds: string[], note?: string) {
    return apiRequest<ActionDto>(`${MANAGER}/keys/revoke`, { method: 'POST', auth: true, body: { keyIds, note } })
  },
  reveal(keyId: string) {
    return apiRequest<{ code: string }>(`${MANAGER}/keys/${keyId}/reveal`, { method: 'POST', auth: true })
  },
  issueDirect(productId: string, idempotencyKey: string) {
    return apiRequest<IssuedKeyDto>(`${MANAGER}/issue`, { method: 'POST', auth: true, body: { productId }, ...withKey(idempotencyKey) })
  },
  sales(signal?: AbortSignal) {
    return apiRequest<SaleDto[]>(`${MANAGER}/sales`, { auth: true, signal })
  },
  /** The batch as a CSV with full codes; the server writes the audit row. */
  exportBatch(code: string) {
    return apiDownload(`${MANAGER}/batches/${encodeURIComponent(code)}/export`, { accept: 'text/csv' })
  },
}

export const saleApi = {
  stock(signal?: AbortSignal) {
    return apiRequest<StockDto>(`${SALE}/stock`, { auth: true, signal })
  },
  issue(productId: string, idempotencyKey: string) {
    return apiRequest<IssuedKeyDto>(`${SALE}/issue`, { method: 'POST', auth: true, body: { productId }, ...withKey(idempotencyKey) })
  },
  issued(params: { productId?: string; state?: KeyState; q?: string; page: number; size: number }, signal?: AbortSignal) {
    return apiRequest<PageDto<KeyDto>>(`${SALE}/issued${query(params)}`, { auth: true, signal })
  },
  reveal(keyId: string) {
    return apiRequest<{ code: string }>(`${SALE}/keys/${keyId}/reveal`, { method: 'POST', auth: true })
  },
}
