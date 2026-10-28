import type { Product } from '../data/types'

/** What one key of this product gives the student, without a leading verb: "100 AI Points". */
export function productGrant(product: Product): string {
  if (product.kind === 'POINTS') return `${product.points ?? 0} AI Points`
  return `${product.premiumDays ?? 0} ngày Premium + ${product.humanGradingCredits ?? 0} lượt chấm bài với giám khảo`
}

/** The sentence under a product on the create form and in the issue dialog. */
export function productBenefit(product: Product): string {
  return product.kind === 'POINTS'
    ? `Mỗi key cộng ${productGrant(product)} để học viên dùng cho AI chấm bài. Không liên quan gói Premium.`
    : `Mỗi key cộng ${productGrant(product)}, mở nội dung Premium. Không cộng AI Points.`
}
