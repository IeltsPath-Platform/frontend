import { Check, Crown, KeyRound, Minus, ShieldCheck, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { isActivePremium } from '../accessApi'
import type { Subscription } from '../accessApi'
import { POINT_PRODUCTS, PREMIUM_PRODUCTS, type ActivationProduct } from '../pricingData'
import '../pricing.css'

interface PricingCardsProps {
  isLoggedIn: boolean
  subscription: Subscription | null
  accessStatus: 'idle' | 'loading' | 'ready' | 'error' | 'unavailable'
  accessError?: string
  onRetryAccess: () => void
  onActivate: (product: ActivationProduct) => void
}

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' })
const DAY_IN_MILLISECONDS = 86_400_000

function getPremiumPeriodText(endsAt: string | null): string {
  if (!endsAt) return 'Không có ngày hết hạn'
  const remainingDays = Math.max(0, Math.ceil((Date.parse(endsAt) - Date.now()) / DAY_IN_MILLISECONDS))
  return `Còn ${remainingDays.toLocaleString('vi-VN')} ngày · hết hạn ${DATE_FORMATTER.format(new Date(endsAt))}`
}

export function PricingCards({
  isLoggedIn,
  subscription,
  accessStatus,
  accessError,
  onRetryAccess,
  onActivate,
}: PricingCardsProps) {
  const hasPremium = isActivePremium(subscription)
  const [selectedPremiumCode, setSelectedPremiumCode] = useState<(typeof PREMIUM_PRODUCTS)[number]['code']>('PREMIUM_90D')
  const [selectedPointCode, setSelectedPointCode] = useState<(typeof POINT_PRODUCTS)[number]['code']>('POINT_100')
  const selectedPremiumProduct = PREMIUM_PRODUCTS.find((product) => product.code === selectedPremiumCode) ?? PREMIUM_PRODUCTS[1]
  const selectedPointProduct = POINT_PRODUCTS.find((product) => product.code === selectedPointCode) ?? POINT_PRODUCTS[1]

  return (
    <>
      {isLoggedIn && (
        <div className={`home-current-access is-${accessStatus}`} role="status" aria-live="polite">
          {accessStatus === 'loading' && <p>Đang tải thông tin gói hiện tại…</p>}
          {accessStatus === 'unavailable' && <p>Phiên đăng nhập hiện tại chưa kết nối với dịch vụ gói và Activation Key.</p>}
          {accessStatus === 'error' && (
            <div>
              <p>{accessError ?? 'Chưa thể tải thông tin gói hiện tại.'}</p>
              <Button type="button" variant="outline" onClick={onRetryAccess}>Thử tải lại</Button>
            </div>
          )}
          {accessStatus === 'ready' && hasPremium && subscription && (
            <div>
              <span className="home-current-badge">Đang sử dụng</span>
              <strong>{subscription.planName}</strong>
              <p>
                {getPremiumPeriodText(subscription.endsAt)}
                {' · '}{subscription.remainingCredits.toLocaleString('vi-VN')} lượt chấm giáo viên còn lại
              </p>
            </div>
          )}
          {accessStatus === 'ready' && !hasPremium && (
            <div><span className="home-current-badge">Đang sử dụng</span><strong>FREE</strong></div>
          )}
        </div>
      )}

      <div className="home-free-baseline">
        <span><ShieldCheck aria-hidden="true" /></span>
        <div><strong>Gói FREE mặc định</strong><p>Miễn phí cho mọi tài khoản đăng ký, gồm bài học và câu hỏi tiêu chuẩn. Không mở khóa nội dung Premium hoặc lượt chấm giáo viên.</p></div>
      </div>

      <div className="home-product-grid">
        <article className="home-price-card home-combined-card home-premium-card is-featured" data-home-reveal aria-labelledby="home-premium-title">
          <header className="home-combined-card-heading">
            <span className="home-combined-icon"><Crown aria-hidden="true" /></span>
            <div>
              <span className="home-plan-tag">PREMIUM ACCESS</span>
              <h3 id="home-premium-title">Gói Premium</h3>
              <p>Mở khóa nội dung nâng cao và nhận lượt chấm Writing/Speaking từ giáo viên.</p>
            </div>
          </header>

          <ul className="home-combined-benefits">
            <li><Check size={18} aria-hidden="true" /><span>Toàn bộ bài học, đề thi và tài liệu nâng cao</span></li>
            <li><Check size={18} aria-hidden="true" /><span>Báo cáo phân tích tiến độ học tập nâng cao</span></li>
            <li className="home-unavailable"><Minus size={18} aria-hidden="true" /><span>Không kèm AI Points; AI Grading vẫn trừ điểm trong Ví Point</span></li>
          </ul>

          <div className="home-product-options" aria-label="Lựa chọn thời hạn Premium">
            {PREMIUM_PRODUCTS.map((product) => (
              <label key={product.code} className={`home-product-option${product.featured ? ' is-recommended' : ''}${selectedPremiumCode === product.code ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="premium-product"
                  value={product.code}
                  checked={selectedPremiumCode === product.code}
                  onChange={() => setSelectedPremiumCode(product.code)}
                />
                <div className="home-product-option-heading">
                  <div>
                    <h4>{product.name}</h4>
                    <code>{product.code}</code>
                  </div>
                  {product.featured && <span className="home-recommended-badge">Phổ biến nhất</span>}
                </div>
                <p><strong>{product.premiumDays} ngày Premium</strong><span>{product.humanGradingCredits} lượt chấm giáo viên</span></p>
              </label>
            ))}
          </div>
          <Button
            type="button"
            className="home-option-button home-card-activation-button"
            aria-label={`Kích hoạt bằng Mã Key — ${selectedPremiumProduct.name}`}
            onClick={() => onActivate(selectedPremiumProduct)}
          >
            <KeyRound aria-hidden="true" />Kích hoạt bằng Mã Key
          </Button>
        </article>

        <article className="home-price-card home-combined-card home-point-card" data-home-reveal aria-labelledby="home-point-title">
          <header className="home-combined-card-heading">
            <span className="home-combined-icon"><Wallet aria-hidden="true" /></span>
            <div>
              <span className="home-plan-tag">AI GRADING POINTS</span>
              <h3 id="home-point-title">Thẻ nạp Point</h3>
              <p>Nạp điểm vào Ví Point để dùng AI chấm tự động, độc lập với FREE hoặc Premium.</p>
            </div>
          </header>

          <ul className="home-combined-benefits">
            <li><Check size={18} aria-hidden="true" /><span>AI Points không hết hạn theo thời gian</span></li>
            <li><Check size={18} aria-hidden="true" /><span>Dùng riêng cho AI Grading</span></li>
            <li className="home-unavailable"><Minus size={18} aria-hidden="true" /><span>Không cấp Premium hoặc lượt chấm giáo viên</span></li>
          </ul>

          <div className="home-product-options" aria-label="Lựa chọn thẻ nạp Point">
            {POINT_PRODUCTS.map((product) => (
              <label key={product.code} className={`home-product-option${selectedPointCode === product.code ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="point-product"
                  value={product.code}
                  checked={selectedPointCode === product.code}
                  onChange={() => setSelectedPointCode(product.code)}
                />
                <div className="home-product-option-heading">
                  <div>
                    <h4>{product.name}</h4>
                    <code>{product.code}</code>
                  </div>
                </div>
                <p><strong>+{product.points} Points</strong><span>Cộng vào Ví Point</span></p>
              </label>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="home-option-button home-card-activation-button"
            aria-label={`Nhập mã Activation Key — ${selectedPointProduct.name}`}
            onClick={() => onActivate(selectedPointProduct)}
          >
            <KeyRound aria-hidden="true" />Nạp Point bằng Mã Key
          </Button>
        </article>
      </div>

      <p className="home-pricing-note">
        Lượt chấm giáo viên thuộc chu kỳ Premium đang hoạt động. Khi gói chuyển sang EXPIRED, mọi lượt chưa dùng của chu kỳ đó sẽ bị hủy. AI Points trong Ví Point không hết hạn theo thời gian.
      </p>
    </>
  )
}
