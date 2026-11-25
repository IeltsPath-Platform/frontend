import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KIND_LABEL } from '../data/selectors'
import { loadProducts, managerApi } from '../api/pointApi'
import { formatDate, formatNumber } from '../shared/format'
import { MANAGER_BASE } from '../shared/point-menu'
import { productBenefit, productGrant } from '../shared/product-text'
import { AsyncBlock } from '../shared/AsyncBlock'

/** The most keys one batch may hold; the same limit the server enforces. */
const MAX_KEYS = 1000
const QUICK_QUANTITIES = [100, 500, 1000]
/** Keys made without a chosen date expire this many days from today, unless the box below is ticked. */
const DEFAULT_EXPIRY_DAYS = 90

/** The number of keys must be 1 to the limit; the expiry date is needed unless the keys never expire. */
function batchSchema(noExpiry: boolean) {
  return z.object({
    quantity: z.string({ error: 'Số lượng key không được để trống.' }).refine((value) => value.trim() !== '', 'Số lượng key không được để trống.')
      .refine((value) => value.trim() === '' || (parseQuantity(value) >= 1 && parseQuantity(value) <= MAX_KEYS), `Số lượng key phải từ 1 đến ${formatNumber(MAX_KEYS)}.`),
    expiresAt: noExpiry ? z.string() : z.string({ error: 'Hạn dùng của key không được để trống.' }).min(1, 'Hạn dùng của key không được để trống.'),
  })
}

function parseQuantity(text: string): number {
  return Number(text.replace(/\D/g, ''))
}

