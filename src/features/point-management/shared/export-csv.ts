import { MANAGER_STATUS_LABEL, managerStatusOf } from '../data/selectors'
import type { KeyRecord, Product, Sale } from '../data/types'
import { formatDate, formatDateTime } from './format'

/** Lets Excel read the file as UTF-8. */
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff)

function cell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** Downloads the batch's keys as a CSV that Excel opens with Vietnamese text intact (UTF-8 with a byte-order mark). */
export function downloadKeysCsv(fileName: string, keys: readonly KeyRecord[], products: readonly Product[], sales: readonly Sale[]): void {
  const header = ['Mã key', 'Sản phẩm', 'Trạng thái', 'Sale', 'Cấp lúc', 'Kích hoạt lúc', 'Hạn dùng']
  const lines = keys.map((key) => [
    key.code,
    products.find((product) => product.id === key.productId)?.name ?? key.productId,
    MANAGER_STATUS_LABEL[managerStatusOf(key)],
    sales.find((sale) => sale.id === key.saleId)?.name ?? '',
    key.issuedAt ? formatDateTime(key.issuedAt) : '',
    key.activatedAt ? formatDateTime(key.activatedAt) : '',
    key.expiresAt ? formatDate(key.expiresAt) : '',
  ])
  const text = [header, ...lines].map((line) => line.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([BYTE_ORDER_MARK, text], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
