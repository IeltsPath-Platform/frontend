import { useRef, useState } from 'react'
import { useAdminResource } from '@/features/admin/lib/useAdminResource'
import { HttpError } from '@/lib/httpClient'
import { loadProducts, managerApi } from '../api/pointApi'
import { IssuedKeyDialog, type IssuedCode } from '../sale/IssuedKeyDialog'
import { productGrant } from '../shared/product-text'
import { AsyncBlock } from '../shared/AsyncBlock'

/**
 * The manager hands out one key from the shared pool, for a student who has no sale to ask. Same rules as a sale: one key per
 * press, and a press whose answer was lost is retried with the same request key.
 */
export function IssueDirectPage() {
  const products = useAdminResource('point-products', (signal) => loadProducts(signal))
  const [issued, setIssued] = useState<IssuedCode | null>(null)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const unanswered = useRef<{ productId: string; key: string } | null>(null)

  async function issue(productId: string, productName: string) {
    if (inFlight.current) return
    inFlight.current = true
    setError('')
    const key = unanswered.current?.productId === productId ? unanswered.current.key : crypto.randomUUID()
    unanswered.current = { productId, key }
    try {
      const result = await managerApi.issueDirect(productId, key)
      unanswered.current = null
      setIssued({ code: result.code, productName })
    } catch (cause) {
      const unknown = !(cause instanceof HttpError) || cause.isNetworkError
      if (!unknown) unanswered.current = null
      setError(cause instanceof Error ? cause.message : 'Chưa phát được key. Vui lòng thử lại.')
    } finally {
      inFlight.current = false
    }
  }

  return (
    <>
      <section className="adm-titlebar">
        <div>
          <h1>Phát key trực tiếp</h1>
          <p>Phát một key từ kho chung cho học viên không qua nhân viên sale. Key được ghi nhật ký như khi sale phát.</p>
        </div>
      </section>

      {error ? <p className="adm-field__error" role="alert">{error}</p> : null}

      <AsyncBlock resource={products} label="Đang tải sản phẩm">
        {(list) => (
          <section aria-label="Phát key trực tiếp" className="adm-card">
            <div className="pm-packs">
              {list.map((product) => (
                <div aria-label={product.name} className="pm-pack" key={product.id} role="group">
                  <div>
                    <strong>{product.name}</strong>
                    <small>{productGrant(product)}</small>
                  </div>
                  <button className="adm-btn adm-btn--primary" onClick={() => void issue(product.id, product.name)} type="button">
                    Phát một key
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </AsyncBlock>

      <IssuedKeyDialog issued={issued} onClose={() => setIssued(null)} />
    </>
  )
}
