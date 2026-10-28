import { KIND_LABEL } from '../data/selectors'
import type { Product, ProductKind } from '../data/types'
import { formatNumber } from '../shared/format'
import { productGrant } from '../shared/product-text'

const KINDS: readonly ProductKind[] = ['POINTS', 'PREMIUM']

/**
 * One tile per product with how many keys the sale still holds and a button to issue one. The sale picks a product,
 * not a key: the key is taken for them, so there is no list to search.
 */
export function IssuePacks({ products, stock, onIssue }: {
  products: readonly Product[]
  stock: ReadonlyMap<string, number>
  onIssue: (product: Product) => void
}) {
  return (
    <section aria-label="Phát hành key" className="adm-card">
      <h2>Phát hành key</h2>
      <p className="pm-note">Bấm Phát hành key ở gói học viên chọn: hệ thống tự lấy một key của gói đó và hiện mã để bạn sao chép.</p>
      {KINDS.map((kind) => (
        <div key={kind}>
          <p className="pm-group-label">{KIND_LABEL[kind]}</p>
          <div className="pm-packs">
            {products.filter((product) => product.kind === kind).map((product) => {
              const left = stock.get(product.id) ?? 0
              return (
                <div aria-label={product.name} className="pm-pack" key={product.id} role="group">
                  <div>
                    <strong>{product.name}</strong>
                    <small>{productGrant(product)}</small>
                  </div>
                  <p className="pm-pack__stock"><strong>{formatNumber(left)}</strong> key chưa cấp</p>
                  <button className="adm-btn adm-btn--primary" disabled={left === 0} onClick={() => onIssue(product)} type="button">
                    {left === 0 ? 'Hết key' : 'Phát hành key'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
