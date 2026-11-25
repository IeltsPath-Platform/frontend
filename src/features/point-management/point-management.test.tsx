import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import type { BatchDto, KeyDto, PageDto, Product, SaleDto, StockDto } from './data/types'
import { PointManagementRoutes } from './routes'

const { session, api } = vi.hoisted(() => ({
  session: vi.fn(),
  api: {
    loadProducts: vi.fn(),
    manager: {
      overview: vi.fn(),
      listBatches: vi.fn(),
      batch: vi.fn(),
      batchKeys: vi.fn(),
      createBatch: vi.fn(),
      allocate: vi.fn(),
      revokeUnused: vi.fn(),
      reassign: vi.fn(),
      withdraw: vi.fn(),
      revoke: vi.fn(),
      reveal: vi.fn(),
      issueDirect: vi.fn(),
      sales: vi.fn(),
      exportBatch: vi.fn(),
    },
    sale: {
      stock: vi.fn(),
      issue: vi.fn(),
      issued: vi.fn(),
      reveal: vi.fn(),
    },
  },
}))

vi.mock('@/features/auth/authSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/authSession')>()),
  useAuthSession: session,
  logoutSession: vi.fn(),
}))

vi.mock('./api/pointApi', () => ({
  loadProducts: api.loadProducts,
  managerApi: api.manager,
  saleApi: api.sale,
}))

const pointsProduct: Product = { id: 'p-100', name: 'Gói 100 AI Points', kind: 'POINTS', points: 100 }

function signedIn(roles: string[]) {
  session.mockReturnValue({ isLoggedIn: true, hydrated: true, roles, userName: 'Tester', points: 0, tier: 'FREE' })
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PointManagementRoutes />} path="/point-management/*" />
        <Route element={<p>Trang đăng nhập</p>} path="/login" />
        <Route element={<p>Trang học viên</p>} path="/overview" />
      </Routes>
    </MemoryRouter>,
  )
}

function emptyPage<T>(): PageDto<T> {
  return { items: [], total: 0, page: 0, size: 20 }
}

function batch(overrides: Partial<BatchDto> = {}): BatchDto {
  return {
    code: 'B-2611-001',
    label: 'Đợt 11/2026',
    productId: pointsProduct.id,
    productName: pointsProduct.name,
    quantity: 10,
    expiresOn: '2027-01-31',
    createdAt: '2026-11-20T03:00:00Z',
    byState: { READY: 6, ISSUED: 2, ACTIVATED: 2, REVOKED: 0, EXPIRED: 0 },
    pool: 4,
    ...overrides,
  }
}

function key(overrides: Partial<KeyDto> = {}): KeyDto {
  return {
    id: 'k-1',
    batchCode: 'B-2611-001',
    seq: 1,
    productId: pointsProduct.id,
    productName: pointsProduct.name,
    maskedCode: 'IP-****-****-ABCD',
    state: 'READY',
    saleId: null,
    issuedAt: null,
    activatedAt: null,
    revokedAt: null,
    expiresAt: null,
    note: null,
    codeStored: true,
    ...overrides,
  }
}

const stock: StockDto = {
  byProduct: [{ key: pointsProduct.id, label: pointsProduct.name, byState: { READY: 2, ISSUED: 0, ACTIVATED: 0, REVOKED: 0, EXPIRED: 0 } }],
  byBatch: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  api.loadProducts.mockResolvedValue([pointsProduct])
  api.manager.overview.mockResolvedValue({ byBatch: [], byProduct: [] })
  api.manager.listBatches.mockResolvedValue(emptyPage<BatchDto>())
  api.manager.sales.mockResolvedValue([] as SaleDto[])
  api.sale.stock.mockResolvedValue(stock)
})

