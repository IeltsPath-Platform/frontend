import { useId } from 'react'
import { KIND_LABEL } from '../data/selectors'
import type { Product, ProductKind } from '../data/types'

const KINDS: readonly ProductKind[] = ['POINTS', 'PREMIUM']

/** Picks one product, with AI Points and Premium as two groups. A list is shown for one product at a time. */
export function ProductPicker({ products, value, onChange }: {
  products: readonly Product[]
  value: string
  onChange: (productId: string) => void
}) {
  const id = useId()
  return (
    <div className="pm-filterbar">
      <label htmlFor={id}>Sản phẩm</label>
      <select className="adm-select" id={id} onChange={(event) => onChange(event.target.value)} value={value}>
        {KINDS.map((kind) => (
          <optgroup key={kind} label={KIND_LABEL[kind]}>
            {products.filter((product) => product.kind === kind).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
