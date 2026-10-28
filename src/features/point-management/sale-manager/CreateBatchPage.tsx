import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KIND_LABEL } from '../data/selectors'
import { createBatch, nextBatchCode, usePointState } from '../data/store'
import { formatDate, formatNumber } from '../shared/format'
import { MANAGER_BASE } from '../shared/point-menu'
import { productBenefit, productGrant } from '../shared/product-text'

/** The most keys one batch may hold; the same limit the server enforces. */
const MAX_KEYS = 1000
const QUICK_QUANTITIES = [100, 500, 1000]
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

function parseQuantity(text: string): number {
  return Number(text.replace(/\D/g, ''))
}

/** A batch is usually prepared a month ahead, so the form opens on next month. */
function defaultPeriod(): { month: number; year: number } {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { month: next.getMonth() + 1, year: next.getFullYear() }
}

export function CreateBatchPage() {
  const { products, batches, defaultExpiresAt } = usePointState()
  const navigate = useNavigate()
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [quantityText, setQuantityText] = useState('1.000')
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt)
  const [noExpiry, setNoExpiry] = useState(false)
  const [period, setPeriod] = useState(defaultPeriod)
  const [problems, setProblems] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [checked, setChecked] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const quantity = parseQuantity(quantityText)
  const quantityInvalid = quantity < 1 || quantity > MAX_KEYS
  const product = products.find((item) => item.id === productId)
  const batchCode = nextBatchCode(batches, period.year, period.month)
  const years = [period.year - 1, period.year, period.year + 1]

  const expiryText = noExpiry ? 'Không giới hạn' : formatDate(expiresAt || null)

  function review() {
    const found: string[] = []
    if (quantityInvalid) found.push('số lượng ngoài 1–1.000')
    if (!noExpiry && !expiresAt) found.push('chưa chọn hạn dùng')
    setProblems(found)
    if (found.length === 0) {
      setChecked(false)
      setConfirming(true)
    }
  }

  function confirm() {
    setSubmitted(true)
    const batch = createBatch({
      productId, quantity, expiresAt: noExpiry ? null : expiresAt, year: period.year, month: period.month,
    })
    navigate(`${MANAGER_BASE}/batches/${batch.code}/created`)
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

      {problems.length > 0 ? (
        <div className="pm-alert" role="alert">
          <p>
            <strong>Không tạo được đợt key.</strong> Chưa có key nào được tạo, bạn có thể sửa và bấm Tạo lại.
            {' '}Nguyên nhân: {problems.join('; ')}.
          </p>
          <button className="adm-btn adm-btn--primary" onClick={review} type="button">Tạo lại</button>
        </div>
      ) : null}

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
            <h2><span className="pm-step__no">2</span>Số lượng key</h2>
            <div className="pm-inline">
              <input
                aria-label="Số lượng key"
                aria-invalid={problems.length > 0 && quantityInvalid}
                className={`adm-input pm-wide${problems.length > 0 && quantityInvalid ? ' pm-input-warn' : ''}`}
                inputMode="numeric"
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
            <p className="pm-note">Tối đa 1.000 key mỗi lần tạo. Cần nhiều hơn thì tạo thêm một đợt nữa.</p>
          </div>

          <div className="pm-step">
            <h2><span className="pm-step__no">3</span>Hạn dùng của key</h2>
            <div className="pm-inline">
              <input aria-label="Hạn dùng của key" className="adm-input pm-wide" disabled={noExpiry} onChange={(event) => setExpiresAt(event.target.value)} type="date" value={expiresAt} />
              <label className="adm-check">
                <input checked={noExpiry} onChange={(event) => setNoExpiry(event.target.checked)} type="checkbox" />
                Không giới hạn hạn dùng
              </label>
            </div>
            <p className="pm-note">Key quá hạn không kích hoạt được. Hạn tính theo ngày tạo đợt, không tính từ lúc cấp cho học viên.</p>
          </div>

          <div className="pm-step">
            <h2><span className="pm-step__no">4</span>Đợt (tháng / năm)</h2>
            <div className="pm-inline">
              <select aria-label="Tháng" className="adm-select" onChange={(event) => setPeriod({ ...period, month: Number(event.target.value) })} value={period.month}>
                {MONTHS.map((month) => <option key={month} value={month}>Tháng {month}</option>)}
              </select>
              <select aria-label="Năm" className="adm-select" onChange={(event) => setPeriod({ ...period, year: Number(event.target.value) })} value={period.year}>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
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
            <div><dt>Mã đợt</dt><dd>{batchCode} (tự sinh)</dd></div>
          </dl>
          <p className="pm-infobox">
            {product ? productBenefit(product) : ''} Tạo xong không sửa được; chỉ thu hồi từng key chưa kích hoạt.
          </p>
        </aside>
      </div>

      <div className="pm-rules">
        <strong>Quy tắc:</strong> 1–1.000 key mỗi lần (giới hạn hiện có của hệ thống) · tạo trong một giao dịch: lỗi thì không có key nào ·
        bấm Tạo có hộp xác nhận và chỉ gửi một lần để tránh tạo trùng.
      </div>

      <Dialog onOpenChange={(open) => { if (!submitted) setConfirming(open) }} open={confirming}>
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
              <div><dt>Phân bổ</dt><dd>Chưa phân bổ</dd></div>
            </dl>
            <label className="pm-check">
              <input checked={checked} onChange={(event) => setChecked(event.target.checked)} type="checkbox" />
              Tôi đã kiểm tra sản phẩm, số lượng và hạn dùng
            </label>
            <div className="pm-dialog__actions">
              <button className="adm-btn" onClick={() => setConfirming(false)} type="button">Quay lại sửa</button>
              <button className="adm-btn adm-btn--primary" disabled={!checked || submitted} onClick={confirm} type="button">
                Tạo {formatNumber(quantity)} key
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