describe('who may open which area', () => {
  it('sends a sale who opens the manager area to the sale screen', async () => {
    signedIn(['SALES_STAFF'])
    renderAt('/point-management/sale-manager/overview')

    expect(await screen.findByRole('heading', { name: 'Phát hành key' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tổng quan kho key' })).not.toBeInTheDocument()
  })

  it('shows the manager overview to the staff manager', async () => {
    signedIn(['STAFF_MANAGER'])
    renderAt('/point-management/sale-manager/overview')

    expect(await screen.findByRole('heading', { name: 'Tổng quan kho key' })).toBeInTheDocument()
  })

  it('sends a learner who opens either area back to the learner home', async () => {
    signedIn(['CUSTOMER'])
    renderAt('/point-management/sale/issue')

    expect(await screen.findByText('Trang học viên')).toBeInTheDocument()
  })
})

describe('sale issuing keys', () => {
  it('issues one key per press and shows its full code once', async () => {
    signedIn(['SALES_STAFF'])
    api.sale.issue.mockResolvedValue({ keyId: 'k-9', code: 'IP-ABCD-2345-WXYZ', batchCode: 'B-2611-001', key: key({ id: 'k-9' }) })
    renderAt('/point-management/sale/issue')

    await userEvent.click(await screen.findByRole('button', { name: 'Phát hành key' }))

    expect(await screen.findByText('IP-ABCD-2345-WXYZ')).toBeInTheDocument()
    expect(api.sale.issue).toHaveBeenCalledTimes(1)
    expect(api.sale.issue.mock.calls[0][0]).toBe(pointsProduct.id)
  })

  it('a second press while the first is waiting sends nothing new', async () => {
    signedIn(['SALES_STAFF'])
    let answer: (value: unknown) => void = () => {}
    api.sale.issue.mockReturnValue(new Promise((resolve) => { answer = resolve }))
    renderAt('/point-management/sale/issue')

    const button = await screen.findByRole('button', { name: 'Phát hành key' })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(api.sale.issue).toHaveBeenCalledTimes(1)
    answer({ keyId: 'k-1', code: 'IP-AAAA-BBBB-CCCC', batchCode: 'B-2611-001', key: key() })
    await screen.findByText('IP-AAAA-BBBB-CCCC')
  })

  it('a retry after a lost connection reuses the same idempotency key', async () => {
    signedIn(['SALES_STAFF'])
    api.sale.issue
      .mockRejectedValueOnce(new HttpError(0, 'Không kết nối được máy chủ.'))
      .mockResolvedValueOnce({ keyId: 'k-2', code: 'IP-DDDD-EEEE-FFFF', batchCode: 'B-2611-001', key: key({ id: 'k-2' }) })
    renderAt('/point-management/sale/issue')

    const button = await screen.findByRole('button', { name: 'Phát hành key' })
    await userEvent.click(button)
    await screen.findByText('Không kết nối được máy chủ.')
    await userEvent.click(button)
    await screen.findByText('IP-DDDD-EEEE-FFFF')

    expect(api.sale.issue).toHaveBeenCalledTimes(2)
    expect(api.sale.issue.mock.calls[1][1]).toBe(api.sale.issue.mock.calls[0][1])
  })

  it('a refused press (no key left) gets a new key next time', async () => {
    signedIn(['SALES_STAFF'])
    api.sale.issue
      .mockRejectedValueOnce(new HttpError(409, 'Hết key của gói này.'))
      .mockResolvedValueOnce({ keyId: 'k-3', code: 'IP-GGGG-HHHH-JJJJ', batchCode: 'B-2611-001', key: key({ id: 'k-3' }) })
    renderAt('/point-management/sale/issue')

    const button = await screen.findByRole('button', { name: 'Phát hành key' })
    await userEvent.click(button)
    await screen.findByText('Hết key của gói này.')
    await userEvent.click(button)
    await screen.findByText('IP-GGGG-HHHH-JJJJ')

    expect(api.sale.issue.mock.calls[1][1]).not.toBe(api.sale.issue.mock.calls[0][1])
  })
})

describe('manager batch detail', () => {
  it('lists the keys with masked codes and keeps revoke disabled until a key is picked', async () => {
    signedIn(['STAFF_MANAGER'])
    api.manager.batch.mockResolvedValue(batch())
    api.manager.batchKeys.mockResolvedValue({ items: [key()], total: 1, page: 0, size: 10 })
    renderAt('/point-management/sale-manager/batches/B-2611-001')

    expect(await screen.findByText('IP-****-****-ABCD')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thu hồi key chưa dùng…' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Thu hồi…' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn key IP-****-****-ABCD' }))
    expect(screen.getByRole('button', { name: 'Thu hồi…' })).toBeEnabled()
  })

  it('reveals a full code only when asked, and then shows it', async () => {
    signedIn(['STAFF_MANAGER'])
    api.manager.batch.mockResolvedValue(batch())
    api.manager.batchKeys.mockResolvedValue({ items: [key()], total: 1, page: 0, size: 10 })
    api.manager.reveal.mockResolvedValue({ code: 'IP-KKKK-LLLL-MMMM' })
    renderAt('/point-management/sale-manager/batches/B-2611-001')

    await userEvent.click(await screen.findByRole('button', { name: 'Xem' }))
    const dialog = await screen.findByRole('dialog')
    expect(api.manager.reveal).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Hiện mã đầy đủ' }))
    expect(await within(dialog).findByText('IP-KKKK-LLLL-MMMM')).toBeInTheDocument()
    expect(api.manager.reveal).toHaveBeenCalledWith('k-1')
  })
})

describe('manager issuing a key directly', () => {
  it('hands out one key from the shared pool and shows its code', async () => {
    signedIn(['STAFF_MANAGER'])
    api.manager.issueDirect.mockResolvedValue({ keyId: 'k-7', code: 'IP-QQQQ-RRRR-SSSS', batchCode: 'B-2611-001', key: key({ id: 'k-7' }) })
    renderAt('/point-management/sale-manager/issue')

    await userEvent.click(await screen.findByRole('button', { name: 'Phát một key' }))

    expect(await screen.findByText('IP-QQQQ-RRRR-SSSS')).toBeInTheDocument()
    expect(api.manager.issueDirect).toHaveBeenCalledTimes(1)
    expect(api.manager.issueDirect.mock.calls[0][0]).toBe(pointsProduct.id)
  })
})

describe('creating a batch', () => {
  it('refuses a quantity above the limit before it sends anything', async () => {
    signedIn(['STAFF_MANAGER'])
    renderAt('/point-management/sale-manager/batches/new')

    const quantity = await screen.findByRole('textbox', { name: 'Số lượng key' })
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '1001')
    await userEvent.click(screen.getByRole('button', { name: 'Xem lại & tạo' }))

    expect(await screen.findByText('Số lượng key phải từ 1 đến 1.000.')).toBeInTheDocument()
    expect(api.manager.createBatch).not.toHaveBeenCalled()
  })

  it('sends the chosen product, quantity and expiry once confirmed', async () => {
    signedIn(['STAFF_MANAGER'])
    api.manager.createBatch.mockResolvedValue(batch({ code: 'B-2611-002' }))
    api.manager.batch.mockResolvedValue(batch({ code: 'B-2611-002' }))
    api.manager.batchKeys.mockResolvedValue({ items: [], total: 0, page: 0, size: 5 })
    renderAt('/point-management/sale-manager/batches/new')

    await userEvent.click(await screen.findByRole('button', { name: 'Xem lại & tạo' }))
    await userEvent.click(await screen.findByRole('checkbox', { name: /Tôi đã kiểm tra/ }))
    await userEvent.click(screen.getByRole('button', { name: /Tạo 1.000 key/ }))

    await waitFor(() => expect(api.manager.createBatch).toHaveBeenCalledTimes(1))
    const sent = api.manager.createBatch.mock.calls[0][0]
    expect(sent).toMatchObject({ productId: pointsProduct.id, quantity: 1000 })
    expect(sent.expiresOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