function defaultExpiry(): string {
  const date = new Date()
  date.setDate(date.getDate() + DEFAULT_EXPIRY_DAYS)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function CreateBatchPage() {
  const products = useAdminResource('point-products', (signal) => loadProducts(signal))
  return (
    <AsyncBlock resource={products} label="Đang tải sản phẩm">
      {(list) => <CreateBatchForm products={list} />}
    </AsyncBlock>
  )
}

function CreateBatchForm({ products }: { products: Awaited<ReturnType<typeof loadProducts>> }) {
  const navigate = useNavigate()
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [quantityText, setQuantityText] = useState('1.000')
  const [expiresAt, setExpiresAt] = useState(defaultExpiry)
  const [noExpiry, setNoExpiry] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [checked, setChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const quantity = parseQuantity(quantityText)
  const schema = useMemo(() => batchSchema(noExpiry), [noExpiry])
  const form = useFormErrors(schema, { quantity: quantityText, expiresAt })
  const quantityError = form.field('quantity').error
  const expiryError = form.field('expiresAt').error
  const product = products.find((item) => item.id === productId)
  const expiryText = noExpiry ? 'Không giới hạn' : formatDate(expiresAt || null)

  function review() {
    if (!form.validate()) return
    setChecked(false)
    setSubmitError('')
    setConfirming(true)
  }

  async function confirm() {
    setSubmitting(true)
    setSubmitError('')
    try {
      const batch = await managerApi.createBatch({
        productId, quantity, expiresOn: noExpiry ? null : expiresAt,
      })
      navigate(`${MANAGER_BASE}/batches/${batch.code}/created`)
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Chưa tạo được đợt key. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <section className="adm-titlebar">
        <div>
          <p className="pm-crumb"><Link to={`${MANAGER_BASE}/batches`}>Đợt key</Link> › Tạo đợt mới</p>
          <h1>Tạo đợt key mới</h1>
          <p>Tạo tối đa 1.000 key trong một lần bấm. Tất cả key được tạo cùng lúc, hoặc không có key nào được tạo.</p>
        </div>
      </section>

      <div className="pm-form-grid">
        <section aria-label="Thông tin đợt key" className="adm-content">
          <div className="pm-step">
            <h2><span className="pm-step__no">1</span>Chọn sản phẩm key</h2>
            {(['POINTS', 'PREMIUM'] as const).map((kind) => (
              <div key={kind}>
                <p className="pm-group-label">{KIND_LABEL[kind]}</p>
                <div aria-label={`Sản phẩm ${KIND_LABEL[kind]}`} className="pm-options" role="radiogroup">
                  {products.filter((item) => item.kind === kind).map((item) => (
                    <label className={`pm-option${productId === item.id ? ' is-selected' : ''}`} key={item.id}>
                      <input checked={productId === item.id} name="product" onChange={() => setProductId(item.id)} type="radio" />
                      <span className="pm-option__text">
                        <strong>{item.name}</strong>
                        <small>{productGrant(item)}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pm-step">
            <h2><span className="pm-step__no">2</span>Số lượng key<span aria-hidden="true" className="adm-required" /></h2>
            <div className="pm-inline">
              <input
                aria-label="Số lượng key"
                aria-describedby={quantityError ? 'batch-quantity-error' : undefined}
                aria-invalid={quantityError ? true : undefined}
                aria-required
                className={`adm-input pm-wide${quantityError ? ' pm-input-warn' : ''}`}
                inputMode="numeric"
                onBlur={form.field('quantity').onTouch}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '')
                  setQuantityText(digits ? formatNumber(Number(digits)) : '')
                }}
                value={quantityText}
              />
              {QUICK_QUANTITIES.map((value) => (
                <button
                  className={`pm-quick${quantity === value ? ' is-active' : ''}`}
                  key={value}
                  onClick={() => setQuantityText(formatNumber(value))}
                  type="button"
                >
                  {formatNumber(value)}
                </button>
              ))}
            </div>
            {quantityError ? <p className="adm-field__error" id="batch-quantity-error" role="alert">{quantityError}</p> : null}
          </div>

          <div className="pm-step">
            <h2><span className="pm-step__no">3</span>Hạn dùng của key{noExpiry ? null : <span aria-hidden="true" className="adm-required" />}</h2>
            <div className="pm-inline">
              <input
                aria-describedby={expiryError ? 'batch-expiry-error' : undefined}
                aria-invalid={expiryError ? true : undefined}
                aria-label="Hạn dùng của key"
                aria-required={!noExpiry}
                className="adm-input pm-wide"
                disabled={noExpiry}
                onBlur={form.field('expiresAt').onTouch}
                onChange={(event) => setExpiresAt(event.target.value)}
                type="date"
                value={expiresAt}
              />
              <label className="adm-check">
                <input checked={noExpiry} onChange={(event) => setNoExpiry(event.target.checked)} type="checkbox" />
                Không giới hạn hạn dùng
              </label>
            </div>
            {expiryError ? <p className="adm-field__error" id="batch-expiry-error" role="alert">{expiryError}</p> : null}
          </div>

          <div className="pm-form-actions">
            <Link className="adm-btn" to={`${MANAGER_BASE}/batches`}>Hủy</Link>
            <button className="adm-btn adm-btn--primary" onClick={review} type="button">Xem lại &amp; tạo</button>
          </div>
        </section>

        <aside aria-label="Tóm tắt đợt" className="adm-card pm-summary">
          <h2>Tóm tắt đợt</h2>
          <dl className="pm-dl">
            <div><dt>Sản phẩm</dt><dd>{product?.name ?? '—'}</dd></div>
            <div><dt>Mỗi key cấp</dt><dd>{product ? productGrant(product) : '—'}</dd></div>
            <div><dt>Số key</dt><dd>{quantityText || '—'}</dd></div>
            <div><dt>Hạn dùng</dt><dd>{expiryText}</dd></div>
            <div><dt>Phân bổ</dt><dd>Chưa phân bổ</dd></div>
            <div><dt>Mã đợt</dt><dd>Hệ thống cấp khi tạo</dd></div>
          </dl>
          {product ? <p className="pm-infobox">{productBenefit(product)}</p> : null}
        </aside>
      </div>

      <Dialog onOpenChange={(open) => { if (!submitting) setConfirming(open) }} open={confirming}>
        <DialogContent>
          <div className="adm-theme pm-dialog">
            <DialogHeader>
              <DialogTitle>Tạo {formatNumber(quantity)} key?</DialogTitle>
              <DialogDescription className="adm-sr-only">Kiểm tra lại thông tin trước khi tạo đợt key.</DialogDescription>
            </DialogHeader>
            <dl className="pm-dl">
              <div><dt>Sản phẩm</dt><dd>{product?.name}</dd></div>
              <div><dt>Mỗi key cấp</dt><dd>{product ? productGrant(product) : '—'}</dd></div>
              <div><dt>Số lượng</dt><dd>{formatNumber(quantity)} key</dd></div>
              <div><dt>Hạn dùng</dt><dd>{expiryText}</dd></div>
            </dl>
            <label className="pm-check">
              <input checked={checked} onChange={(event) => setChecked(event.target.checked)} type="checkbox" />
              Tôi đã kiểm tra sản phẩm, số lượng và hạn dùng
            </label>
            {submitError ? <p className="adm-field__error" role="alert">{submitError}</p> : null}
            <div className="pm-dialog__actions">
              <button className="adm-btn" disabled={submitting} onClick={() => setConfirming(false)} type="button">Quay lại sửa</button>
              <button className="adm-btn adm-btn--primary" disabled={!checked || submitting} onClick={() => void confirm()} type="button">
                {submitting ? 'Đang tạo…' : `Tạo ${formatNumber(quantity)} key`}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
