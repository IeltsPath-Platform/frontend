import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { issueNextKey, nextKeyToIssue, resetPointState } from './data/store'
import { PointManagementRoutes } from './routes'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PointManagementRoutes />} path="/point-management/*" />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => resetPointState())

describe('sale manager screens', () => {
  it('shows the stock figures and per-batch and per-sale rows of the overview', () => {
    renderAt('/point-management/sale-manager/overview')
    // One panel per product kind, each column split into the three stages of a key.
    const chart = within(screen.getByRole('figure', { name: 'Key theo từng đợt' }))
    expect(chart.getByRole('region', { name: 'AI Points' })).toBeInTheDocument()
    expect(chart.getByRole('region', { name: 'Premium' })).toBeInTheDocument()
    expect(chart.getByLabelText('B-2611-001 Gói 100 AI Points, Còn trong kho: 360 key')).toBeInTheDocument()
    expect(chart.getByLabelText('B-2611-001 Gói 100 AI Points, Đã kích hoạt: 412 key')).toBeInTheDocument()
    expect(chart.getByLabelText('B-2610-004 Gói Premium 30 ngày, Đã cấp, chờ kích hoạt: 48 key')).toBeInTheDocument()
    expect(chart.getByLabelText('B-2610-002 Gói Premium 90 ngày, Đã kích hoạt: 48 key')).toBeInTheDocument()

    // Each batch row shows its size, then one bar split into the same three stages as the chart.
    const row = within(screen.getByRole('region', { name: 'Đợt key' })).getByRole('row', { name: /B-2611-001/ })
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(
      ['B-2611-001', 'Gói 100 AI Points', '1.000', '', '31/01/2027', 'Xem đợt'],
    )
    expect(within(row).getByRole('img', { name: 'Còn trong kho 360, Đã cấp, chờ kích hoạt 228, Đã kích hoạt 412' })).toBeInTheDocument()
    expect(screen.getByText('Được giao 450 · Đã cấp 352 · Kích hoạt 264')).toBeInTheDocument()
  })

  it('narrows the whole overview to the chosen month', async () => {
    const user = userEvent.setup()
    renderAt('/point-management/sale-manager/overview')
    const chart = within(screen.getByRole('figure', { name: 'Key theo từng đợt' }))
    expect(chart.getByLabelText(/B-2611-001 .*Còn trong kho: 360 key/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Thời gian'), 'Tháng 9/2026')

    expect(chart.queryByLabelText(/B-2611-001/)).not.toBeInTheDocument()
    expect(chart.getByLabelText(/B-2609-001 .*Còn trong kho: 490 key/)).toBeInTheDocument()
    const batches = within(screen.getByRole('region', { name: 'Đợt key' }))
    expect(batches.queryByRole('row', { name: /B-2611-001/ })).not.toBeInTheDocument()
    expect(batches.getByRole('row', { name: /B-2609-001/ })).toBeInTheDocument()
  })

  it('shows each key state once: counts in the legend, plain filter buttons, none for empty states', () => {
    renderAt('/point-management/sale-manager/batches/B-2611-001')
    const legend = within(screen.getByRole('list', { name: 'Số key theo trạng thái' }))
    expect(legend.getByText('Sẵn sàng: 360')).toBeInTheDocument()
    expect(legend.getByText('Đã cấp: 228')).toBeInTheDocument()
    expect(legend.getByText('Đã kích hoạt: 412')).toBeInTheDocument()
    // A state with no keys is left out of both the legend and the filters.
    expect(screen.queryByText(/Thu hồi: 0/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thu hồi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hết hạn' })).not.toBeInTheDocument()

    const filters = within(screen.getByRole('group', { name: 'Lọc theo trạng thái' }))
    expect(filters.getAllByRole('button').map((button) => button.textContent)).toEqual(['Tất cả', 'Sẵn sàng', 'Đã cấp', 'Đã kích hoạt'])
  })

  it('lists the batches of one product at a time, picked from a dropdown, without a progress column', async () => {
    const user = userEvent.setup()
    renderAt('/point-management/sale-manager/batches')
    const picker = screen.getByLabelText('Sản phẩm')
    const packs: [string, string[]][] = [
      ['Gói 100 AI Points', ['B-2611-001', 'B-2611-002', 'B-2610-001']],
      ['Gói 50 AI Points', ['B-2610-003', 'B-2609-002', 'B-2609-001']],
      ['Gói Premium 30 ngày', ['B-2610-004']],
      ['Gói Premium 90 ngày', ['B-2610-002']],
    ]
    for (const [name, codes] of packs) {
      await user.selectOptions(picker, name)
      // Only the chosen product's table is on screen.
      const region = within(screen.getByRole('region', { name }))
      expect(region.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(codes)
      expect(screen.getAllByRole('region')).toHaveLength(1)
    }
    expect(screen.queryByText('Tiến độ')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Sản phẩm' })).not.toBeInTheDocument()
  })

  it('offers Premium products next to AI Points and says what one key grants', async () => {
    const user = userEvent.setup()
    renderAt('/point-management/sale-manager/batches/new')
    expect(screen.getByRole('radiogroup', { name: 'Sản phẩm AI Points' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Sản phẩm Premium' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Gói Premium 30 ngày/ }))
    const summary = within(screen.getByRole('complementary', { name: 'Tóm tắt đợt' }))
    expect(summary.getByText('30 ngày Premium + 4 lượt chấm bài với giám khảo')).toBeInTheDocument()
    expect(summary.getByText(/Không cộng AI Points/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Gói 50 AI Points/ }))
    expect(summary.getByText('50 AI Points')).toBeInTheDocument()
    expect(summary.getByText(/Không liên quan gói Premium/)).toBeInTheDocument()
  })

  it('rejects a quantity over 1.000 with the retry banner, then creates the batch after confirmation', async () => {
    const user = userEvent.setup()
    renderAt('/point-management/sale-manager/batches/new')
    const quantity = screen.getByLabelText('Số lượng key')

    await user.clear(quantity)
    await user.type(quantity, '1500')
    await user.click(screen.getByRole('button', { name: 'Xem lại & tạo' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Không tạo được đợt key')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.clear(quantity)
    await user.type(quantity, '1000')
    expect(screen.queryByText(/Chia đều cho/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Xem lại & tạo' }))

    const create = screen.getByRole('button', { name: 'Tạo 1.000 key' })
    expect(create).toBeDisabled()
    await user.click(screen.getByLabelText('Tôi đã kiểm tra sản phẩm, số lượng và hạn dùng'))
    await user.click(create)

    expect(await screen.findByRole('heading', { name: /^Đã tạo đợt B-\d{4}-\d{3}$/ })).toBeInTheDocument()
    expect(screen.getByText('5 key đầu của đợt')).toBeInTheDocument()
    expect(screen.getAllByText('Sẵn sàng')).toHaveLength(5)
  })

  it('moves keys from the shared pool to sales when the allocation is saved', async () => {
    const user = userEvent.setup()
    renderAt('/point-management/sale-manager/batches/B-2611-001')
    expect(screen.getByText(/Chưa phân bổ cho sale: 360 key/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Phân bổ cho sale' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/còn/)).toHaveTextContent('360 key')
    await user.click(within(dialog).getByRole('button', { name: 'Chia đều' }))
    expect(within(dialog).getByRole('status')).toHaveTextContent('Đã chọn 360 / 360')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu phân bổ' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/Chưa phân bổ cho sale: 0 key/)).toBeInTheDocument()
  })
})

describe('sale screens', () => {
  const packOf = (name: string) => within(within(screen.getByRole('region', { name: 'Phát hành key' })).getByRole('group', { name }))

  it('shows what the sale can still issue per pack and a chart of their batches', () => {
    renderAt('/point-management/sale/issue')
    // One tile per product with the sale's remaining keys: the sale picks a pack, never a key.
    expect(packOf('Gói 100 AI Points').getByText('83')).toBeInTheDocument()
    expect(packOf('Gói 50 AI Points').getByText('5')).toBeInTheDocument()
    expect(packOf('Gói Premium 30 ngày').getByText('12')).toBeInTheDocument()
    expect(packOf('Gói Premium 90 ngày').getByText('4')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Phát hành key' })).toHaveLength(4)

    const chart = within(screen.getByRole('figure', { name: 'Key của tôi theo từng đợt' }))
    expect(chart.getByLabelText('B-2611-001 Gói 100 AI Points, Chưa cấp: 40 key')).toBeInTheDocument()
    expect(chart.getByLabelText('B-2610-002 Gói Premium 90 ngày, Chờ kích hoạt: 6 key')).toBeInTheDocument()

    // The issued keys have their own screen, one sidebar entry away.
    expect(screen.queryByRole('region', { name: 'Key đã phát hành' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Phát hành key' })).toHaveAttribute('href', '/point-management/sale/issue')
    expect(screen.getByRole('link', { name: 'Key đã phát hành' })).toHaveAttribute('href', '/point-management/sale/issued')
  })

  it('lists the keys already handed to students, most recent first, on their own screen', () => {
    renderAt('/point-management/sale/issued')
    expect(screen.getByRole('heading', { name: 'Key đã phát hành', level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Phát hành key' })).not.toBeInTheDocument()

    const list = within(screen.getByRole('region', { name: 'Key đã phát hành' }))
    // The list opens on the first product (Gói 100 AI Points) and counts only its keys.
    expect(screen.getByLabelText('Sản phẩm')).toHaveValue('POINT_100')
    expect(list.getByRole('heading', { name: 'Gói 100 AI Points' })).toBeInTheDocument()
    expect(list.getByRole('button', { name: 'Tất cả (367)' })).toBeInTheDocument()
    expect(list.getByRole('button', { name: 'Chờ kích hoạt (95)' })).toBeInTheDocument()
    expect(list.getByRole('button', { name: 'Đã kích hoạt (272)' })).toBeInTheDocument()
    expect(list.queryByRole('button', { name: /Chưa cấp/ })).not.toBeInTheDocument()
    expect(list.getByText('Hiển thị 6 / 367 · Trang 1 / 62')).toBeInTheDocument()
    expect(within(list.getAllByRole('row')[1]).getByText('IP-••••-••••-A2XD')).toBeInTheDocument()
    // The list shows keys, not students: no student column, and the issued date stays.
    expect(list.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Mã key', 'Trạng thái', 'Sản phẩm', 'Ngày cấp', 'Thao tác'])
    // A key not yet handed to a student is not in the list, and rows only offer the detail.
    expect(list.queryByText('IP-••••-••••-K7MQ')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cấp cho học viên' })).not.toBeInTheDocument()
  })

  it('shows the issued keys of one pack at a time, picked from a dropdown', async () => {
    const user = userEvent.setup()
    renderAt('/point-management/sale/issued')
    const packs: [string, number, number][] = [
      ['Gói 50 AI Points', 5, 40],
      ['Gói Premium 30 ngày', 8, 20],
      ['Gói Premium 90 ngày', 6, 10],
    ]
    for (const [name, waiting, activated] of packs) {
      await user.selectOptions(screen.getByLabelText('Sản phẩm'), name)
      const list = within(screen.getByRole('region', { name: 'Key đã phát hành' }))
      expect(list.getByRole('heading', { name })).toBeInTheDocument()
      expect(list.getByRole('button', { name: `Tất cả (${waiting + activated})` })).toBeInTheDocument()
      expect(list.getByRole('button', { name: `Chờ kích hoạt (${waiting})` })).toBeInTheDocument()
      expect(list.getByRole('button', { name: `Đã kích hoạt (${activated})` })).toBeInTheDocument()
      // Every row on screen belongs to the chosen pack.
      const products = list.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[2].textContent)
      expect(new Set(products)).toEqual(new Set([name]))
    }
    // There is no "all products" choice: the dropdown only offers the four packs.
    expect(within(screen.getByLabelText('Sản phẩm')).getAllByRole('option').map((option) => option.textContent)).toEqual(
      ['Gói 100 AI Points', 'Gói 50 AI Points', 'Gói Premium 30 ngày', 'Gói Premium 90 ngày'],
    )
  })

  it('opens a key detail without any student information', async () => {
    const user = userEvent.setup()
    renderAt('/point-management/sale/issued')
    const list = within(screen.getByRole('region', { name: 'Key đã phát hành' }))
    await user.click(list.getAllByRole('button', { name: 'Xem chi tiết' })[0])

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Sản phẩm')).toBeInTheDocument()
    expect(dialog.getByText('Cấp lúc')).toBeInTheDocument()
    for (const hidden of ['Học viên', 'Liên hệ', 'Email']) expect(dialog.queryByText(hidden)).not.toBeInTheDocument()
  })

  it('forwards the old my-keys address to the issue screen', () => {
    renderAt('/point-management/sale/my-keys')
    expect(screen.getByRole('heading', { name: 'Phát hành key', level: 1 })).toBeInTheDocument()
  })

  it('issues the next key of the chosen pack in one click and shows the code to copy', async () => {
    const user = userEvent.setup()
    renderAt('/point-management/sale/issue')
    await user.click(packOf('Gói 100 AI Points').getByRole('button', { name: 'Phát hành key' }))

    // No form: the key is taken and its full code is on screen straight away.
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('✓ Đã phát hành key')).toBeInTheDocument()
    expect(dialog.getByText(/^IP-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/)).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Sao chép mã' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/Tên học viên|Zalo/)).not.toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Xong' }))
    expect(packOf('Gói 100 AI Points').getByText('82')).toBeInTheDocument()

    // The new key shows up on the issued screen.
    await user.click(screen.getByRole('link', { name: 'Key đã phát hành' }))
    const list = within(screen.getByRole('region', { name: 'Key đã phát hành' }))
    expect(list.getByRole('button', { name: 'Tất cả (368)' })).toBeInTheDocument()
    expect(list.getByRole('button', { name: 'Chờ kích hoạt (96)' })).toBeInTheDocument()
  })

  it('hands out the key that expires soonest first, and disables a pack with nothing left', () => {
    // B-2610-001 expires on 31/12/2026, before B-2611-001 (31/01/2027) and B-2611-002 (no expiry).
    expect(nextKeyToIssue('ngoc-anh', 'POINT_100')?.batch).toBe('B-2610-001')

    for (let i = 0; i < 4; i += 1) issueNextKey('ngoc-anh', 'PREMIUM_90D')
    expect(nextKeyToIssue('ngoc-anh', 'PREMIUM_90D')).toBeNull()
    renderAt('/point-management/sale/issue')
    expect(packOf('Gói Premium 90 ngày').getByRole('button', { name: 'Hết key' })).toBeDisabled()
  })
})
