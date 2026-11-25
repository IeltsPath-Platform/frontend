import { useState } from 'react'
import { Check, Crown, GraduationCap, KeyRound, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PREMIUM_PRODUCTS } from '@/features/home/pricingData'
import type { ActivationProduct } from '@/features/home/pricingData'

type PremiumProduct = (typeof PREMIUM_PRODUCTS)[number]

/**
 * The Premium plans, as the home page shows them, in a popup so a learner reading a result need not leave it. Choosing a
 * plan hands it to the key dialog: Premium is not paid for here, it is activated with an Activation Key.
 */
export function PremiumPlansDialog({ open, onClose, onChoose }: {
  open: boolean
  onClose: () => void
  onChoose: (product: ActivationProduct) => void
}) {
  const [selected, setSelected] = useState<PremiumProduct['code']>('PREMIUM_90D')
  const chosen: PremiumProduct = PREMIUM_PRODUCTS.find((product) => product.code === selected) ?? PREMIUM_PRODUCTS[1]

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sres-plans">
        <DialogHeader>
          <DialogTitle className="sres-plans__title"><Crown aria-hidden="true" /> Gói Premium</DialogTitle>
          <DialogDescription>Mở khóa nội dung nâng cao và nhận lượt chấm Writing/Speaking trực tiếp từ giáo viên.</DialogDescription>
        </DialogHeader>

        <p className="sres-plans__why"><GraduationCap aria-hidden="true" /> Giáo viên chấm cho nhận xét chi tiết và chính xác hơn điểm AI, kèm góp ý riêng cho bài của bạn.</p>

        <ul className="sres-plans__benefits">
          <li><Check size={18} aria-hidden="true" /><span>Lượt chấm Writing/Speaking trực tiếp từ giáo viên</span></li>
          <li><Check size={18} aria-hidden="true" /><span>Toàn bộ bài học, đề thi và tài liệu nâng cao</span></li>
          <li><Check size={18} aria-hidden="true" /><span>Báo cáo phân tích tiến độ học tập nâng cao</span></li>
          <li className="is-off"><Minus size={18} aria-hidden="true" /><span>Không kèm AI Points; AI chấm vẫn trừ điểm trong Ví Point</span></li>
        </ul>

        <div className="sres-plans__options" role="radiogroup" aria-label="Lựa chọn thời hạn Premium">
          {PREMIUM_PRODUCTS.map((product) => (
            <label key={product.code} className={`sres-plans__option${selected === product.code ? ' is-selected' : ''}`}>
              <input type="radio" name="speaking-premium-product" value={product.code}
                checked={selected === product.code} onChange={() => setSelected(product.code)} />
              <span className="sres-plans__option-head">
                <b>{product.name}</b>
                {product.featured && <em>Phổ biến nhất</em>}
              </span>
              <span className="sres-plans__option-days">{product.premiumDays} ngày Premium</span>
              <span className="sres-plans__option-credits"><strong>{product.humanGradingCredits}</strong> lượt chấm giáo viên</span>
            </label>
          ))}
        </div>

        <Button type="button" className="sres-plans__cta" aria-label={`Kích hoạt bằng Mã Key — ${chosen.name}`} onClick={() => onChoose(chosen)}>
          <KeyRound aria-hidden="true" /> Kích hoạt bằng Mã Key
        </Button>
        <p className="sres-plans__note">Lượt chấm giáo viên thuộc chu kỳ Premium đang hoạt động; khi gói hết hạn, lượt chưa dùng sẽ bị hủy. Không cần thanh toán trực tiếp tại đây: nhập Activation Key được cấp.</p>
      </DialogContent>
    </Dialog>
  )
}
